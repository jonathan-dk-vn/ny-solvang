const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ============================================================
// CẤU HÌNH ĐƯỜNG DẪN
// ============================================================
const INPUT_DIR = path.join(__dirname, "input");
const OUTPUT_DIR = "/Users/jonathan/Documents/code/ny-solvang/public/quintessential-essence/1 Medicin til søer og pattegrise";

// ============================================================
// KPI MỤC TIÊU
// ============================================================
const KPI = {
  FARINGER_UGE: 80,
  LEVENDE_PR_KULD: 20.0,
  LEVENDE_GYLTE_PR_KULD: 18.0,
  DODFODTE_PR_KULD: 1.6,
  STILLBIRTH_RATE_ALERT: 12.0, // % cảnh báo tỷ lệ thai chết lưu
  DODFODTE_GAML_SO: 3, // Ngưỡng cờ "Overvej Udsætning" cho nái >= lứa 6
  UDSAETNING_KULD: 6, // Lứa tối thiểu để cân nhắc loại thải
  TOP_SO_LEVENDE: 22, // Ngưỡng "Nái Sao"
};

// ============================================================
// PHÂN NHÓM TUỔI NÁI (Parity Groups)
// ============================================================
function getParityGroup(kuld) {
  if (kuld === 1) return "Gylte (Kuld 1)";
  if (kuld === 2) return "2. Lægs";
  if (kuld >= 3 && kuld <= 5) return "Prime (Kuld 3-5)";
  return "Gamle søer (Kuld 6+)";
}

// ============================================================
// PHÂN CA LÀM VIỆC (Day/Night Shift)
// ============================================================
function getShift(date) {
  const hour = date.getHours();
  return hour >= 6 && hour < 16 ? "Dagvagt (06-16)" : "Aftenvagt/Nattevagt (16-06)";
}

// ============================================================
// LOGIC KÊ ĐƠN THUỐC
// ============================================================
function getMedicinePatFar(kuld, index) {
  if (index < 2) return "Ingen";
  if (kuld >= 2) return "Bimoxyl LA 0.3ml";
  return "Bimoxyl LA 0.3ml + Neuton 0.3ml";
}
const MEDICIN_SO = "Oxytobel 2ml + Melovem 5ml";

// ============================================================
// HÀM BỔ TRỢ & ĐÁNH GIÁ NÁI (TIẾNG ĐAN MẠCH)
// ============================================================
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4)
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function formatEval(val, goal, isHigherBetter = true) {
  const diff = (val - goal).toFixed(1);
  if (isHigherBetter)
    return val >= goal
      ? `🟢 **${val.toFixed(1)}** (+${diff})`
      : `🔴 **${val.toFixed(1)}** (${diff})`;
  else
    return val <= goal
      ? `🟢 **${val.toFixed(1)}** (${diff})`
      : `🔴 **${val.toFixed(1)}** (+${diff})`;
}

