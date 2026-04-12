// ============================================================
//  COMBINED REPORT — MERGED SCRIPT
//  Kết hợp: merge_reports.js (CSV → Excel) + script.js (SVG Charts)
//  Xuất: Samlet_Rapport.xlsx + Samlet_Rapport_Charts.md
//  Biểu đồ: Toàn bộ reproMetrics + faringMetrics
// ============================================================

import fs   from "fs";
import path from "path";
import xlsx from "xlsx";
import { fileURLToPath } from "url";

// __dirname shim for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 1 — CONFIG                                       ║
// ╚══════════════════════════════════════════════════════════╝

const INPUT_FOLDER = path.join(__dirname, "Input");
const OUTPUT_DIR   = "/Users/jonathan/Documents/code/ny-solvang/public/quintessential-essence/3 Cloudfarms";
const OUTPUT_FILE  = path.join(OUTPUT_DIR, "Samlet Rapport.xlsx");
const CHARTS_FILE  = path.join(OUTPUT_DIR, "Samlet Rapport.md");

// ── Metrics definitions (fra merge_reports.js) ──────────────
const reproMetrics = [
  { search: "Løbninger [#]",                          label: "Løbninger [#]" },
  { search: "Omløbninger [%]",                        label: "Omløbninger [%]" },
  { search: "Dage fra fravænning til 1. løbning",     label: "Dage fra fravænning til 1. løbning" },
  { search: "Drægtige i uge 4",                       label: "Drægtige i uge 4 (%)" },
  { search: "Drægtige i uge 6",                       label: "Drægtige i uge 6 [%]" },
  { search: "Drægtige i uge 8",                       label: "Drægtige i uge 8 (%)" },
  { search: "Døde søer og gylte",                     label: "Døde søer og gylte [#]" },
];

const faringMetrics = [
  { search: "Faringer [#]",                           label: "Faringer [#]" },
  { search: "Drægtige i uge 17",                      label: "Drægtige i uge 17 [%]" },
  { search: "Levende fødte pr kuld",                  label: "Levende fødte pr kuld [#]" },
  { search: "1. lægs",                                label: "1. lægs, levn. fødte/kuld [#]" },
  { search: "Dødfødte pr kuld",                       label: "Dødfødte pr kuld [#]" },
  { search: "Reele døde pattegrise før fravænning  [",label: "Reele døde pattegrise før fravænning [#]" },
  { search: "Reele døde pattegrise døde før fravænning", label: "Reele døde pattegrise før fravænning [%]" },
  { search: "Fravænninger [#]",                       label: "Fravænninger [#]" },
  { search: "Fravænnede smågrise [#]",                label: "Fravænnede smågrise [#]" },
  { search: "Fravænnede smågrise pr fravænning",      label: "Fravænnede smågrise pr fravænning [#]" },
  { search: "Fravænnede smågrise pr kuld",            label: "Fravænnede smågrise pr kuld [#]" },
  { search: "Beregnet pattegrisedød",                 label: "Beregnet pattegrisedødelighed [%]" },
  { search: "Diegivningsperiode",                     label: "Diegivningsperiode [days]" },
  { search: "Drægtighedsvarighed",                    label: "Drægtighedsvarighed [days]" },
  { search: "Spildfoderdage per kuld",                label: "Spildfoderdage per kuld" },
  { search: "Kuld / so / år",                         label: "Kuld / so / år [#]" },
  { search: "Fravænnede pattegrise / so / år",        label: "Fravænnede pattegrise / so / år [#]" },
  { search: "Overførte smågrise / so / år",           label: "Overførte smågrise / so / år [#]" },
  { search: "Overførte smågrise/faresti/år",          label: "Overførte smågrise/faresti/år [#]" },
];

