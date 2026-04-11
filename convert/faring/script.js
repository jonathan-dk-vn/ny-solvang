const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ============================================================
// CẤU HÌNH ĐƯỜNG DẪN & BỘ LỌC NĂM
// ============================================================
const INPUT_DIR = path.join(__dirname, "input");
const OUTPUT_DIR =
  "/Users/jonathan/Documents/code/ny-solvang/public/quintessential-essence/1 Medicin til søer og pattegrise";

// Nhập các năm bạn muốn tạo báo cáo.
// Ví dụ: [2026] hoặc [2025, 2026].
// Nếu muốn xuất TẤT CẢ các năm có trong file, hãy để mảng rỗng: []
const TARGET_YEARS = [2026];

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
// PHÂN NHÓM TUỔI NÁI & CA LÀM VIỆC
// ============================================================
function getParityGroup(kuld) {
  if (kuld === 1) return "Gylte (Kuld 1)";
  if (kuld === 2) return "2. Lægs";
  if (kuld >= 3 && kuld <= 5) return "Prime (Kuld 3-5)";
  return "Gamle søer (6+)";
}

function getShift(date) {
  const hour = date.getHours();
  return hour >= 6 && hour < 16 ? "Dag (06-16)" : "Nat (16-06)";
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
// HÀM BỔ TRỢ & TÍNH TOÁN
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

// Hàm format status trả về text gọn gàng cho bảng
function formatStatus(val, goal, isHigherBetter = true) {
  const diff = Math.abs(val - goal).toFixed(1);
  if (isHigherBetter)
    return val >= goal ? `🟢 Nået (+${diff})` : `🔴 Lave (-${diff})`;
  else return val <= goal ? `🟢 Nået (-${diff})` : `🔴 Høje (+${diff})`;
}

function dd(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function calcStillbirthRate(lev, dod) {
  const total = lev + dod;
  return total > 0 ? (dod / total) * 100 : 0;
}

function calcStdDev(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  const variance =
    arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// ============================================================
// HÀM TẠO BIỂU ĐỒ SVG CHUYÊN NGHIỆP (BẢN NÂNG CẤP)
// ============================================================
function generateSvgBarChart(
  historyData,
  valueKey,
  isLowerBetter = false,
  isPercent = false,
  kpiGoal = null,
) {
  if (!historyData || historyData.length === 0) return "";

  // 1. Tính toán giá trị Max, Min, Average bao gồm cả đường Mục tiêu
  const values = historyData.map((h) => h[valueKey]);
  const maxVal = Math.max(...values, kpiGoal !== null ? kpiGoal : -Infinity);
  const minVal = Math.min(...values, kpiGoal !== null ? kpiGoal : Infinity);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  // Padding trên dưới cho biểu đồ
  const range = maxVal - minVal || 1;
  const yMax = maxVal + range * 0.4; // Tăng khoảng trống phía trên cho dễ nhìn chữ
  const yMin = Math.max(0, minVal - range * 0.15);

  // 2. Kích thước SVG
  const svgHeight = 180;
  const barWidth = 36;
  const barSpacing = 20;
  const svgWidth = Math.max(
    historyData.length * (barWidth + barSpacing) + 60,
    400,
  ); // Tối thiểu 400px

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="font-family: system-ui, -apple-system, sans-serif; display: block; overflow: visible;">`;

  // 3. Vẽ đường Mục tiêu KPI (Goal Line - Màu xanh dương)
  if (kpiGoal !== null) {
    const kpiY =
      svgHeight - 30 - ((kpiGoal - yMin) / (yMax - yMin)) * (svgHeight - 60);
    svg += `<line x1="0" y1="${kpiY}" x2="${svgWidth}" y2="${kpiY}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,4" opacity="0.7"></line>`;
    const kpiDisplay = isPercent ? kpiGoal.toFixed(1) + "%" : kpiGoal;
    svg += `<text x="5" y="${kpiY - 6}" font-size="11" fill="#3b82f6" font-weight="600">Mål: ${kpiDisplay}</text>`;
  }

  // 4. Vẽ đường Trung bình (Average Line - Màu xám)
  const avgY =
    svgHeight - 30 - ((avgVal - yMin) / (yMax - yMin)) * (svgHeight - 60);
  svg += `<line x1="0" y1="${avgY}" x2="${svgWidth}" y2="${avgY}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"></line>`;
  const avgDisplay = isPercent ? avgVal.toFixed(1) + "%" : avgVal.toFixed(1);
  // Tránh chữ đè nhau nếu đường Gns và đường Mål quá gần
  const textOffset =
    kpiGoal !== null &&
    Math.abs(
      avgY -
        (svgHeight -
          30 -
          ((kpiGoal - yMin) / (yMax - yMin)) * (svgHeight - 60)),
    ) < 15 &&
    avgVal > kpiGoal
      ? 14
      : -6;
  svg += `<text x="5" y="${avgY + textOffset}" font-size="11" fill="#64748b" font-weight="600">Gns: ${avgDisplay}</text>`;

  // 5. Vẽ các cột dữ liệu
  historyData.forEach((h, idx) => {
    const val = h[valueKey];
    const x = 30 + idx * (barWidth + barSpacing);

    // Tính chiều cao cột
    const normalizedHeight = Math.max(
      2,
      ((val - yMin) / (yMax - yMin)) * (svgHeight - 60),
    );
    const y = svgHeight - 30 - normalizedHeight;

    // Logic màu sắc thông minh: Highlight cột tốt/xấu
    let color = "#cbd5e1"; // Xám nhạt mặc định
    const isGood = isLowerBetter
      ? val <= avgVal - range * 0.1
      : val >= avgVal + range * 0.1;
    const isBad = isLowerBetter
      ? val >= avgVal + range * 0.2
      : val <= avgVal - range * 0.2;

    if (isGood)
      color = "#34d399"; // Xanh lá (Tốt)
    else if (isBad)
      color = "#f87171"; // Đỏ (Báo động)
    else color = "#fbbf24"; // Vàng (Trung bình/Chấp nhận được)

    // Highlight cột hiện tại (cột cuối) đậm hơn để dễ nhận biết
    if (idx === historyData.length - 1) {
      if (isGood) color = "#059669";
      else if (isBad) color = "#dc2626";
      else color = "#d97706";
    }

    const displayVal = isPercent
      ? val.toFixed(1) + "%"
      : Number.isInteger(val)
        ? val
        : val.toFixed(1);

    // Vẽ cột
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${normalizedHeight}" fill="${color}" rx="4"></rect>`;

    // Text giá trị TRÊN ĐỈNH CỘT
    svg += `<text x="${x + barWidth / 2}" y="${y - 8}" font-size="12" fill="#334155" text-anchor="middle" font-weight="bold">${displayVal}</text>`;

    // Text số Tuần ở DƯỚI ĐÁY CỘT
    svg += `<text x="${x + barWidth / 2}" y="${svgHeight - 10}" font-size="12" fill="#64748b" text-anchor="middle">U${h.week}</text>`;
  });

  svg += `</svg>`;

  // Bọc trong div cuộn ngang để tương thích tốt với Mobile
  return `<div style="overflow-x: auto; overflow-y: hidden; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 15px 5px 15px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${svg}</div>`;
}

// Đánh giá cá thể nái chuyên sâu
function getSowComment(lev, dod, kuld) {
  const total = lev + dod;
  const sbRate = total > 0 ? (dod / total) * 100 : 0;

  // Danish benchmark by parity (DanBred/SEGES standard)
  const BENCHMARKS = {
    1: { poor: 11, ok: 13, good: 15, top: 17, elite: 19 },
    2: { poor: 13, ok: 15, good: 17, top: 19, elite: 21 },
    3: { poor: 14, ok: 16, good: 18, top: 20, elite: 22 },
    4: { poor: 14, ok: 16, good: 18, top: 21, elite: 22 },
    5: { poor: 14, ok: 16, good: 18, top: 20, elite: 22 },
    6: { poor: 13, ok: 15, good: 17, top: 19, elite: 21 },
    7: { poor: 12, ok: 14, good: 16, top: 18, elite: 20 }, // 7+ kuld
  };

  const bm = kuld >= 7 ? BENCHMARKS[7] : (BENCHMARKS[kuld] ?? BENCHMARKS[5]);

  // Score litter size vs parity-adjusted benchmark (0–5)
  const levScore =
    lev >= bm.elite
      ? 5
      : lev >= bm.top
        ? 4
        : lev >= bm.good
          ? 3
          : lev >= bm.ok
            ? 2
            : lev >= bm.poor
              ? 1
              : 0;

  // Score stillborn rate — lower is better (0–5)
  const sbScore =
    sbRate < 3
      ? 5
      : sbRate < 6
        ? 4
        : sbRate < 10
          ? 3
          : sbRate < 15
            ? 2
            : sbRate < 20
              ? 1
              : 0;

  // Weighted composite: litter size carries more weight (65/35)
  const score = levScore * 0.65 + sbScore * 0.35;

  // Override: farrowing crisis regardless of score
  if (sbRate > 25 || dod >= 7) return "🚨 Faringsproblem — akut indgriben";

  // Gilt (1st parity) — lower expectations, forward-looking
  if (kuld === 1) {
    if (score >= 4.0) return "🌟 Elite gylt";
    if (score >= 3.0) return "✨ Lovende gylt";
    if (score >= 2.0) return "🆗 Acceptabel gylt";
    if (score >= 1.0) return "⚠️ Svag gylt — opfølgning kuld 2";
    return "❌ Lavtydende gylt — vurdér udsætning";
  }

  // Peak parity (2–5) — highest expectations
  if (kuld >= 2 && kuld <= 5) {
    if (score >= 4.5) return "💎 Eliteso — avlskandidat";
    if (score >= 3.5) return "🏆 Topydelse";
    if (score >= 2.5) return "✅ God ydelse";
    if (score >= 1.5) return "📉 Under benchmark — tjek fodring";
    if (score >= 0.5) return "🚨 Lavtydende — intervention";
    return "♻️ Udsætning (kritisk)";
  }

  // Older sows (6+) — stricter culling threshold
  if (kuld >= 6) {
    if (score >= 3.5) return "👑 Udholdende so — behold";
    if (score >= 2.5) return "🆗 Acceptabel — monitorer";
    if (score >= 1.5) return "⏳ Faldende ydelse — planlæg udsætning";
    return "♻️ Udsætning (prioritet)";
  }

  return "🆗 OK";
}

const DANISH_DAYS = [
  "Søndag",
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
];

// ============================================================
// PHÂN TÍCH CHUYÊN GIA ZOOTEKNISK (ENTERPRISE BI)
// ============================================================
function buildEnterpriseTrendAnalysis(yearData, weeksProcessed) {
  if (weeksProcessed.length < 2) {
    return "> *⏳ Der er ikke nok data endnu til at køre den avancerede AI-trendanalyse (kræver min. 2 uger).*\n\n";
  }

  const sortedWeeks = [...weeksProcessed].sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  let history = [];
  let totalL_year = 0,
    totalD_year = 0,
    totalF_year = 0;

  sortedWeeks.forEach((w) => {
    const weekRows = yearData[w];
    let f = weekRows.length,
      l = 0,
      d = 0;
    let l_kuld1 = 0,
      f_kuld1 = 0,
      l_kuld2 = 0,
      f_kuld2 = 0;
    let f_gammel = 0,
      d_gammel = 0,
      l_gammel = 0;
    let l_dag = 0,
      d_dag = 0,
      l_nat = 0,
      d_nat = 0;
    let levendeArray = [];

    weekRows.forEach((row) => {
      const lev = parseInt(row["Levendefødte"] || 0);
      const dod = parseInt(row["Dødfødte"] || 0);
      const kuld = parseInt(row["Kuld"]) || 0;
      const shift = getShift(row._realDate);

      l += lev;
      d += dod;
      levendeArray.push(lev);

      if (kuld === 1) {
        l_kuld1 += lev;
        f_kuld1++;
      }
      if (kuld === 2) {
        l_kuld2 += lev;
        f_kuld2++;
      }
      if (kuld >= 6) {
        f_gammel++;
        d_gammel += dod;
        l_gammel += lev;
      }

      if (shift.startsWith("Dag")) {
        l_dag += lev;
        d_dag += dod;
      } else {
        l_nat += lev;
        d_nat += dod;
      }
    });

    totalF_year += f;
    totalL_year += l;
    totalD_year += d;

    history.push({
      week: w,
      f,
      l,
      d,
      avgL: f > 0 ? l / f : 0,
      sb: l + d > 0 ? (d / (l + d)) * 100 : 0,
      avgL1: f_kuld1 > 0 ? l_kuld1 / f_kuld1 : null,
      avgL2: f_kuld2 > 0 ? l_kuld2 / f_kuld2 : null,
      pctGammel: f > 0 ? (f_gammel / f) * 100 : 0,
      sbGammel:
        l_gammel + d_gammel > 0 ? (d_gammel / (l_gammel + d_gammel)) * 100 : 0,
      sbDag: l_dag + d_dag > 0 ? (d_dag / (l_dag + d_dag)) * 100 : 0,
      sbNat: l_nat + d_nat > 0 ? (d_nat / (l_nat + d_nat)) * 100 : 0,
      stdDev: calcStdDev(levendeArray),
    });
  });

  const yrAvgL = totalF_year > 0 ? totalL_year / totalF_year : 0;
  const yrSB =
    totalL_year + totalD_year > 0
      ? (totalD_year / (totalL_year + totalD_year)) * 100
      : 0;

  const current = history[history.length - 1];
  const last4 = history.slice(-4);

  // Dựng biểu đồ SVG (Tham số: isLowerBetter, isPercent, KPIGoal)
  const chartF = generateSvgBarChart(
    history,
    "f",
    false,
    false,
    KPI.FARINGER_UGE,
  );
  const chartL = generateSvgBarChart(
    history,
    "avgL",
    false,
    false,
    KPI.LEVENDE_PR_KULD,
  );
  const chartSB = generateSvgBarChart(
    history,
    "sb",
    true,
    true,
    KPI.STILLBIRTH_RATE_ALERT,
  );

  let md = `\n## 🧠 Zooteknisk Ekspertanalyse\n\n`;
  md += `> **OVERBLIK:** AI-drevet analyse af produktionsstabilitet og ydeevne (Hele året - ${history.length} uger).\n\n`;

  // --- 1. SẢN LƯỢNG & NĂNG SUẤT TỔNG QUAN ---
  md += `\n### 1. 📈 Produktionsflow & Ydelse\n\n`;

  md += `**Faringer Trend** (Seneste: **${current.f}** | Mål: ${KPI.FARINGER_UGE})\n`;
  md += `${chartF}\n\n`;

  md += `**Levende Trend** (Seneste: **${current.avgL.toFixed(1)}** | Årsgns: ${yrAvgL.toFixed(1)})\n`;
  md += `${chartL}\n\n`;

  if (current.avgL > yrAvgL + 0.5)
    md += `> 🟢 **Højtydende periode:** Kuldstørrelsen er markant over årsgennemsnittet.\n\n`;
  else if (current.avgL < yrAvgL - 0.5)
    md += `> 🔴 **Opmærksomhed:** Kuldstørrelsen falder. Tjek huldvurdering (BCS) og foderkurver.\n\n`;

  if (current.stdDev > 3.5) {
    md += `> ⚠️ **Høj Spredning:** Standardafvigelsen er høj (${current.stdDev.toFixed(1)} grise/kuld). Indikerer ustabilitet i brunstkontrol eller fodring.\n\n`;
  }

  // --- 2. THEO DÕI THAI LƯU (STILLBIRTH) ---
  md += `\n### 2. 🏥 Faringsovervågning\n\n`;

  md += `**Stillbirth Trend** (Seneste: **${current.sb.toFixed(1)}%** | Årsgns: ${yrSB.toFixed(1)}%)\n`;
  md += `${chartSB}\n\n`;

  if (current.sb > KPI.STILLBIRTH_RATE_ALERT && current.sb > yrSB + 1) {
    md += `> 🚨 **Kritisk:** Stigning i dødfødte. Intensiver faringshjælp og tjek for feber (MMA).\n\n`;
  } else if (current.sb < yrSB - 1) {
    md += `> 🌟 **Fremragende:** Stillbirth-raten falder. Gode overvågningsrutiner!\n\n`;
  }

  const avgDagSB = last4.reduce((s, h) => s + h.sbDag, 0) / last4.length;
  const avgNatSB = last4.reduce((s, h) => s + h.sbNat, 0) / last4.length;
  if (avgNatSB > avgDagSB + 3) {
    md += `> 🌙 **Nattevagt Advarsel:** Stillbirth om natten (${avgNatSB.toFixed(1)}%) er højere end dagen (${avgDagSB.toFixed(1)}%). Tjek natterutiner.\n\n`;
  }

  // --- 3. PHÂN TÍCH CHUYÊN SÂU CẤU TRÚC ĐÀN ---
  md += `\n### 3. 🧬 Cellediagnostik\n\n`;

  let dropCount = 0;
  last4.forEach((h) => {
    if (h.avgL1 !== null && h.avgL2 !== null && h.avgL2 < h.avgL1 - 1.0)
      dropCount++;
  });
  if (dropCount >= 3) {
    md += `> 🚨 **Kronisk 2. Lægs Dyk:** 2. lægs søer underpræsterer markant. Øg foderstyrken for gylte i diegivningsperioden.\n\n`;
  }

  const avgGammelPct =
    last4.reduce((s, h) => s + h.pctGammel, 0) / last4.length;
  const avgGammelSB = last4.reduce((s, h) => s + h.sbGammel, 0) / last4.length;
  if (avgGammelPct > 20 && avgGammelSB > KPI.STILLBIRTH_RATE_ALERT) {
    md += `> ♻️ **Herd Burnout:** Gamle søer udgør ${avgGammelPct.toFixed(0)}% med høj dødelighed (${avgGammelSB.toFixed(1)}%). Øg udsætningsraten.\n\n`;
  }

  md += `---\n\n`;
  return md;
}

// ============================================================
// CÁC HÀM XÂY DỰNG BÁO CÁO NHỎ
// ============================================================
function buildParityAnalysis(weekData) {
  const groups = {
    "Gylte (1)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "2. Lægs": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Prime (3-5)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Gamle (6+)": { f: 0, l: 0, d: 0, udsaetning: [] },
  };

  weekData.forEach((row) => {
    const kuld = parseInt(row["Kuld"]) || 0;
    const lev = parseInt(row["Levendefødte"] || 0);
    const dod = parseInt(row["Dødfødte"] || 0);

    let group = "Gamle (6+)";
    if (kuld === 1) group = "Gylte (1)";
    else if (kuld === 2) group = "2. Lægs";
    else if (kuld >= 3 && kuld <= 5) group = "Prime (3-5)";

    groups[group].f++;
    groups[group].l += lev;
    groups[group].d += dod;

    if (kuld >= KPI.UDSAETNING_KULD && dod >= KPI.DODFODTE_GAML_SO) {
      groups[group].udsaetning.push(`${row["Sonavn"]} (Kuld: ${kuld})`);
    }
  });

  let md = `\n### 🐷 Parity Analyse (Aldersprofil)\n\n`;
  md += `| Gruppe | Faringer | Lev/kuld | Døde/kuld | SB % | Udsætning Flag |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  for (const [group, g] of Object.entries(groups)) {
    if (g.f === 0) continue;
    const avgL = (g.l / g.f).toFixed(1);
    const avgD = (g.d / g.f).toFixed(1);
    const sbRate = calcStillbirthRate(g.l, g.d).toFixed(1);
    const udsStr =
      g.udsaetning.length > 0 ? `⚠️ ${g.udsaetning.join(", ")}` : "—";
    md += `| **${group}** | ${g.f} | ${avgL} | ${avgD} | ${sbRate}% | ${udsStr} |\n`;
  }
  return md + "\n";
}

function buildShiftAnalysis(weekData) {
  const shifts = {
    "Dag (06-16)": { f: 0, l: 0, d: 0 },
    "Nat (16-06)": { f: 0, l: 0, d: 0 },
  };

  weekData.forEach((row) => {
    const shift = getShift(row._realDate);
    shifts[shift].f++;
    shifts[shift].l += parseInt(row["Levendefødte"] || 0);
    shifts[shift].d += parseInt(row["Dødfødte"] || 0);
  });

  let md = `\n### 🌙 Dag vs. Nat\n\n`;
  md += `| Vagt | Faringer | Lev/kuld | Døde/kuld | SB % |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  for (const [shift, s] of Object.entries(shifts)) {
    if (s.f === 0) continue;
    const avgL = (s.l / s.f).toFixed(1);
    const avgD = (s.d / s.f).toFixed(1);
    const sbRate = calcStillbirthRate(s.l, s.d).toFixed(1);
    md += `| **${shift}** | ${s.f} | ${avgL} | ${avgD} | ${sbRate}% |\n`;
  }
  return md + "\n";
}

function buildLokationHeatmap(weekData) {
  const lokMap = {};
  weekData.forEach((row) => {
    let rawLok = (row["Faringslokation"] || row["Lokation"] || "Ukendt").trim();
    let displayLok = rawLok;
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

  const allAvgL =
    Object.values(lokMap).reduce((s, v) => s + v.l, 0) /
    Object.values(lokMap).reduce((s, v) => s + v.f, 0);

  const sorted = Object.entries(lokMap).sort((a, b) => {
    return (
      calcStillbirthRate(b[1].l, b[1].d) - calcStillbirthRate(a[1].l, a[1].d)
    );
  });

  let md = `\n### 🗺️ Lokation Heatmap\n\n`;
  md += `| Sektion | Faringer | Lev/kuld | Døde/kuld | SB % | Status |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  sorted.forEach(([lok, g]) => {
    const avgL = (g.l / g.f).toFixed(1);
    const avgD = (g.d / g.f).toFixed(1);
    const sbRate = calcStillbirthRate(g.l, g.d);
    const icon =
      sbRate > KPI.STILLBIRTH_RATE_ALERT
        ? "🔴 Tjek!"
        : parseFloat(avgL) >= allAvgL
          ? "🟢 OK"
          : "🟡 Under gns.";
    md += `| **${lok}** | ${g.f} | ${avgL} | ${avgD} | ${sbRate.toFixed(1)}% | ${icon} |\n`;
  });

  return md + "\n";
}

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
    if (sbRate > KPI.STILLBIRTH_RATE_ALERT)
      reasons.push(`SB ${sbRate.toFixed(0)}%`);
    if (lev <= 10) reasons.push(`Lav levende (${lev})`);
    if (kuld >= KPI.UDSAETNING_KULD && dod >= KPI.DODFODTE_GAML_SO)
      reasons.push(`Udsætning (Kuld ${kuld})`);

    if (reasons.length > 0) {
      obs.push({
        so: r["Sonavn"],
        lev,
        dod,
        sbRate,
        lok: displayLok,
        kuld,
        reasons,
      });
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
  const excelFile = files.find(
    (f) => f.endsWith(".xlsx") || f.endsWith(".xls"),
  );

  if (!excelFile) {
    console.error(
      "❌ Không tìm thấy file Excel (.xlsx, .xls) trong folder 'input'.",
    );
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
    (row) => row.includes("Sonavn") && row.includes("Dato"),
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

    // Xử lý ISO Year: Tuần 1 của năm mới nhưng ngày rơi vào tháng 12 năm cũ
    if (oprettetDate.getMonth() === 11 && week === 1) year++;
    // Xử lý ISO Year: Tuần 52/53 của năm cũ nhưng ngày rơi vào tháng 1 năm mới
    if (oprettetDate.getMonth() === 0 && week >= 52) year--;

    // Nếu mảng TARGET_YEARS không rỗng và year hiện tại không nằm trong mảng thì bỏ qua
    if (
      TARGET_YEARS &&
      TARGET_YEARS.length > 0 &&
      !TARGET_YEARS.includes(year)
    ) {
      return;
    }

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][week]) grouped[year][week] = [];
    grouped[year][week].push(row);
  });

  for (let year in grouped) {
    const yearFolder = path.join(OUTPUT_DIR, year);
    if (!fs.existsSync(yearFolder))
      fs.mkdirSync(yearFolder, { recursive: true });

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

      let accFaringer = 0,
        accLevende = 0,
        accDod = 0;
      let accFaringerGylte = 0,
        accLevendeGylte = 0;

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
      const wGnsGylte =
        accFaringerGylte > 0 ? accLevendeGylte / accFaringerGylte : 0;
      const wSBRate = calcStillbirthRate(accLevende, accDod);

      // Bắt đầu viết Markdown
      let md = `\n# Uge ${week} - Farings Manager BI\n\n`;
      md += `> Periode: **${startStr} - ${endStr}**\n\n`;

      // 🏆 Dùng Bảng Markdown thay cho List
      md += `\n## 🏆 KPI Dashboard\n\n`;
      md += `| Indikator | Mål | Resultat | Status |\n`;
      md += `| :--- | :---: | :---: | :--- |\n`;
      md += `| **Faringer** | ${KPI.FARINGER_UGE} | **${accFaringer}** | ${accFaringer >= KPI.FARINGER_UGE ? "🟢 Nået" : `🔴 Mangler ${KPI.FARINGER_UGE - accFaringer}`} |\n`;
      md += `| **Levende/kuld** | ${KPI.LEVENDE_PR_KULD} | **${wGnsLev.toFixed(1)}** | ${formatStatus(wGnsLev, KPI.LEVENDE_PR_KULD, true)} |\n`;
      md += `| **Gylte Levende** | ${KPI.LEVENDE_GYLTE_PR_KULD} | **${wGnsGylte.toFixed(1)}** | ${accFaringerGylte > 0 ? formatStatus(wGnsGylte, KPI.LEVENDE_GYLTE_PR_KULD, true) : "—"} |\n`;
      md += `| **Dødfødte/kuld** | Max ${KPI.DODFODTE_PR_KULD} | **${wGnsDod.toFixed(1)}** | ${formatStatus(wGnsDod, KPI.DODFODTE_PR_KULD, false)} |\n`;
      md += `| **Stillbirth %** | < ${KPI.STILLBIRTH_RATE_ALERT}% | **${wSBRate.toFixed(1)}%** | ${wSBRate <= KPI.STILLBIRTH_RATE_ALERT ? "🟢 OK" : "🔴 Kritisk"} |\n\n`;

      md += `---\n\n`;
      md += `\n## 📊 Ugens Fordeling\n\n`;
      md += buildParityAnalysis(weekData);
      md += buildShiftAnalysis(weekData);
      md += buildLokationHeatmap(weekData);
      md += `---\n\n`;

      md += `\n## 📅 Daglig Faringsovervågning\n\n`;

      sortedDatesAsc.forEach((dateStr) => {
        const dayData = daysGroup[dateStr];
        dayData.sort((a, b) => a._realDate - b._realDate);
        const dayOfWeekIndex = dayData[0]._realDate.getDay();
        const dayName = DANISH_DAYS[dayOfWeekIndex];

        md += `\n### ${dayName}, ${dateStr}\n\n`;

        const obsSoer = getObsSoer(dayData);
        const topSoer = dayData.filter(
          (r) =>
            parseInt(r["Levendefødte"] || 0) >= KPI.TOP_SO_LEVENDE &&
            parseInt(r["Dødfødte"] || 0) === 0,
        );

        // Sử dụng Blockquote cho các cảnh báo / khen ngợi
        if (obsSoer.length > 0) {
          md += `> 🔴 **OBS-SØER (Kræver tjek):**<br>\n`;
          obsSoer.forEach((s) => {
            md += `> **${s.so}** (Lev: ${s.lev}, Døde: ${s.dod}, Lok: ${s.lok}) — _${s.reasons.join(" \\| ")}_<br>\n`;
          });
          md += `\n`;
        }

        if (topSoer.length > 0) {
          md += `> 🌟 **STJERNESØER (0 døde):**<br>\n`;
          topSoer.forEach(
            (r) =>
              (md += `> **${r["Sonavn"]}** (Levende: ${r["Levendefødte"]}, Kuld: ${r["Kuld"]})<br>\n`),
          );
          md += `\n`;
        }

        // Bảng chi tiết: Header ngắn gọn lại
        md += `| Nr | So | Tid | Kuld | Grp | Vagt | Lev | Død | SB% | Lokation | Vurdering | Med(Pat) | Med(So) |\n`;
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

          md += `| ${nr} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${parityGroup} | ${shift} | **${lev}** | ${dod} | ${sbRate}% | ${displayLok} | ${vurdering} | ${row._medicinPat} | ${row._medicinSo} |\n`;
        });

        md += `\n<br>\n\n`;
      });

      md += `---\n\n`;
      md += `\n## 📋 Fuld Faringsoversigt (Sorteret)\n\n`;
      md += `> Hele ugens faringer rangeret efter ydeevne (flest levende, færrest døde).\n\n`;

      md += `| Rang | Dato | So | Tid | Kuld | Grp | Vagt | Lev | Død | SB% | Lokation | Vurdering | Med(Pat) | Med(So) |\n`;
      md += `| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;

      const sortedWeekData = [...weekData].sort((a, b) => {
        const levA = parseInt(a["Levendefødte"] || 0);
        const dodA = parseInt(a["Dødfødte"] || 0);
        const levB = parseInt(b["Levendefødte"] || 0);
        const dodB = parseInt(b["Dødfødte"] || 0);

        if (levA !== levB) return levB - levA;
        return dodA - dodB;
      });

      sortedWeekData.forEach((row, index) => {
        const rang = index + 1;
        const dato = dd(row._realDate).slice(0, 5); // Chỉ lấy DD.MM cho gọn
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

        md += `| ${rang} | ${dato} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${parityGroup} | ${shift} | **${lev}** | ${dod} | ${sbRate}% | ${displayLok} | ${vurdering} | ${row._medicinPat} | ${row._medicinSo} |\n`;
      });

      md += `\n`;

      fs.writeFileSync(path.join(yearFolder, fileName), "\uFEFF" + md, "utf8");
    }

    if (weeksProcessedInYear.length > 0) {
      let sumMd = `\n# 📊 Årsrapport ${year} - Zooteknisk BI\n\n`;

      // 🟢 GỌI HÀM PHÂN TÍCH CHUYÊN GIA BI TẠI ĐÂY
      sumMd += buildEnterpriseTrendAnalysis(
        grouped[year],
        weeksProcessedInYear,
      );

      sumMd += `\n## 🗓️ Ugentlig Faringsoversigt\n\n`;
      sumMd += `> Format: **[Faringer]** *(Heraf gylte)* <br> _Levende pr. kuld \\| Døde pr. kuld \\| Stillbirth %_\n\n`;

      sumMd += `| Uge | Mandag | Tirsdag | Onsdag | Torsdag | Fredag | Lørdag | Søndag | Ugetotal |\n`;
      sumMd += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

      let totalSummary = {};
      for (let d = 1; d <= 7; d++)
        totalSummary[d] = { f: 0, f1: 0, l: 0, d: 0, c: 0 };

      weeksProcessedInYear
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((w) => {
          let wRow = `| **Uge ${w}** |`;
          let wTotalF = 0,
            wTotalF1 = 0,
            wTotalL = 0,
            wTotalD = 0;

          for (let day = 1; day <= 7; day++) {
            const { f, f1, l, d } = summaryMatrix[w][day];
            wTotalF += f;
            wTotalF1 += f1;
            wTotalL += l;
            wTotalD += d;

            if (f > 0) {
              totalSummary[day].f += f;
              totalSummary[day].f1 += f1;
              totalSummary[day].l += l;
              totalSummary[day].d += d;
              totalSummary[day].c++;

              const avgL = (l / f).toFixed(1);
              const avgD = (d / f).toFixed(1);
              const sbRate = calcStillbirthRate(l, d).toFixed(1);
              wRow += ` **${f}** *(${f1})*<br>_L:${avgL} \\| D:${avgD}_<br>_SB:${sbRate}%_ |`;
            } else {
              wRow += ` — |`;
            }
          }

          const wAvgL = wTotalF > 0 ? (wTotalL / wTotalF).toFixed(1) : 0;
          const wAvgD = wTotalF > 0 ? (wTotalD / wTotalF).toFixed(1) : 0;
          const wSB = calcStillbirthRate(wTotalL, wTotalD).toFixed(1);
          wRow += ` **${wTotalF}** *(${wTotalF1})*<br>_L:${wAvgL} \\| D:${wAvgD}_<br>_SB:${wSB}%_ |\n`;
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
          sumMd += ` **~${avgF}** *(~${avgF1})*<br>_L:${avgL} \\| D:${avgD}_<br>_SB:${sbRate}%_ |`;
        } else {
          sumMd += ` — |`;
        }
      }

      const summaryFileName = `00 Ugentlig Sammenligning Ekspert ${year}.md`;
      fs.writeFileSync(
        path.join(yearFolder, summaryFileName),
        "\uFEFF" + sumMd,
        "utf8",
      );
    }
  }

  console.log(
    `✅ Xử lý hoàn tất! File phân tích AI đã được xuất ra thư mục 'output'.`,
  );
}

main();