function dd(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function calcStillbirthRate(lev, dod) {
  const total = lev + dod;
  return total > 0 ? (dod / total) * 100 : 0;
}

// Đánh giá cá thể nái chuyên sâu (Danish Output)
function getSowComment(lev, dod, kuld) {
  const total = lev + dod;
  const sbRate = total > 0 ? (dod / total) * 100 : 0;

  // 1. Nhóm Siêu nái
  if (lev >= 22 && dod === 0) return "🌟 Super so (Fremragende)";
  if (lev >= 20 && sbRate <= 5) return "💎 Ekstrem høj ydeevne";

  // 2. Nhóm Nái Hậu bị (Lứa 1)
  if (kuld === 1) {
    if (lev >= 18 && dod <= 1) return "✨ Lovende gylt";
    if (lev < 14) return "😟 Lavtydende gylt";
    if (sbRate > 15) return "⚠️ Gylt: Tjek faringsforløb";
  }

  // 3. Nhóm Nái Prime (Lứa 2-5)
  if (kuld >= 2 && kuld <= 5) {
    if (lev >= 20) return "✅ Topform";
    if (lev < 16) return "📉 Faldende ydeevne";
    if (dod >= 4 || sbRate > 18) return "🚨 Kræver teknisk intervention";
  }

  // 4. Nhóm Nái Già (Lứa 6+)
  if (kuld >= 6) {
    if (lev >= 20 && sbRate < 10) return "👵 Udholdende gammel so";
    if (dod >= 5 || sbRate > 20) return "♻️ Overvej udsætning (Høj dødelighed)";
    if (lev < 15) return "♻️ Overvej udsætning (Lav ydeevne)";
  }

  // 5. Cảnh báo chung đẻ khó
  if (dod >= 4) return "⚠️ Advarsel: Faringsproblemer";

  return "🆗 OK";
}

const DANISH_DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

// ============================================================
// PHÂN TÍCH PARITY (Aldersprofil)
// ============================================================
function buildParityAnalysis(weekData) {
  const groups = {
    "Gylte (Kuld 1)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "2. Lægs": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Prime (Kuld 3-5)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Gamle søer (Kuld 6+)": { f: 0, l: 0, d: 0, udsaetning: [] },
  };

  weekData.forEach((row) => {
    const kuld = parseInt(row["Kuld"]) || 0;
    const lev = parseInt(row["Levendefødte"] || 0);
    const dod = parseInt(row["Dødfødte"] || 0);
    const group = getParityGroup(kuld);

    groups[group].f++;
    groups[group].l += lev;
    groups[group].d += dod;

    if (kuld >= KPI.UDSAETNING_KULD && dod >= KPI.DODFODTE_GAML_SO) {
      groups[group].udsaetning.push(`${row["Sonavn"]} (Kuld: ${kuld}, D: ${dod})`);
    }
  });

  let md = `## 🐷 Aldersprofil / Parity Analyse\n\n`;
  md += `| Gruppe | Faringer | Lev./kuld | Døde/kuld | Stillbirth % | Flagget til Udsætning |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  for (const [group, g] of Object.entries(groups)) {
    if (g.f === 0) continue;
    const avgL = (g.l / g.f).toFixed(1);
    const avgD = (g.d / g.f).toFixed(1);
    const sbRate = calcStillbirthRate(g.l, g.d).toFixed(1);
    const udsStr = g.udsaetning.length > 0 ? `⚠️ ${g.udsaetning.join(", ")}` : "—";
    md += `| **${group}** | ${g.f} | ${avgL} | ${avgD} | ${sbRate}% | ${udsStr} |\n`;
  }

  const g1 = groups["Gylte (Kuld 1)"];
  const g2 = groups["2. Lægs"];
  if (g1.f > 0 && g2.f > 0) {
    const avgL1 = g1.l / g1.f;
    const avgL2 = g2.l / g2.f;
    if (avgL2 < avgL1 - 2) {
      md += `\n> ⚠️ **Second Parity Drop detekteret:** 2. lægs nái har markant lavere overlevelse (${avgL2.toFixed(1)}) end gylte (${avgL1.toFixed(1)}). Undersøg fodring/huld i fravænningsperioden.\n`;
    }
  }

  return md + "\n";
}

// ============================================================
// PHÂN TÍCH CA ĐẺ (Day/Night Shift Analysis)
// ============================================================
function buildShiftAnalysis(weekData) {
  const shifts = {
    "Dagvagt (06-16)": { f: 0, l: 0, d: 0 },
    "Aftenvagt/Nattevagt (16-06)": { f: 0, l: 0, d: 0 },
  };

  weekData.forEach((row) => {
    const shift = getShift(row._realDate);
    shifts[shift].f++;
    shifts[shift].l += parseInt(row["Levendefødte"] || 0);
    shifts[shift].d += parseInt(row["Dødfødte"] || 0);
  });

  let md = `## 🌙 Faringsovervågning: Dag vs. Nat\n\n`;
  md += `| Vagtperiode | Faringer | Lev./kuld | Døde/kuld | Stillbirth % |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  let dagSB = 0, natSB = 0;
  for (const [shift, s] of Object.entries(shifts)) {
    if (s.f === 0) continue;
    const avgL = (s.l / s.f).toFixed(1);
    const avgD = (s.d / s.f).toFixed(1);
    const sbRate = calcStillbirthRate(s.l, s.d).toFixed(1);
    md += `| **${shift}** | ${s.f} | ${avgL} | ${avgD} | ${sbRate}% |\n`;
    if (shift.startsWith("Dag")) dagSB = parseFloat(sbRate);
    else natSB = parseFloat(sbRate);
  }

  if (shifts["Aftenvagt/Nattevagt (16-06)"].f > 0 && shifts["Dagvagt (06-16)"].f > 0) {
    if (natSB > dagSB + 5) {
      md += `\n> 🚨 **Anbefaling Nattevagt:** Stillbirth-raten om natten (${natSB}%) er markant højere end om dagen (${dagSB}%). Overvej at indføre faringsovervågning i aftentimerne.\n`;
    } else {
      md += `\n> ✅ Ingen væsentlig forskel på dag/nat stillbirth-rate. Nuværende vagtsystem fungerer tilfredsstillende.\n`;
    }
  }

  return md + "\n";
}

// ============================================================
// PHÂN TÍCH VỊ TRÍ CHUỒNG (Lokation Heatmap - RÚT GỌN LOKATION)
// ============================================================
function buildLokationHeatmap(weekData) {
  const lokMap = {};

  weekData.forEach((row) => {
    let rawLok = (row["Faringslokation"] || row["Lokation"] || "Ukendt").trim();
    let displayLok = rawLok;
    
    // Thuật toán rút gọn chuỗi Lokation
    if (rawLok.includes("/")) {
      const parts = rawLok.split("/");
      displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
    }

    if (!lokMap[displayLok]) lokMap[displayLok] = { f: 0, l: 0, d: 0 };
    lokMap[displayLok].f++;
    lokMap[displayLok].l += parseInt(row["Levendefødte"] || 0);
    lokMap[displayLok].d += parseInt(row["Dødfødte"] || 0);
  });

  if (Object.keys(lokMap).length <= 1) return "";

  const allAvgL = Object.values(lokMap).reduce((s, v) => s + v.l, 0) /
    Object.values(lokMap).reduce((s, v) => s + v.f, 0);

  const sorted = Object.entries(lokMap).sort((a, b) => {
    const sbA = calcStillbirthRate(a[1].l, a[1].d);
    const sbB = calcStillbirthRate(b[1].l, b[1].d);
    return sbB - sbA;
  });

  let md = `## 🗺️ Lokation Heatmap (Sektioner)\n\n`;
  md += `| Lokation | Faringer | Lev./kuld | Døde/kuld | Stillbirth % | Status |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  sorted.forEach(([lok, g]) => {
    const avgL = (g.l / g.f).toFixed(1);
    const avgD = (g.d / g.f).toFixed(1);
    const sbRate = calcStillbirthRate(g.l, g.d);
    const icon =
      sbRate > KPI.STILLBIRTH_RATE_ALERT
        ? "🔴 Tjek sektion!"
        : parseFloat(avgL) >= allAvgL
        ? "🟢 OK"
        : "🟡 Under gns.";
    md += `| **${lok}** | ${g.f} | ${avgL} | ${avgD} | ${sbRate.toFixed(1)}% | ${icon} |\n`;
  });

  md += `\n> 💡 Tip: Sektioner markeret 🔴 kan have ventilations-, varme- eller fodringsproblemer. Foretag fysisk inspektion.\n\n`;
  return md;
}

// ============================================================
// OBS-SØR MED STILLBIRTH RATE
// ============================================================
function getObsSoer(dayData) {
  const obs = [];
  dayData.forEach((r) => {
    const lev = parseInt(r["Levendefødte"] || 0);
    const dod = parseInt(r["Dødfødte"] || 0);
    const sbRate = calcStillbirthRate(lev, dod);
    const kuld = parseInt(r["Kuld"]) || 0;
    
    let rawLok = r["Faringslokation"] || r["Lokation"] || "";
    let displayLok = rawLok;
    if (rawLok.includes("/")) {
      const parts = rawLok.split("/");
      displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
    }

    const reasons = [];
    if (sbRate > KPI.STILLBIRTH_RATE_ALERT) reasons.push(`Stillbirth ${sbRate.toFixed(0)}%`);
    if (lev <= 10) reasons.push(`Lav overlevelse (${lev})`);
    if (kuld >= KPI.UDSAETNING_KULD && dod >= KPI.DODFODTE_GAML_SO)
      reasons.push(`⚠️ Overvej Udsætning (Kuld ${kuld})`);

    if (reasons.length > 0) {
      obs.push({ so: r["Sonavn"], lev, dod, sbRate, lok: displayLok, kuld, reasons });
    }
  });
  return obs;
}

// ============================================================
// LUỒNG XỬ LÝ CHÍNH
// ============================================================
function main() {
  if (!fs.existsSync(INPUT_DIR)) fs.mkdirSync(INPUT_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(INPUT_DIR);
  const excelFile = files.find((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));

  if (!excelFile) {
    console.error("❌ Không tìm thấy file Excel (.xlsx, .xls) trong folder 'input'.");
    return;
  }

  console.log(`⏳ Đang xử lý file: ${excelFile}...`);
  const inputFilePath = path.join(INPUT_DIR, excelFile);

  const workbook = XLSX.readFile(inputFilePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd hh:mm:ss",
  });

  let headerIndex = rawJson.findIndex(
    (row) => row.includes("Sonavn") && row.includes("Dato")
  );
  if (headerIndex === -1) headerIndex = 0;

  const headers = rawJson[headerIndex];
  let data = [];
  rawJson.slice(headerIndex + 1).forEach((row) => {
    let obj = {};
    let hasData = false;
    headers.forEach((h, i) => {
      if (h && h.trim()) {
        obj[h.trim()] = row[i] !== undefined ? row[i] : "";
        if (row[i]) hasData = true;
      }
    });
    if (hasData) data.push(obj);
  });

  const validData = data.filter((row) => row["Oprettet den"] && row["Sonavn"]);
  let grouped = {};

  validData.forEach((row) => {
    let oprettetDate = new Date(row["Oprettet den"].replace(/-/g, "/"));
    if (isNaN(oprettetDate.getTime()))
      oprettetDate = new Date(row["Oprettet den"]);
    row._realDate = oprettetDate;

    let year = oprettetDate.getFullYear();
    let week = getISOWeek(oprettetDate);
    if (oprettetDate.getMonth() === 11 && week === 1) year++;
    if (oprettetDate.getMonth() === 0 && week >= 52) year--;

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][week]) grouped[year][week] = [];
    grouped[year][week].push(row);
  });

  for (let year in grouped) {
    const yearFolder = path.join(OUTPUT_DIR, year);
    if (!fs.existsSync(yearFolder)) fs.mkdirSync(yearFolder, { recursive: true });

    let summaryMatrix = {};
    let weeksProcessedInYear = [];

    for (let week in grouped[year]) {
      let weekData = grouped[year][week];
      weekData.sort((a, b) => a._realDate - b._realDate);

      if (!summaryMatrix[week]) {
        summaryMatrix[week] = {};
        for (let d = 1; d <= 7; d++)
          summaryMatrix[week][d] = { f: 0, f1: 0, l: 0, d: 0 };
        weeksProcessedInYear.push(week);
      }

      const startDate = weekData[0]._realDate;
      const endDate = weekData[weekData.length - 1]._realDate;
      const startStr = dd(startDate);
      const endStr = dd(endDate);
      const fileName = `Uge ${week} (${startStr} - ${endStr}).md`;

      weekData.forEach((row, index) => {
        row._medicinPat = getMedicinePatFar(parseInt(row["Kuld"]) || 0, index);
        row._medicinSo = MEDICIN_SO;
      });

      let daysGroup = {};
      weekData.forEach((row) => {
        const dStr = dd(row._realDate);
        if (!daysGroup[dStr]) daysGroup[dStr] = [];
        daysGroup[dStr].push(row);
      });

      const sortedDatesAsc = Object.keys(daysGroup).sort((a, b) => {
        const [dA, mA, yA] = a.split(".");
        const [dB, mB, yB] = b.split(".");
        return new Date(`${yA}-${mA}-${dA}`) - new Date(`${yB}-${mB}-${dB}`);
      });

      let accFaringer = 0, accLevende = 0, accDod = 0;
      let accFaringerGylte = 0, accLevendeGylte = 0;

      sortedDatesAsc.forEach((dStr) => {
        const isoDay =
          daysGroup[dStr][0]._realDate.getDay() === 0
            ? 7
            : daysGroup[dStr][0]._realDate.getDay();

        daysGroup[dStr].forEach((r) => {
          const kuld = parseInt(r["Kuld"]) || 0;
          const lev = parseInt(r["Levendefødte"] || 0);
          const dod = parseInt(r["Dødfødte"] || 0);

          accFaringer++;
          accLevende += lev;
          accDod += dod;

          summaryMatrix[week][isoDay].f++;
          summaryMatrix[week][isoDay].l += lev;
          summaryMatrix[week][isoDay].d += dod;

          if (kuld === 1) {
            accFaringerGylte++;
            accLevendeGylte += lev;
            summaryMatrix[week][isoDay].f1++;
          }
        });
      });

      const wGnsLev = accFaringer > 0 ? accLevende / accFaringer : 0;
      const wGnsDod = accFaringer > 0 ? accDod / accFaringer : 0;
      const wGnsGylte = accFaringerGylte > 0 ? accLevendeGylte / accFaringerGylte : 0;
      const wSBRate = calcStillbirthRate(accLevende, accDod);

      let md = `\n# Uge ${week} (${startStr} - ${endStr}) - Farings Manager Enterprise BI\n\n`;

      md += `## 🏆 Ugens Resultat vs KPIs\n`;
      md += `- **Faringer** (Mål: ${KPI.FARINGER_UGE}): **${accFaringer}** ` +
        (accFaringer >= KPI.FARINGER_UGE
          ? `(🟢 Opnået)`
          : `(🔴 Mangler ${KPI.FARINGER_UGE - accFaringer})`) + `\n`;
      md += `- **Levende/kuld** (Mål: ${KPI.LEVENDE_PR_KULD}): ${formatEval(wGnsLev, KPI.LEVENDE_PR_KULD, true)}\n`;
      md += `- **Gylte Levende/kuld** (Mål: ${KPI.LEVENDE_GYLTE_PR_KULD}): ` +
        (accFaringerGylte > 0 ? formatEval(wGnsGylte, KPI.LEVENDE_GYLTE_PR_KULD, true) : "N/A") + `\n`;
      md += `- **Dødfødte/kuld** (Max: ${KPI.DODFODTE_PR_KULD}): ${formatEval(wGnsDod, KPI.DODFODTE_PR_KULD, false)}\n`;
      md += `- **Stillbirth Rate (ugen):** ${wSBRate.toFixed(1)}% ` +
        (wSBRate > KPI.STILLBIRTH_RATE_ALERT ? `🔴 Over grænse (>${KPI.STILLBIRTH_RATE_ALERT}%)` : `🟢 OK`) + `\n`;
      md += `---\n\n`;

      md += buildParityAnalysis(weekData);
      md += buildShiftAnalysis(weekData);
      md += buildLokationHeatmap(weekData);

      // Loop qua từng ngày
      sortedDatesAsc.forEach((dateStr) => {
        const dayData = daysGroup[dateStr];
        dayData.sort((a, b) => a._realDate - b._realDate);
        const dayOfWeekIndex = dayData[0]._realDate.getDay();
        const dayName = DANISH_DAYS[dayOfWeekIndex];

        md += `## 📅 Dato: ${dayName}, ${dateStr}\n\n`;

        const obsSoer = getObsSoer(dayData);
        const topSoer = dayData.filter(
          (r) => parseInt(r["Levendefødte"] || 0) >= KPI.TOP_SO_LEVENDE &&
                 parseInt(r["Dødfødte"] || 0) === 0
        );

        md += `### 🚨 Actionable Insights\n`;

        if (obsSoer.length > 0) {
          md += `- **OBS-Søer (Kræver tjek):**\n`;
          obsSoer.forEach((s) => {
            md += `  - 🔴 **${s.so}** (L:${s.lev}, D:${s.dod}, SB:${s.sbRate.toFixed(0)}%, Lok: ${s.lok}) — _${s.reasons.join(" | ")}_\n`;
          });
        } else {
          md += `- **OBS-Søer:** Ingen kritiske søer i dag. Godt arbejde! ✅\n`;
        }

        if (topSoer.length > 0) {
          md += `- **Stjernesøer (≥${KPI.TOP_SO_LEVENDE} levende, 0 døde):**\n`;
          topSoer.forEach((r) =>
            md += `  - 🌟 **${r["Sonavn"]}** (L:${r["Levendefødte"]}, Kuld: ${r["Kuld"]})\n`
          );
        }
        md += `\n`;

        md += `### 📋 Faringer Detaljer\n`;
        md += `| Nr. | Sonavn | Tid | Kuld | Parity Gruppe | Vagtperiode | Lev. | Døde | SB% | Lokation | Vurdering | Medicin (Pat.) | Medicin (So) |\n`;
        md += `| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;

        dayData.forEach((row, index) => {
          const nr = index + 1;
          const tid = `${String(row._realDate.getHours()).padStart(2, "0")}.${String(row._realDate.getMinutes()).padStart(2, "0")}`;
          const kuld = parseInt(row["Kuld"]) || 0;
          const lev = parseInt(row["Levendefødte"] || 0);
          const dod = parseInt(row["Dødfødte"] || 0);
          const sbRate = calcStillbirthRate(lev, dod).toFixed(1);
          const parityGroup = getParityGroup(kuld);
          const shift = getShift(row._realDate);
          
          let rawLok = row["Faringslokation"] || row["Lokation"] || "";
          let displayLok = rawLok;
          if (rawLok.includes("/")) {
            const parts = rawLok.split("/");
            displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
          }

          const vurdering = getSowComment(lev, dod, kuld);

          md += `| ${nr} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${parityGroup} | ${shift} | ${lev} | ${dod} | ${sbRate}% | ${displayLok} | ${vurdering} | ${row._medicinPat} | ${row._medicinSo} |\n`;
        });

        md += `\n<br><br>\n\n`;
      });

      // ============================================================
      // BẢNG TỔNG HỢP TOÀN TUẦN: SẮP XẾP TỪ TỐT NHẤT ĐẾN KÉM NHẤT
      // ============================================================
      md += `## 📋 Fuld Faringsoversigt for Ugen (Alle dage - Sorteret efter Ydeevne)\n\n`;
      md += `| Rang | Dato | Sonavn | Tid | Kuld | Parity Gruppe | Vagtperiode | Lev. | Døde | SB% | Lokation | Vurdering | Medicin (Pat.) | Medicin (So) |\n`;
      md += `| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;

      // Tạo một bản sao của weekData và sắp xếp nó
      const sortedWeekData = [...weekData].sort((a, b) => {
        const levA = parseInt(a["Levendefødte"] || 0);
        const dodA = parseInt(a["Dødfødte"] || 0);
        const levB = parseInt(b["Levendefødte"] || 0);
        const dodB = parseInt(b["Dødfødte"] || 0);

        // 1. Ưu tiên số con sống (Levendefødte) giảm dần (Cao xếp trước)
        if (levA !== levB) return levB - levA;
        
        // 2. Nếu bằng nhau, ưu tiên số con chết (Dødfødte) tăng dần (Ít chết xếp trước)
        return dodA - dodB;
      });

      sortedWeekData.forEach((row, index) => {
        const rang = index + 1; // Đổi "Nr." thành "Rang" (Thứ hạng)
        const dato = dd(row._realDate); 
        const tid = `${String(row._realDate.getHours()).padStart(2, "0")}.${String(row._realDate.getMinutes()).padStart(2, "0")}`;
        const kuld = parseInt(row["Kuld"]) || 0;
        const lev = parseInt(row["Levendefødte"] || 0);
        const dod = parseInt(row["Dødfødte"] || 0);
        const sbRate = calcStillbirthRate(lev, dod).toFixed(1);
        const parityGroup = getParityGroup(kuld);
        const shift = getShift(row._realDate);
        
        let rawLok = row["Faringslokation"] || row["Lokation"] || "";
        let displayLok = rawLok;
        if (rawLok.includes("/")) {
          const parts = rawLok.split("/");
          displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
        }

        const vurdering = getSowComment(lev, dod, kuld);

        md += `| ${rang} | ${dato} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${parityGroup} | ${shift} | ${lev} | ${dod} | ${sbRate}% | ${displayLok} | ${vurdering} | ${row._medicinPat} | ${row._medicinSo} |\n`;
      });

      md += `\n<br><br>\n\n`;

      fs.writeFileSync(path.join(yearFolder, fileName), "\uFEFF" + md, "utf8");
    }

    if (weeksProcessedInYear.length > 0) {
      let sumMd = `\n# 📊 Ugentlig Faringsoversigt - År ${year} (Enterprise BI)\n\n`;
      sumMd += `> **Celleformat:** **[Faringer]** *(Heraf gylte)* \n`;
      sumMd += `> *Lev: [gns/kuld] — Døde: [gns/kuld] — Stillbirth: [%]*\n\n`;

      sumMd += `| Uge | Mandag | Tirsdag | Onsdag | Torsdag | Fredag | Lørdag | Søndag | Ugetotal |\n`;
      sumMd += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

      let totalSummary = {};
      for (let d = 1; d <= 7; d++)
        totalSummary[d] = { f: 0, f1: 0, l: 0, d: 0, c: 0 };

      weeksProcessedInYear
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((w) => {
          let wRow = `| **Uge ${w}** |`;
          let wTotalF = 0, wTotalF1 = 0, wTotalL = 0, wTotalD = 0;

          for (let day = 1; day <= 7; day++) {
            const { f, f1, l, d } = summaryMatrix[w][day];
            wTotalF += f; wTotalF1 += f1; wTotalL += l; wTotalD += d;

            if (f > 0) {
              totalSummary[day].f += f;
              totalSummary[day].f1 += f1;
              totalSummary[day].l += l;
              totalSummary[day].d += d;
              totalSummary[day].c++;

              const avgL = (l / f).toFixed(1);
              const avgD = (d / f).toFixed(1);
              const sbRate = calcStillbirthRate(l, d).toFixed(1);
              wRow += ` **${f}** *(${f1})*<br>*L:${avgL} D:${avgD}*<br>*SB:${sbRate}%* |`;
            } else {
              wRow += ` — |`;
            }
          }

          const wAvgL = wTotalF > 0 ? (wTotalL / wTotalF).toFixed(1) : 0;
          const wAvgD = wTotalF > 0 ? (wTotalD / wTotalF).toFixed(1) : 0;
          const wSB = calcStillbirthRate(wTotalL, wTotalD).toFixed(1);
          wRow += ` **${wTotalF}** *(${wTotalF1})*<br>*L:${wAvgL} D:${wAvgD}*<br>*SB:${wSB}%* |\n`;
          sumMd += wRow;
        });

      sumMd += `| **Gennemsnit** |`;
      for (let day = 1; day <= 7; day++) {
        const t = totalSummary[day];
        if (t.c > 0) {
          const avgF = (t.f / t.c).toFixed(1);
          const avgF1 = (t.f1 / t.c).toFixed(1);
          const avgL = (t.l / t.f).toFixed(1);
          const avgD = (t.d / t.f).toFixed(1);
          const sbRate = calcStillbirthRate(t.l, t.d).toFixed(1);
          sumMd += ` **~${avgF}** *(~${avgF1})*<br>*L:${avgL} D:${avgD}*<br>*SB:${sbRate}%* |`;
        } else {
          sumMd += ` — |`;
        }
      }

      const summaryFileName = `00 Ugentlig Sammenligning Ekspert ${year}.md`;
      fs.writeFileSync(path.join(yearFolder, summaryFileName), "\uFEFF" + sumMd, "utf8");
    }
  } 

  console.log(`✅ Xử lý hoàn tất! Kiểm tra thư mục 'output'.`);
}

main();