// ── Metadata: er metrik "lavere = bedre"? og er det procent? ─
// Bruges til intelligent farve-kodning i SVG-charts.
const metricMeta = {
  // reproMetrics
  "Løbninger [#]":                          { lowerBetter: false, isPercent: false },
  "Omløbninger [%]":                        { lowerBetter: true,  isPercent: true  },
  "Dage fra fravænning til 1. løbning":     { lowerBetter: true,  isPercent: false },
  "Drægtige i uge 4 (%)":                   { lowerBetter: false, isPercent: true  },
  "Drægtige i uge 6 [%]":                   { lowerBetter: false, isPercent: true  },
  "Drægtige i uge 8 (%)":                   { lowerBetter: false, isPercent: true  },
  "Døde søer og gylte [#]":                 { lowerBetter: true,  isPercent: false },
  // faringMetrics
  "Faringer [#]":                           { lowerBetter: false, isPercent: false },
  "Drægtige i uge 17 [%]":                  { lowerBetter: false, isPercent: true  },
  "Levende fødte pr kuld [#]":              { lowerBetter: false, isPercent: false },
  "1. lægs, levn. fødte/kuld [#]":          { lowerBetter: false, isPercent: false },
  "Dødfødte pr kuld [#]":                   { lowerBetter: true,  isPercent: false },
  "Reele døde pattegrise før fravænning [#]":{ lowerBetter: true, isPercent: false },
  "Reele døde pattegrise før fravænning [%]":{ lowerBetter: true, isPercent: true  },
  "Fravænninger [#]":                       { lowerBetter: false, isPercent: false },
  "Fravænnede smågrise [#]":                { lowerBetter: false, isPercent: false },
  "Fravænnede smågrise pr fravænning [#]":  { lowerBetter: false, isPercent: false },
  "Fravænnede smågrise pr kuld [#]":        { lowerBetter: false, isPercent: false },
  "Beregnet pattegrisedødelighed [%]":      { lowerBetter: true,  isPercent: true  },
  "Diegivningsperiode [days]":              { lowerBetter: false, isPercent: false },
  "Drægtighedsvarighed [days]":             { lowerBetter: false, isPercent: false },
  "Spildfoderdage per kuld":                { lowerBetter: true,  isPercent: false },
  "Kuld / so / år [#]":                     { lowerBetter: false, isPercent: false },
  "Fravænnede pattegrise / so / år [#]":    { lowerBetter: false, isPercent: false },
  "Overførte smågrise / so / år [#]":       { lowerBetter: false, isPercent: false },
  "Overførte smågrise/faresti/år [#]":      { lowerBetter: false, isPercent: false },
};

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 2 — XLSX MERGE                                   ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Læser alle .xlsx/.xls-filer i Input-mappen og returnerer:
 *   { sortedWeeks, weekData, goals }
 */
function mergeXlsxReports() {
  const weekData = {};
  const goals    = {};
  const weeks    = new Set();

  if (!fs.existsSync(INPUT_FOLDER)) {
    console.error(`❌ Input-mappe ikke fundet: ${INPUT_FOLDER}`);
    process.exit(1);
  }

  // Find alle xlsx/xls filer, ekskluder output-filen selv
  const files = fs.readdirSync(INPUT_FOLDER)
    .filter(f => /\.(xlsx|xls)$/i.test(f))
    .filter(f => !f.startsWith("Samlet_Rapport"));

  if (files.length === 0) {
    console.warn("⚠️  Ingen XLSX-filer fundet i Input-mappen.");
    return { sortedWeeks: [], weekData, goals };
  }

  const allMetrics = [...reproMetrics, ...faringMetrics];

  files.forEach(file => {
    const filePath = path.join(INPUT_FOLDER, file);
    console.log(`   📄 Læser: ${file}`);

    const workbook  = xlsx.readFile(filePath, { raw: false });
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];

    // Konverter til array-of-arrays (rækker × kolonner)
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // ── Find ugenummer ────────────────────────────────────────
    // Søger i alle celler efter "Ugenummer: XX"
    let currentWeek = null;
    for (const row of rows) {
      for (const cell of row) {
        const m = String(cell ?? "").match(/Ugenummer[:\s]+(\d+)/i);
        if (m) { currentWeek = parseInt(m[1], 10); break; }
      }
      if (currentWeek !== null) break;
    }

    // Fallback: udlæs tal fra filnavnet (fx "Uge 12 rapport.xlsx")
    if (currentWeek === null) {
      const fnMatch = file.match(/(\d+)/);
      currentWeek = fnMatch ? parseInt(fnMatch[1], 10) : file.replace(/\.[^.]+$/, "");
    }

    weeks.add(currentWeek);
    if (!weekData[currentWeek]) weekData[currentWeek] = {};

    // ── Parse rækker ──────────────────────────────────────────
    // Kolonne-indeks: [0] = label, [5] = mål, [8] = ugeværdi
    rows.forEach(row => {
      const rowLabel  = String(row[0] ?? "").trim();
      const goalValue = String(row[5] ?? "").trim();
      const weekValue = String(row[8] ?? "").trim();

      if (!rowLabel) return;

      allMetrics.forEach(metric => {
        if (rowLabel.includes(metric.search)) {
          if (goalValue !== "" && !goals[metric.label]) {
            goals[metric.label] = goalValue;
          }
          if (weekValue !== "") {
            weekData[currentWeek][metric.label] = weekValue;
          }
        }
      });
    });
  });

  const sortedWeeks = Array.from(weeks).sort((a, b) => {
    const na = Number(a), nb = Number(b);
    return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b));
  });

  console.log(`📂 ${files.length} XLSX-fil(er) læst. Uger fundet: ${sortedWeeks.join(", ")}`);
  return { sortedWeeks, weekData, goals };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 3 — EXCEL OUTPUT (fra merge_reports.js)          ║
// ╚══════════════════════════════════════════════════════════╝

function writeExcelReport(sortedWeeks, weekData, goals) {
  let excelData = [];

  function appendSection(title, metricsArray) {
    excelData.push([title]);
    let headers = ["Nhãn", "Mục tiêu (Mål)"];
    sortedWeeks.forEach(week => headers.push(`Tuần ${week}`));
    excelData.push(headers);

    metricsArray.forEach(metric => {
      let row = [metric.label, goals[metric.label] || ""];
      sortedWeeks.forEach(week => {
        row.push(weekData[week]?.[metric.label] || "");
      });
      excelData.push(row);
    });

    excelData.push([]); // Tom række
  }

  appendSection("1. REPRODUKTION (Sinh sản)", reproMetrics);
  appendSection("2. FARINGSLOKATION (Khu đẻ)", faringMetrics);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(excelData);

  ws["!cols"] = [
    { wch: 45 },
    { wch: 15 },
    ...sortedWeeks.map(() => ({ wch: 10 })),
  ];

  xlsx.utils.book_append_sheet(wb, ws, "Samlet Rapport");
  xlsx.writeFile(wb, OUTPUT_FILE);
  console.log(`✅ Excel-rapport gemt: ${OUTPUT_FILE}`);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 4 — SVG CHART ENGINE (fra script.js)             ║
// ╚══════════════════════════════════════════════════════════╝

function calcLinearRegression(yValues) {
  const n = yValues.length;
  if (n < 2) return { slope: 0, intercept: yValues[0] ?? 0 };
  const xMean = (n - 1) / 2;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  yValues.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  const slope     = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/**
 * Tính "Krævet Gennemsnit" — giá trị trung bình cần đạt cho các tuần còn lại
 * trong năm để tổng trung bình cả năm = goal.
 *
 * Công thức:
 *   goal = (sumHidtil + krævet × ugerTilbage) / totalUger
 *   => krævet = (goal × totalUger − sumHidtil) / ugerTilbage
 *
 * Trả về null nếu: không còn tuần nào, hoặc giá trị tính ra vô lý.
 *
 * @param {number[]} values      - Mảng giá trị thực tế các tuần đã có
 * @param {number}   goal        - KPI mục tiêu
 * @param {number}   totalUger   - Tổng số tuần trong năm (mặc định 52)
 * @returns {number|null}
 */
function calcKrævetGennemsnit(values, goal, totalUger = 52) {
  const ugerKørt   = values.length;
  const ugerTilbage = totalUger - ugerKørt;
  if (ugerTilbage <= 0) return null;

  const sumHidtil = values.reduce((a, b) => a + b, 0);
  const krævet    = (goal * totalUger - sumHidtil) / ugerTilbage;

  // Returner null hvis værdien er negativ eller urealistisk høj (> 3× mål)
  if (krævet < 0 || krævet > goal * 3) return null;
  return krævet;
}

/**
 * SVG Bar Chart — nâng cấp từ script.js
 * @param {Array<{week, value}>} historyData  - dữ liệu theo tuần
 * @param {boolean} isLowerBetter
 * @param {boolean} isPercent
 * @param {number|null} kpiGoal
 * @param {number|null} krævetVal             - Krævet Gennemsnit (đường tím)
 */
function generateSvgBarChart(historyData, isLowerBetter = false, isPercent = false, kpiGoal = null, krævetVal = null) {
  if (!historyData || historyData.length === 0) return "";

  const n        = historyData.length;
  const isCompact = n > 26;
  const values   = historyData.map(h => h.value);

  const exactMax = Math.max(...values);
  const exactMin = Math.min(...values);
  const avgVal   = values.reduce((a, b) => a + b, 0) / n;

  // Nice Scale
  let rangeRaw = exactMax - exactMin;
  if (rangeRaw === 0) rangeRaw = Math.abs(exactMax) > 0 ? Math.abs(exactMax) * 0.2 : 10;

  const roughStep = rangeRaw / 8;
  const mag       = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const relStep   = roughStep / mag;
  let niceRelStep;
  if (relStep < 1.5)      niceRelStep = 1;
  else if (relStep < 3.5) niceRelStep = 2;
  else if (relStep < 7.5) niceRelStep = 5;
  else                    niceRelStep = 10;

  let step = parseFloat((niceRelStep * mag).toPrecision(12));

  let yMin = Math.floor(exactMin / step) * step;
  let yMax = Math.ceil(exactMax  / step) * step;
  if (yMin >= exactMin - step * 0.5) yMin -= step;
  if (yMax <= exactMax + step * 0.5) yMax += step;

  if (kpiGoal !== null) {
    if (yMin > kpiGoal) yMin = Math.floor(kpiGoal / step) * step - step;
    if (yMax < kpiGoal) yMax = Math.ceil(kpiGoal  / step) * step + step;
  }
  if (krævetVal !== null) {
    if (yMin > krævetVal) yMin = Math.floor(krævetVal / step) * step - step;
    if (yMax < krævetVal) yMax = Math.ceil(krævetVal  / step) * step + step;
  }
  yMin = parseFloat(yMin.toPrecision(12));
  yMax = parseFloat(yMax.toPrecision(12));

  const numIntervals = Math.round((yMax - yMin) / step);
  const range        = yMax - yMin;

  const getDecimals = v => {
    if (Math.floor(v) === v) return 0;
    return v.toString().split(".")[1]?.length || 0;
  };
  const decCount = getDecimals(step);

  // Layout
  const SVG_W    = 920;
  const MARGIN_L = 85;
  const MARGIN_R = 120;
  const MARGIN_T = 45;
  const MARGIN_B = 60;
  const CHART_H  = 320;
  const CHART_W  = SVG_W - MARGIN_L - MARGIN_R;
  const SVG_H    = MARGIN_T + CHART_H + MARGIN_B;
  const slotW    = CHART_W / n;
  const BAR_W    = isCompact ? 5 : 8;

  const toY  = v  => MARGIN_T + CHART_H - ((v - yMin) / (yMax - yMin)) * CHART_H;
  const getX = idx => MARGIN_L + idx * slotW + slotW / 2;

  const { slope, intercept } = calcLinearRegression(values);
  const trendY0 = toY(intercept);
  const trendY1 = toY(intercept + slope * (n - 1));
  const xFirst  = getX(0);
  const xLast   = getX(n - 1);

  let svgGrid = "", svgBars = "", svgLines = "", svgLabels = "", svgLegend = "";

  // Grid
  for (let i = 0; i <= numIntervals; i++) {
    const gridY    = MARGIN_T + (CHART_H * i) / numIntervals;
    let gridVal    = parseFloat((yMax - i * step).toPrecision(12));
    let dispGridVal = gridVal.toFixed(decCount) + (isPercent ? "%" : "");
    svgGrid += `<line x1="${MARGIN_L}" y1="${gridY}" x2="${MARGIN_L + CHART_W}" y2="${gridY}" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    svgGrid += `<text x="${MARGIN_L + CHART_W + 8}" y="${gridY + 3.5}" font-size="9" fill="#94a3b8" font-weight="600" text-anchor="start">${dispGridVal}</text>`;
  }

  let baselineY = toY(0);
  if (baselineY > MARGIN_T + CHART_H || yMin >= 0) baselineY = MARGIN_T + CHART_H;
  svgGrid += `<line x1="${MARGIN_L}" y1="${baselineY}" x2="${MARGIN_L + CHART_W}" y2="${baselineY}" stroke="#94a3b8" stroke-width="2"/>`;

  // Bars
  historyData.forEach((h, idx) => {
    const val     = h.value;
    const xCenter = getX(idx);
    const xRect   = xCenter - BAR_W / 2;
    const yVal    = toY(val);

    let barH, y;
    if (val >= 0) { barH = Math.max(4, baselineY - yVal); y = baselineY - barH; }
    else          { barH = Math.max(4, yVal - baselineY); y = baselineY; }

    const margin  = range * 0.12;
    const isGood  = isLowerBetter ? val <= avgVal - margin : val >= avgVal + margin;
    const isBad   = isLowerBetter ? val >= avgVal + margin : val <= avgVal - margin;
    const isCurrent = idx === n - 1;

    const color = isCurrent
      ? (isGood ? "#00E396" : isBad ? "#FF4560" : "#FEB019")
      : (isGood ? "#69F0AE" : isBad ? "#FF8A80" : "#FFE57F");

    const dispVal = isPercent
      ? val.toFixed(1) + "%"
      : (Number.isInteger(val) ? val : val.toFixed(1));

    svgBars += `<rect x="${xRect}" y="${y}" width="${BAR_W}" height="${barH}" rx="0.5" fill="${color}" opacity="0.95"/>`;

    if (isCompact) {
      if (isCurrent || val === exactMax || val === exactMin) {
        svgLabels += `<text x="${xCenter}" y="${y - 8}" font-size="11.5" fill="${isCurrent ? "#0f172a" : "#64748b"}" text-anchor="middle" font-weight="${isCurrent ? "800" : "600"}">${dispVal}</text>`;
      }
      if (idx % 4 === 0 || isCurrent) {
        svgLabels += `<text x="${xCenter}" y="${baselineY + 20}" font-size="11" fill="#64748b" text-anchor="middle" font-weight="600">U${h.week}</text>`;
      }
    } else {
      svgLabels += `<text x="${xCenter}" y="${y - 8}" font-size="12" fill="#0f172a" text-anchor="middle" font-weight="800">${dispVal}</text>`;
      svgLabels += `<text x="${xCenter}" y="${baselineY + 20}" font-size="11.5" fill="#475569" text-anchor="middle" font-weight="600">U${h.week}</text>`;
    }
  });

  // Lines — left side: Mål + Gennemsnit  |  right side: Krævet
  const leftLabelsData  = [];
  const rightLabelsData = [];

  if (kpiGoal !== null) {
    const ky = toY(kpiGoal);
    svgLines += `<line x1="${MARGIN_L}" y1="${ky}" x2="${MARGIN_L + CHART_W}" y2="${ky}" stroke="#008FFB" stroke-width="2" stroke-dasharray="6,4" opacity="0.85"/>`;
    leftLabelsData.push({ y: ky, text: `Mål: ${isPercent ? kpiGoal.toFixed(1) + "%" : kpiGoal}`, color: "#008FFB" });
  }

  const avgY = toY(avgVal);
  svgLines += `<line x1="${MARGIN_L}" y1="${avgY}" x2="${MARGIN_L + CHART_W}" y2="${avgY}" stroke="#546E7A" stroke-width="2" stroke-dasharray="3,3" opacity="0.7"/>`;
  leftLabelsData.push({ y: avgY, text: `Gns: ${isPercent ? avgVal.toFixed(1) + "%" : avgVal.toFixed(1)}`, color: "#546E7A" });

  // ── Krævet Gennemsnit (tím) ────────────────────────────────
  // Màu đổi sang đỏ cam nếu krævet khắt khe hơn goal (cần cố gắng hơn)
  let krColor = "#9333ea"; // tím mặc định
  if (krævetVal !== null) {
    const isStricter = isLowerBetter
      ? krævetVal < (kpiGoal ?? krævetVal)
      : krævetVal > (kpiGoal ?? krævetVal);
    krColor = isStricter ? "#FF3366" : "#9333ea";

    const krY = toY(krævetVal);
    const krDisp = isPercent ? krævetVal.toFixed(1) + "%" : krævetVal.toFixed(1);
    svgLines += `<line x1="${MARGIN_L}" y1="${krY}" x2="${MARGIN_L + CHART_W}" y2="${krY}" stroke="${krColor}" stroke-width="2" stroke-dasharray="8,4" opacity="0.85"/>`;
    rightLabelsData.push({ y: krY, text: `Krævet: ${krDisp}`, color: krColor });
  }

  const trendIsGood = isLowerBetter ? slope <= 0 : slope >= 0;
  const trendColor  = Math.abs(slope) < 0.05 ? "#A8B2C1" : trendIsGood ? "#00E396" : "#FF4560";
  svgLines += `<line x1="${xFirst}" y1="${trendY0}" x2="${xLast}" y2="${trendY1}" stroke="${trendColor}" stroke-width="3" opacity="0.9"/>`;

  const dx = xLast - xFirst, dy = trendY1 - trendY0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  const arrowX = xLast - ux * 9, arrowY = trendY1 - uy * 9;
  svgLines += `<polygon points="${xLast},${trendY1} ${arrowX - uy * 5},${arrowY + ux * 5} ${arrowX + uy * 5},${arrowY - ux * 5}" fill="${trendColor}" opacity="0.9"/>`;

  // ── Anti-overlap labels ────────────────────────────────────
  const MIN_SPACING = 24;
  const resolveOverlap = labels => {
    if (labels.length <= 1) return;
    labels.sort((a, b) => a.y - b.y);
    for (let attempts = 0; attempts < 10; attempts++) {
      let changed = false;
      for (let i = 0; i < labels.length - 1; i++) {
        const diff = labels[i + 1].y - labels[i].y;
        if (diff < MIN_SPACING) {
          const offset = (MIN_SPACING - diff) / 2;
          labels[i].y -= offset;
          labels[i + 1].y += offset;
          changed = true;
        }
      }
      if (!changed) break;
    }
  };

  resolveOverlap(leftLabelsData);
  resolveOverlap(rightLabelsData);

  // Nhãn bên TRÁI (Mål, Gennemsnit)
  leftLabelsData.forEach(l => {
    svgLabels += `<text x="${MARGIN_L - 12}" y="${l.y + 4}" font-size="12" fill="${l.color}" text-anchor="end" font-weight="700">${l.text}</text>`;
  });

  // Nhãn bên PHẢI (Krævet) — stroke trắng để nổi bật trên nền cột
  rightLabelsData.forEach(l => {
    svgLabels += `<text x="${MARGIN_L + CHART_W + 46}" y="${l.y + 4}" font-size="12" fill="${l.color}" text-anchor="start" font-weight="700" stroke="#ffffff" stroke-width="3" paint-order="stroke fill">${l.text}</text>`;
  });

  // ── Legend ─────────────────────────────────────────────────
  const legendY     = SVG_H - 12;
  const legendItems = [
    { color: "#008FFB", dash: true,  label: "Mål" },
    { color: "#546E7A", dash: true,  label: "Gennemsnit" },
    { color: trendColor, dash: false, label: "Trend" },
  ];
  if (krævetVal !== null) {
    legendItems.push({ color: krColor, dash: true, label: "Krævet" });
  }
  const totalW = legendItems.reduce((acc, it) => acc + it.label.length * 8 + 36, 0);
  let lx = (SVG_W - totalW) / 2;
  legendItems.forEach(item => {
    if (item.dash) {
      svgLegend += `<line x1="${lx}" y1="${legendY - 4}" x2="${lx + 18}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="2.5" stroke-dasharray="4,3"/>`;
    } else {
      svgLegend += `<line x1="${lx}" y1="${legendY - 4}" x2="${lx + 18}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="3"/>`;
    }
    svgLegend += `<text x="${lx + 24}" y="${legendY}" font-size="11.5" fill="#334155" font-weight="600">${item.label}</text>`;
    lx += item.label.length * 8 + 36;
  });

  const svgCore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="100%" height="auto" style="font-family:system-ui,-apple-system,sans-serif;display:block;overflow:visible;">`;
  const svgFull = svgCore + svgGrid + svgBars + svgLines + svgLabels + svgLegend + `</svg>`;

  return (
    `<div style="width:100%;box-sizing:border-box;background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:24px 16px;margin:16px 0;box-shadow:0 10px 15px -3px rgba(0,0,0,.08);">` +
    svgFull +
    `</div>`
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 5 — CHART REPORT BUILDER                        ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Bygger ét afsnit i Markdown med SVG-chart for én metrik.
 * Parser værdier fra weekData og filtrerer ugyldige værdier fra.
 */
function buildMetricSection(metricLabel, sortedWeeks, weekData, goals) {
  const meta = metricMeta[metricLabel] ?? { lowerBetter: false, isPercent: false };

  // Byg historik-array: parse numeriske værdier, spring tomme/ugyldige over
  const historyData = [];
  sortedWeeks.forEach(week => {
    const rawVal = weekData[week]?.[metricLabel];
    if (rawVal === undefined || rawVal === null || rawVal === "") return;

    // Fjern %, komma-tusindadskiller, erstat decimalpunkt
    const cleaned = String(rawVal)
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace("%", "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;
    historyData.push({ week, value: num });
  });

  if (historyData.length === 0) {
    return `\n### 📊 ${metricLabel}\n\n> *(Ingen data tilgængelig for denne metrik)*\n\n`;
  }

  // Hent mål-værdi hvis den findes
  let kpiGoal = null;
  if (goals[metricLabel] !== undefined && goals[metricLabel] !== "") {
    const cleanedGoal = String(goals[metricLabel])
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace("%", "");
    const parsedGoal = parseFloat(cleanedGoal);
    if (!isNaN(parsedGoal)) kpiGoal = parsedGoal;
  }

  const latestVal = historyData[historyData.length - 1].value;
  const dispLatest = meta.isPercent ? latestVal.toFixed(1) + "%" : latestVal.toFixed(2);
  const goalStr    = kpiGoal !== null
    ? (meta.isPercent ? kpiGoal.toFixed(1) + "%" : kpiGoal)
    : "—";

  // ── Krævet Gennemsnit ──────────────────────────────────────
  // Beregn den gennemsnitsværdi de resterende uger skal levere
  // for at det samlede årsgennemsnit rammer KPI-målet (52 uger).
  let krævetVal = null;
  if (kpiGoal !== null) {
    const values = historyData.map(h => h.value);
    krævetVal = calcKrævetGennemsnit(values, kpiGoal, 52);
  }

  const krævetStr = krævetVal !== null
    ? (meta.isPercent ? krævetVal.toFixed(1) + "%" : krævetVal.toFixed(2))
    : "—";

  const chart = generateSvgBarChart(historyData, meta.lowerBetter, meta.isPercent, kpiGoal, krævetVal);

  let md = `\n### 📊 ${metricLabel}\n\n`;
  md += `> **Seneste:** ${dispLatest} | **Mål:** ${goalStr} | **Krævet gns.:** ${krævetStr} | **Uger med data:** ${historyData.length}\n\n`;
  md += chart + "\n\n";
  return md;
}

/**
 * Genererer fuld Markdown-rapport med alle charts.
 */
function buildChartsReport(sortedWeeks, weekData, goals) {
  const now = new Date().toLocaleDateString("da-DK");
  let md = `\n# 📈 Samlet Rapport\n\n`;
  md += `> Genereret: ${now} | Uger inkluderet: ${sortedWeeks.join(", ")}\n\n`;
  md += `---\n\n`;

  // ── Afsnit 1: reproMetrics ──────────────────────────────────
  md += `\n## 🐷 1. REPRODUKTION\n\n`;
  md += `> Nøgletal for drægtighedsforløb og løberesultater.\n\n`;
  reproMetrics.forEach(metric => {
    md += buildMetricSection(metric.label, sortedWeeks, weekData, goals);
  });

  md += `---\n\n`;

  // ── Afsnit 2: faringMetrics ─────────────────────────────────
  md += `\n## 🏠 2. FARINGSLOKATION\n\n`;
  md += `> Nøgletal for faringsforløb, pattegrisedødelighed og fravænning.\n\n`;
  faringMetrics.forEach(metric => {
    md += buildMetricSection(metric.label, sortedWeeks, weekData, goals);
  });

  md += `\n---\n\n`;
  md += `> *Rapport afsluttet — ${now}*\n`;
  return md;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 6 — MAIN                                         ║
// ╚══════════════════════════════════════════════════════════╝

function main() {
  console.log("\n⏳ Starter kombineret rapport-generator...\n");

  // Opret output-mappe hvis den ikke findes
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output-mappe oprettet: ${OUTPUT_DIR}`);
  }

  // Trin 1: Læs og flet alle XLSX-filer
  const { sortedWeeks, weekData, goals } = mergeXlsxReports();

  if (sortedWeeks.length === 0) {
    console.warn("⚠️  Ingen uger at behandle. Afslutter.");
    return;
  }

  // Trin 2: Gem Excel-rapport (Samlet_Rapport.xlsx)
  writeExcelReport(sortedWeeks, weekData, goals);

  // Trin 3: Generer SVG-charts for alle metrics og gem som Markdown
  console.log("\n⏳ Genererer SVG-biểu đồ for alle metrics...");
  const chartsMd = buildChartsReport(sortedWeeks, weekData, goals);
  fs.writeFileSync(CHARTS_FILE, "\uFEFF" + chartsMd, "utf8");
  console.log(`✅ Chart-rapport gemt: ${CHARTS_FILE}`);

  // Opsummering
  const totalMetrics = reproMetrics.length + faringMetrics.length;
  console.log(`\n✅ Færdig! ${totalMetrics} biểu đồ genereret (${reproMetrics.length} repro + ${faringMetrics.length} faring)`);
  console.log(`   📊 Excel:  ${OUTPUT_FILE}`);
  console.log(`   📈 Charts: ${CHARTS_FILE}\n`);
}

main();