"use strict";
// ============================================================
//  FARINGS MANAGER BI — ENTERPRISE EDITION
//  Senior Node.js / Zooteknisk upgrade — DanBred/SEGES 2024
//  Tác giả gốc được nâng cấp bởi Senior Dev + Agro Specialist
// ============================================================

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 1 — CONFIG (Tất cả tham số cấu hình tập trung)  ║
// ╚══════════════════════════════════════════════════════════╝

const CONFIG = {
  // --- Đường dẫn ---
  INPUT_DIR: path.join(__dirname, "input"),
  OUTPUT_DIR:
    "/Users/jonathan/Documents/code/ny-solvang/public/quintessential-essence/1 Medicin til søer og pattegrise",

  // --- Lọc năm: [] = tất cả, [2026] = chỉ năm 2026 ---
  TARGET_YEARS: [2025, 2026],

  // --- KPI Mục tiêu (SEGES/DanBred 2024) ---
  KPI: {
    FARINGER_UGE: 80, // Số lứa đẻ mục tiêu/tuần
    LEVENDE_PR_KULD: 20.0, // Heo sống/lứa (tổng đàn)
    LEVENDE_GYLTE_PR_KULD: 18.0, // Heo sống/lứa (hậu bị)
    DODFODTE_PR_KULD: 1.6, // Heo chết lưu/lứa
    STILLBIRTH_RATE_ALERT: 12.0, // % cảnh báo thai chết lưu
    DODFODTE_GAML_SO: 3, // Ngưỡng xét loại thải nái già
    UDSAETNING_KULD: 6, // Lứa tối thiểu để cân nhắc loại thải
    TOP_SO_LEVENDE: 22, // Ngưỡng "Nái Sao"
    PRE_WEAN_MORTALITY_PCT: 9.0, // % chết trước cai sữa cho phép (SEGES benchmark)
    MUMIFIED_ALERT_PER_KULD: 0.5, // Thai gỗ/lứa — ngưỡng cảnh báo
  },

  // --- Tham số Zooteknisk ---
  ZOO: {
    GESTATION_DAYS_MIN: 115, // Thời gian mang thai tối thiểu (ngày)
    GESTATION_DAYS_MAX: 117, // Thời gian mang thai tối đa (ngày)
    // Giá heo con thị trường (DKK) — dùng tính thiệt hại kinh tế
    PRIS_PER_PATTEGRIS: 200, // DKK/con sống (ước tính giá trị tại thời điểm sinh)
    // Ngưỡng kháng sinh Bimoxyl — "Gult Kort" (Thẻ Vàng)
    BIMOXYL_WEEKLY_ALERT: 15, // Số liều/tuần — vượt = cảnh báo
    // Tỷ lệ nái viêm/can thiệp — ngưỡng cảnh báo MMA
    MMA_INTERVENTION_RATE: 0.2, // > 20% nái trong tuần cần can thiệp = cảnh báo MMA
  },

  // --- Cột dữ liệu Excel (ánh xạ tên cột -> nhãn hiển thị) ---
  // Dùng để kiểm tra thiếu cột và báo lỗi chính xác
  REQUIRED_COLUMNS: [
    "Sonavn",
    "Oprettet den",
    "Kuld",
    "Levendefødte",
    "Dødfødte",
  ],
  OPTIONAL_COLUMNS: [
    "Faringslokation",
    "Lokation",
    "Mumificerede",
    "Faringstid",
    "Indgreb", // Can thiệp móc thai (0/1 hoặc 'Ja'/'Nej')
    "Feber", // Sốt sau đẻ (0/1)
  ],
};

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 2 — DATA PROCESSING (Đọc & chuẩn hóa dữ liệu)  ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Đọc file Excel, trả về mảng object đã chuẩn hóa.
 * Kiểm tra cột bắt buộc và cảnh báo cột tùy chọn còn thiếu.
 * @returns {{ data: Object[], missingRequired: string[], missingOptional: string[] }}
 */
function readExcelData(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd hh:mm:ss",
  });

  // Tìm hàng header (tìm hàng chứa "Sonavn" và "Dato")
  let headerIndex = rawJson.findIndex(
    (row) => row.includes("Sonavn") && row.includes("Dato"),
  );
  if (headerIndex === -1) headerIndex = 0;

  const headers = rawJson[headerIndex].map((h) => (h ? String(h).trim() : ""));

  // Kiểm tra cột bắt buộc
  const missingRequired = CONFIG.REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );
  const missingOptional = CONFIG.OPTIONAL_COLUMNS.filter(
    (col) => !headers.includes(col),
  );

  if (missingRequired.length > 0) {
    console.error(
      `❌ KRITISK FEJL: Manglende obligatoriske kolonner i Excel: [${missingRequired.join(", ")}]`,
    );
    console.error("   Script kan ikke fortsætte uden disse kolonner.");
    process.exit(1);
  }

  if (missingOptional.length > 0) {
    console.warn(
      `⚠️  ADVARSEL: Valgfrie kolonner mangler: [${missingOptional.join(", ")}]`,
    );
    console.warn(
      "   Funktioner som MMA-prognose og Thai gỗ analyse vil blive deaktiveret.",
    );
  }

  // Chuyển từng row thành object
  const data = [];
  rawJson.slice(headerIndex + 1).forEach((row) => {
    const obj = {};
    let hasData = false;
    headers.forEach((h, i) => {
      if (h) {
        obj[h] = row[i] !== undefined ? row[i] : "";
        if (row[i]) hasData = true;
      }
    });
    if (hasData) data.push(obj);
  });

  return { data, missingRequired, missingOptional };
}

/**
 * Chuẩn hóa dữ liệu thô: parse ngày, tính tuần ISO, gán thuốc.
 * Trả về object grouped theo { year -> { week -> [rows] } }
 */
function processAndGroupData(rawData) {
  const grouped = {};

  rawData.forEach((row) => {
    // Parse ngày
    let oprettetDate = new Date(String(row["Oprettet den"]).replace(/-/g, "/"));
    if (isNaN(oprettetDate.getTime())) {
      oprettetDate = new Date(row["Oprettet den"]);
    }
    if (isNaN(oprettetDate.getTime())) return; // Bỏ qua dòng không có ngày hợp lệ

    row._realDate = oprettetDate;

    let year = oprettetDate.getFullYear();
    const week = getISOWeek(oprettetDate);

    // Xử lý ISO Year edge-case (tuần 1 / tuần 52-53 vắt năm)
    if (oprettetDate.getMonth() === 11 && week === 1) year++;
    if (oprettetDate.getMonth() === 0 && week >= 52) year--;

    // Lọc theo TARGET_YEARS
    if (CONFIG.TARGET_YEARS.length > 0 && !CONFIG.TARGET_YEARS.includes(year))
      return;

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][week]) grouped[year][week] = [];
    grouped[year][week].push(row);
  });

  return grouped;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 3 — BUSINESS LOGIC (Zooteknisk & SEGES/DanBred) ║
// ╚══════════════════════════════════════════════════════════╝

// --- Phân nhóm parity ---
function getParityGroup(kuld) {
  if (kuld === 1) return "Gylte (Kuld 1)";
  if (kuld === 2) return "2. Lægs";
  if (kuld >= 3 && kuld <= 5) return "Prime (Kuld 3-5)";
  return "Gamle søer (6+)";
}

// --- Ca làm việc ---
function getShift(date) {
  const hour = date.getHours();
  return hour >= 6 && hour < 16 ? "Dag (06-16)" : "Nat (16-06)";
}

// --- Công suất nuôi con tối đa (Kapacitet) ---
// Gylte (1) = 15; Kuld 2,3,4 = 14; Kuld 5+ = 13
function getSowCapacity(kuld) {
  if (kuld === 1) return 15;
  if (kuld >= 2 && kuld <= 4) return 14;
  if (kuld >= 5) return 13;
  return 13; // Mặc định nếu lỗi dữ liệu
}

// --- ISO Week Number ---
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

/**
 * Đánh giá cá thể nái theo chuẩn DanBred/SEGES 2024 (nâng cấp).
 * Elite Prime yêu cầu ≥ 19.5 heo sống/lứa — khắt khe hơn phiên bản cũ.
 *
 * Benchmark nguồn: DanBred Performance Goals 2023-2024
 */
function getSowComment(lev, dod, kuld) {
  const total = lev + dod;
  const sbRate = total > 0 ? (dod / total) * 100 : 0;

  // Chuẩn DanBred 2024 — phân theo parity
  // Nguồn: SEGES Innovation / DanBred Performance Goals
  const BENCHMARKS = {
    1: { poor: 11, ok: 13, good: 15, top: 17, elite: 19.0 }, // Gylte
    2: { poor: 13, ok: 15, good: 17, top: 19, elite: 21.0 }, // 2. kuld
    3: { poor: 14, ok: 16, good: 18, top: 20, elite: 22.0 }, // Prime
    4: { poor: 14, ok: 16, good: 18, top: 20.5, elite: 22.5 }, // Prime peak
    5: { poor: 14, ok: 16, good: 18, top: 20, elite: 22.0 }, // Prime aftagende
    6: { poor: 13, ok: 15, good: 17, top: 19, elite: 21.0 }, // Gammel
    7: { poor: 12, ok: 14, good: 16, top: 18, elite: 19.5 }, // 7+ kuld
  };

  const bm = kuld >= 7 ? BENCHMARKS[7] : (BENCHMARKS[kuld] ?? BENCHMARKS[5]);

  // Score kuldstørrelse (0–5)
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

  // Score thai chết lưu — thấp hơn tốt hơn (0–5)
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

  // Trọng số: Kuldstørrelse 65% + Stillbirth 35%
  const score = levScore * 0.65 + sbScore * 0.35;

  // Override khẩn cấp
  if (sbRate > 25 || dod >= 7) return "🚨 Faringskrise — akut indgriben";

  if (kuld === 1) {
    // Nâng chuẩn Elite Gylte: phải ≥ benchmark.elite (19.0) + SB < 6%
    if (score >= 4.5 && sbRate < 6) return "🌟 Elite gylt — fremragende debut";
    if (score >= 4.0) return "✨ Lovende gylt";
    if (score >= 2.5) return "🆗 Acceptabel gylt";
    if (score >= 1.5) return "⚠️ Svag gylt — opfølgning kuld 2";
    return "❌ Lavtydende gylt — vurdér udsætning";
  }

  if (kuld >= 2 && kuld <= 5) {
    // Nâng chuẩn Elite Prime: score ≥ 4.5 VÀ lev ≥ 19.5 (DanBred 2024)
    if (score >= 4.5 && lev >= 19.5)
      return "💎 Eliteso — avlskandidat (DanBred)";
    if (score >= 3.5) return "🏆 Topydelse";
    if (score >= 2.5) return "✅ God ydelse";
    if (score >= 1.5) return "📉 Under benchmark — tjek fodring/BCS";
    if (score >= 0.5) return "🚨 Lavtydende — intervention påkrævet";
    return "♻️ Udsætning (kritisk)";
  }

  if (kuld >= 6) {
    if (score >= 3.5) return "👑 Udholdende so — behold";
    if (score >= 2.5) return "🆗 Acceptabel — monitorer nøje";
    if (score >= 1.5) return "⏳ Faldende ydelse — planlæg udsætning";
    return "♻️ Udsætning (prioritet høj)";
  }

  return "🆗 OK";
}

/**
 * Logic kê đơn thuốc cho heo con.
 * Bimoxyl LA: kháng sinh prophylaxis theo protocol.
 */
function getMedicinePatFar(kuld, index) {
  if (index < 2) return "Ingen";
  if (kuld >= 2) return "Bimoxyl LA 0.3 ml";
  return "Bimoxyl LA 0.3 ml + Neuton 0.3 ml";
}
const MEDICIN_SO = "Oxytobel 2 ml + Melovem 5 ml";

/**
 * Phân tích nguy cơ MMA (Mastitis-Metritis-Agalactia) cho từng nái.
 * Dựa trên: parity cao + số con nhiều + can thiệp móc thai + sốt.
 *
 * Nguồn: SEGES Innovation - MMA Prevention Guidelines
 * MMA gây thiệt hại trung bình 500-800 DKK/nái (chi phí điều trị + hao hụt sữa)
 *
 * @returns {{ risk: 'high'|'medium'|'low', reasons: string[] }}
 */
function assessMMARisk(row) {
  const kuld = parseInt(row["Kuld"]) || 0;
  const lev = parseInt(row["Levendefødte"]) || 0;
  const dod = parseInt(row["Dødfødte"]) || 0;
  const total = lev + dod;
  // Cột tùy chọn — mặc định 'Nej' nếu không có
  const indgreb = String(row["Indgreb"] || "Nej").toLowerCase();
  const feber = String(row["Feber"] || "Nej").toLowerCase();

  const riskFactors = [];
  let riskScore = 0;

  // Yếu tố 1: Parity cao (≥ 5) — tử cung lớn, co hồi kém
  if (kuld >= 5) {
    riskScore += 2;
    riskFactors.push(`Høj paritet (Kuld ${kuld})`);
  }

  // Yếu tố 2: Tổng số con nhiều (> 17) — kéo dài thời gian đẻ
  if (total > 17) {
    riskScore += 2;
    riskFactors.push(`Stort kuld (${total} total)`);
  }

  // Yếu tố 3: Can thiệp móc thai — chấn thương tử cung tăng nguy cơ viêm
  if (indgreb === "ja" || indgreb === "1" || indgreb === "true") {
    riskScore += 3;
    riskFactors.push("Indgreb ved faring");
  }

  // Yếu tố 4: Sốt sau đẻ — dấu hiệu nhiễm trùng rõ ràng nhất
  if (feber === "ja" || feber === "1" || feber === "true") {
    riskScore += 4;
    riskFactors.push("Feber registreret");
  }

  // Yếu tố 5: Thai chết lưu nhiều (> 3) — quá trình đẻ kéo dài
  if (dod > 3) {
    riskScore += 1;
    riskFactors.push(`${dod} dødfødte (lang faring)`);
  }

  const risk = riskScore >= 6 ? "high" : riskScore >= 3 ? "medium" : "low";

  return { risk, riskScore, reasons: riskFactors };
}

/**
 * Đánh giá cảnh báo kháng sinh "Gult Kort" (Thẻ Vàng).
 * Dựa trên tổng liều Bimoxyl trong tuần.
 * Nếu vượt ngưỡng, ghi chú cảnh báo để quản lý xem xét.
 *
 * Nền tảng pháp lý: Bekendtgørelse om dyrlægers anvendelse og udlevering
 * af lægemidler til dyr (BEK nr 325 af 23/03/2021)
 */
function assessAntibioticAlert(weekData) {
  let bimoxylCount = 0;
  let mmaHighRiskCount = 0;

  weekData.forEach((row) => {
    if (row._medicinPat && row._medicinPat.includes("Bimoxyl")) bimoxylCount++;
    if (row._mmaRisk && row._mmaRisk.risk === "high") mmaHighRiskCount++;
  });

  const alerts = [];

  if (bimoxylCount >= CONFIG.ZOO.BIMOXYL_WEEKLY_ALERT) {
    alerts.push({
      level: "🟡 GULT KORT",
      msg:
        `Antibiotikaforbrug: **${bimoxylCount} doser Bimoxyl LA** denne uge ` +
        `(Grænse: ${CONFIG.ZOO.BIMOXYL_WEEKLY_ALERT}). ` +
        `Kontakt dyrlæge for gennemgang af behandlingsprotokol.`,
    });
  }

  const interventionRate =
    weekData.length > 0 ? mmaHighRiskCount / weekData.length : 0;
  if (interventionRate > CONFIG.ZOO.MMA_INTERVENTION_RATE) {
    alerts.push({
      level: "🔴 MMA ALARM",
      msg:
        `${mmaHighRiskCount} søer med høj MMA-risiko (${(interventionRate * 100).toFixed(0)}% af ugens faringer). ` +
        `Intensiver tilsyn: rektal temperaturmåling 12-24 timer post partum. ` +
        `Overvej profylaktisk Oxytocin-protokol.`,
    });
  }

  return { bimoxylCount, mmaHighRiskCount, alerts };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 4 — UI GENERATION (Markdown / SVG / Reports)    ║
// ╚══════════════════════════════════════════════════════════╝

const DANISH_DAYS = [
  "Søndag",
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
];

// --- Helpers ---
function dd(date) {
  return (
    `${String(date.getDate()).padStart(2, "0")}.` +
    `${String(date.getMonth() + 1).padStart(2, "0")}.` +
    `${date.getFullYear()}`
  );
}

function calcStillbirthRate(lev, dod) {
  const total = lev + dod;
  return total > 0 ? (dod / total) * 100 : 0;
}

function calcStdDev(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Tính hệ số hồi quy tuyến tính (OLS) cho trendline.
 * Trả về { slope, intercept } để vẽ đường xu hướng.
 */
function calcLinearRegression(yValues) {
  const n = yValues.length;
  if (n < 2) return { slope: 0, intercept: yValues[0] ?? 0 };
  const xMean = (n - 1) / 2;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  yValues.forEach((y, i) => {
    num += (i - xMean) * (y - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/**
 * Tính "Krævet Gennemsnit" — chỉ số kỳ vọng trung bình cần đạt
 * cho các tuần còn lại trong năm để tổng trung bình cả năm = goal.
 *
 * Công thức (đại số đơn giản):
 *   goal = (sumHidtil + krævet × ugerTilbage) / totalUger
 *   => krævet = (goal × totalUger - sumHidtil) / ugerTilbage
 *
 * Trả về null nếu không còn tuần nào (đã đủ 52 tuần) hoặc
 * nếu năm chưa đủ dữ liệu để tính có nghĩa.
 *
 * @param {number[]} values       - Mảng giá trị thực tế các tuần đã có
 * @param {number}   goal         - KPI mục tiêu cần đạt cuối năm
 * @param {number}   totalUger    - Tổng số tuần trong năm (thường 52)
 * @returns {number|null}
 */
function calcKrævetGennemsnit(values, goal, totalUger = 52) {
  const ugerKørt = values.length;
  const ugerTilbage = totalUger - ugerKørt;

  // Không còn tuần nào để cải thiện — trả về null
  if (ugerTilbage <= 0) return null;

  const sumHidtil = values.reduce((a, b) => a + b, 0);
  const krævet = (goal * totalUger - sumHidtil) / ugerTilbage;

  // Trả về null nếu giá trị vô lý (âm hoặc quá lớn gấp 3 goal)
  if (krævet < 0 || krævet > goal * 3) return null;

  return krævet;
}

function formatStatus(val, goal, isHigherBetter = true) {
  const diff = Math.abs(val - goal).toFixed(1);
  if (isHigherBetter)
    return val >= goal ? `🟢 Nået (+${diff})` : `🔴 Lavt (-${diff})`;
  else return val <= goal ? `🟢 Nået (-${diff})` : `🔴 Højt (+${diff})`;
}

/**
 * SVG Bar Chart nâng cấp:
 * - Trendline hồi quy tuyến tính (màu cam)
 * - Đường trung bình (xám)
 * - Đường KPI Goal (xanh dương, nếu có)
 * - Đường Krævet Gennemsnit (tím) — kỳ vọng cần đạt để cứu trung bình cả năm
 * - Chú giải (Legend) rõ ràng ở dưới
 * - Màu cột thông minh: xanh/vàng/đỏ
 *
 * @param {number|null} krævetVal  - Giá trị "Krævet Gennemsnit" từ calcKrævetGennemsnit()
 *                                   null = không hiển thị đường này (đã đủ 52 tuần)
 */
/**
 * SVG Bar Chart – PHIÊN BẢN NÂNG CẤP UI (thoáng, sạch, không dính chữ)
 */
/**
 * SVG Bar Chart – PHIÊN BẢN NÂNG CẤP UI + TÍNH TOÁN THÔNG MINH NHÃN ĐƯỜNG
 * - Nhãn bên phải (Krævet) được giữ nguyên
 * - Tự động chống chồng chéo nhãn trên cùng một bên (left/right)
 */
/**
 * SVG Bar Chart – PHIÊN BẢN NÂNG CẤP UI + TÍNH TOÁN THÔNG MINH NHÃN ĐƯỜNG
 * - Nhãn bên phải (Krævet) được giữ nguyên
 * - Tự động chống chồng chéo nhãn trên cùng một bên (left/right)
 */
function generateSvgBarChart(
  historyData,
  valueKey,
  isLowerBetter = false,
  isPercent = false,
  kpiGoal = null,
  krævetVal = null,
) {
  if (!historyData || historyData.length === 0) return "";

  const n = historyData.length;
  // Tự động phân loại thiết kế: trên 26 tuần (nửa năm) sẽ chuyển sang chế độ Compact (như 52 tuần)
  const isCompact = n > 26;

  const values = historyData.map((h) => h[valueKey]);

  const exactMax = Math.max(...values);
  const exactMin = Math.min(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / n;

  // ==================== THUẬT TOÁN "NICE SCALE" ====================
  // Tự động thích ứng bước nhảy (0.1, 0.2, 0.5, 1, 2, 5...) dựa vào dải dữ liệu
  let rangeRaw = exactMax - exactMin;
  if (rangeRaw === 0)
    rangeRaw = Math.abs(exactMax) > 0 ? Math.abs(exactMax) * 0.2 : 10;

  // Tính toán bước nhảy thô (Dự kiến mật độ 8 khoảng để lưới dày như yêu cầu)
  const targetIntervals = 8;
  const roughStep = rangeRaw / targetIntervals;

  // Tìm Magnitude (Độ lớn: 0.01, 0.1, 1, 10...)
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const relStep = roughStep / mag;

  // Ép về các bước nhảy "chẵn" tiêu chuẩn
  let niceRelStep;
  if (relStep < 1.5) niceRelStep = 1;
  else if (relStep < 3.5) niceRelStep = 2;
  else if (relStep < 7.5) niceRelStep = 5;
  else niceRelStep = 10;

  let step = niceRelStep * mag;
  step = parseFloat(step.toPrecision(12)); // Tránh lỗi float point của JS

  // Mở rộng mốc trên dưới để tạo khoảng "thở" (Padding)
  let yMin = Math.floor(exactMin / step) * step;
  let yMax = Math.ceil(exactMax / step) * step;

  if (yMin >= exactMin - step * 0.5) yMin -= step;
  if (yMax <= exactMax + step * 0.5) yMax += step;

  // Mở rộng thêm nếu có KPI hoặc Krævet nằm ngoài biên
  if (kpiGoal !== null) {
    if (yMin > kpiGoal) yMin = Math.floor(kpiGoal / step) * step - step;
    if (yMax < kpiGoal) yMax = Math.ceil(kpiGoal / step) * step + step;
  }
  if (krævetVal !== null) {
    if (yMin > krævetVal) yMin = Math.floor(krævetVal / step) * step - step;
    if (yMax < krævetVal) yMax = Math.ceil(krævetVal / step) * step + step;
  }

  yMin = parseFloat(yMin.toPrecision(12));
  yMax = parseFloat(yMax.toPrecision(12));

  // Tổng số lượng đường Grid sẽ vẽ
  const numIntervals = Math.round((yMax - yMin) / step);
  const range = yMax - yMin;

  // Xác định số lượng chữ số thập phân cần hiển thị của Grid
  const getDecimals = (n) => {
    if (Math.floor(n) === n) return 0;
    return n.toString().split(".")[1]?.length || 0;
  };
  const decCount = getDecimals(step);

  // ==================== BỐ CỤC FIX VIEWPORT 100% ====================
  const SVG_W = 920;
  const MARGIN_L = 85;
  const MARGIN_R = 120;
  const MARGIN_T = 45;
  const MARGIN_B = 60;

  const CHART_H = 320;
  const CHART_W = SVG_W - MARGIN_L - MARGIN_R;
  const SVG_H = MARGIN_T + CHART_H + MARGIN_B;

  const slotW = CHART_W / n;
  const BAR_W = isCompact ? 5 : 8;

  const toY = (v) =>
    MARGIN_T + CHART_H - ((v - yMin) / (yMax - yMin)) * CHART_H;

  const getX = (idx) => MARGIN_L + idx * slotW + slotW / 2;

  const { slope, intercept } = calcLinearRegression(values);
  const trendY0 = toY(intercept);
  const trendY1 = toY(intercept + slope * (n - 1));
  const xFirst = getX(0);
  const xLast = getX(n - 1);

  // ==================== CHIA LAYER SVG (Z-INDEX) ====================
  let svgGrid = "";
  let svgBars = "";
  let svgLines = "";
  let svgLabels = "";
  let svgLegend = "";

  let svgCore =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" ` +
    `width="100%" height="auto" style="font-family:system-ui,-apple-system,sans-serif;display:block;overflow:visible;">`;

  // --- LAYER 1: Lưới Nền (Grid & Baseline) ---
  for (let i = 0; i <= numIntervals; i++) {
    const gridY = MARGIN_T + (CHART_H * i) / numIntervals;
    let gridVal = yMax - i * step;
    gridVal = parseFloat(gridVal.toPrecision(12));

    // Tự động format số chữ số thập phân tương ứng với bước nhảy
    let dispGridVal = gridVal.toFixed(decCount);
    if (isPercent) dispGridVal += "%";

    svgGrid += `<line x1="${MARGIN_L}" y1="${gridY}" x2="${MARGIN_L + CHART_W}" y2="${gridY}" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,4"/>`;
    // Giảm font-size từ 10.5 xuống 9 và điều chỉnh nhẹ y để căn giữa lưới
    svgGrid += `<text x="${MARGIN_L + CHART_W + 8}" y="${gridY + 3.5}" font-size="5" fill="#94a3b8" font-weight="600" text-anchor="start">${dispGridVal}</text>`;
  }

  // Trục Zero (hoặc baseline thấp nhất)
  let baselineY = toY(0);
  if (baselineY > MARGIN_T + CHART_H || yMin >= 0)
    baselineY = MARGIN_T + CHART_H;
  svgGrid += `<line x1="${MARGIN_L}" y1="${baselineY}" x2="${MARGIN_L + CHART_W}" y2="${baselineY}" stroke="#94a3b8" stroke-width="2"/>`;

  // --- LAYER 2: Cột (Được vẽ trước Line để nằm dưới Line) ---
  historyData.forEach((h, idx) => {
    const val = h[valueKey];
    const xCenter = getX(idx);
    const xRect = xCenter - BAR_W / 2;
    const yVal = toY(val);

    let barH, y;
    if (val >= 0) {
      barH = Math.max(4, baselineY - yVal);
      y = baselineY - barH;
    } else {
      barH = Math.max(4, yVal - baselineY);
      y = baselineY;
    }

    const margin = range * 0.12;
    const isGood = isLowerBetter
      ? val <= avgVal - margin
      : val >= avgVal + margin;
    const isBad = isLowerBetter
      ? val >= avgVal + margin
      : val <= avgVal - margin;
    const isCurrent = idx === n - 1;

    let color = isCurrent
      ? isGood
        ? "#00E396"
        : isBad
          ? "#FF4560"
          : "#FEB019"
      : isGood
        ? "#69F0AE"
        : isBad
          ? "#FF8A80"
          : "#FFE57F";

    const dispVal = isPercent
      ? val.toFixed(1) + "%"
      : Number.isInteger(val)
        ? val
        : val.toFixed(1);

    svgBars += `<rect x="${xRect}" y="${y}" width="${BAR_W}" height="${barH}" rx="0.5" fill="${color}" stroke="${color}" stroke-width="0.5" opacity="0.95"/>`;

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

  // --- LAYER 3: Các Đường (Được vẽ sau Cột để đè lên Cột) ---
  const leftLabelsData = [];
  const rightLabelsData = [];

  let krColor = "#9333ea";
  if (krævetVal !== null) {
    const isStricter = isLowerBetter
      ? krævetVal < (kpiGoal ?? krævetVal)
      : krævetVal > (kpiGoal ?? krævetVal);
    krColor = isStricter ? "#FF3366" : "#9333ea";
  }

  if (kpiGoal !== null) {
    const ky = toY(kpiGoal);
    svgLines += `<line x1="${MARGIN_L}" y1="${ky}" x2="${MARGIN_L + CHART_W}" y2="${ky}" stroke="#008FFB" stroke-width="2" stroke-dasharray="6,4" opacity="0.85"/>`;
    leftLabelsData.push({
      y: ky,
      text: `Mål: ${isPercent ? kpiGoal.toFixed(1) + "%" : kpiGoal}`,
      color: "#008FFB",
    });
  }

  const avgY = toY(avgVal);
  svgLines += `<line x1="${MARGIN_L}" y1="${avgY}" x2="${MARGIN_L + CHART_W}" y2="${avgY}" stroke="#546E7A" stroke-width="2" stroke-dasharray="3,3" opacity="0.7"/>`;
  leftLabelsData.push({
    y: avgY,
    text: `Gns: ${isPercent ? avgVal.toFixed(1) + "%" : avgVal.toFixed(1)}`,
    color: "#546E7A",
  });

  if (krævetVal !== null) {
    const krY = toY(krævetVal);
    svgLines += `<line x1="${MARGIN_L}" y1="${krY}" x2="${MARGIN_L + CHART_W}" y2="${krY}" stroke="${krColor}" stroke-width="2" stroke-dasharray="8,4" opacity="0.85"/>`;
    rightLabelsData.push({
      y: krY,
      text: `Krævet: ${isPercent ? krævetVal.toFixed(1) + "%" : krævetVal.toFixed(1)}`,
      color: krColor,
    });
  }

  const trendIsGood = isLowerBetter ? slope <= 0 : slope >= 0;
  const trendColor =
    Math.abs(slope) < 0.05 ? "#A8B2C1" : trendIsGood ? "#00E396" : "#FF4560";
  svgLines += `<line x1="${xFirst}" y1="${trendY0}" x2="${xLast}" y2="${trendY1}" stroke="${trendColor}" stroke-width="3" opacity="0.9"/>`;

  const dx = xLast - xFirst,
    dy = trendY1 - trendY0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  const arrowX = xLast - ux * 9,
    arrowY = trendY1 - uy * 9;
  svgLines += `<polygon points="${xLast},${trendY1} ${arrowX - uy * 5},${arrowY + ux * 5} ${arrowX + uy * 5},${arrowY - ux * 5}" fill="${trendColor}" opacity="0.9"/>`;

  // --- LAYER 4: Xử lý Overlap Nhãn Chữ (Vẽ cuối cùng để nổi bật) ---
  const MIN_SPACING = 24;
  const resolveMarginOverlap = (labels) => {
    if (labels.length <= 1) return labels;
    labels.sort((a, b) => a.y - b.y);
    let attempts = 0;
    let isOverlapping = true;
    while (isOverlapping && attempts < 10) {
      isOverlapping = false;
      for (let i = 0; i < labels.length - 1; i++) {
        const diff = labels[i + 1].y - labels[i].y;
        if (diff < MIN_SPACING) {
          isOverlapping = true;
          const offset = (MIN_SPACING - diff) / 2;
          labels[i].y -= offset;
          labels[i + 1].y += offset;
        }
      }
      attempts++;
    }
  };

  resolveMarginOverlap(leftLabelsData);
  resolveMarginOverlap(rightLabelsData);

  leftLabelsData.forEach((l) => {
    svgLabels += `<text x="${MARGIN_L - 12}" y="${l.y + 4}" font-size="12" fill="${l.color}" text-anchor="end" font-weight="700">${l.text}</text>`;
  });

  rightLabelsData.forEach((l) => {
    svgLabels += `<text x="${MARGIN_L + CHART_W + 46}" y="${l.y + 4}" font-size="12" fill="${l.color}" text-anchor="start" font-weight="700" stroke="#ffffff" stroke-width="3" paint-order="stroke fill">${l.text}</text>`;
  });

  // --- LAYER 5: Legend (Chú thích) ---
  const legendY = SVG_H - 12;
  const legendItems = [
    { color: "#008FFB", dash: true, label: "Mål" },
    { color: "#546E7A", dash: true, label: "Gennemsnit" },
    { color: trendColor, dash: false, label: "Trend" },
  ];
  if (krævetVal !== null) {
    legendItems.push({ color: krColor, dash: true, label: "Krævet" });
  }

  const totalLegendW = legendItems.reduce(
    (acc, item) => acc + item.label.length * 8 + 36,
    0,
  );
  let lx = (SVG_W - totalLegendW) / 2;

  legendItems.forEach((item) => {
    if (item.dash) {
      svgLegend += `<line x1="${lx}" y1="${legendY - 4}" x2="${lx + 18}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="2.5" stroke-dasharray="4,3"/>`;
    } else {
      svgLegend += `<line x1="${lx}" y1="${legendY - 4}" x2="${lx + 18}" y2="${legendY - 4}" stroke="${item.color}" stroke-width="3"/>`;
    }
    svgLegend += `<text x="${lx + 24}" y="${legendY}" font-size="11.5" fill="#334155" font-weight="600">${item.label}</text>`;
    lx += item.label.length * 8 + 36;
  });

  let svg =
    svgCore + svgGrid + svgBars + svgLines + svgLabels + svgLegend + `</svg>`;

  return (
    `<div style="width:100%;box-sizing:border-box;background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:24px 16px;margin:16px 0;box-shadow:0 10px 15px -3px rgba(0,0,0,.08), 0 4px 6px -2px rgba(0,0,0,.04);">` +
    svg +
    `</div>`
  );
}

/**
 * Executive Summary — Dành cho chủ trại / ban giám đốc.
 * Ngôn ngữ quản trị, tập trung vào DKK và cơ hội bị mất.
 *
 * Công thức: Số heo con hao hụt = (KPI_levende - actual_levende) * antal_faringer
 * Thiệt hại = hao hụt * PRIS_PER_PATTEGRIS (DKK)
 */
function buildExecutiveSummary(
  weekData,
  wGnsLev,
  wGnsDod,
  wSBRate,
  accFaringer,
  week,
) {
  const { KPI, ZOO } = CONFIG;

  // --- Tính toán kinh tế ---
  const leverandeMissed = Math.max(0, KPI.LEVENDE_PR_KULD - wGnsLev);
  const griseMissed = leverandeMissed * accFaringer;
  const tabDKK = Math.round(griseMissed * ZOO.PRIS_PER_PATTEGRIS);
  const farMissed = Math.max(0, KPI.FARINGER_UGE - accFaringer);
  const farTabDKK = Math.round(
    farMissed * KPI.LEVENDE_PR_KULD * ZOO.PRIS_PER_PATTEGRIS,
  );

  // --- Vurdering af uge ---
  const isGoodWeek =
    wGnsLev >= KPI.LEVENDE_PR_KULD && wSBRate <= KPI.STILLBIRTH_RATE_ALERT;
  const weekIcon = isGoodWeek
    ? "✅"
    : wGnsLev >= KPI.LEVENDE_PR_KULD - 0.5
      ? "🟡"
      : "🔴";

  // MMA-alert i summary
  const { alerts } = assessAntibioticAlert(weekData);

  let md = `\n## 📌 Ledelsesresumé — Uge ${week}\n\n`;
  md += `> **${weekIcon} Overblik for gårdejer/ledelse:** Denne sektion er skrevet til beslutningstagere — ikke til teknikere.\n\n`;

  // Bảng tóm tắt cấp điều hành
  md += `| Nøgletal | Denne uge | KPI | Vurdering |\n`;
  md += `| :--- | :---: | :---: | :--- |\n`;
  md += `| Faringer i alt | **${accFaringer}** | ${KPI.FARINGER_UGE} | ${accFaringer >= KPI.FARINGER_UGE ? "✅ Mål nået" : `⚠️ ${farMissed} under mål`} |\n`;
  md += `| Levende pr. kuld | **${wGnsLev.toFixed(2)}** | ${KPI.LEVENDE_PR_KULD} | ${formatStatus(wGnsLev, KPI.LEVENDE_PR_KULD, true)} |\n`;
  md += `| Stillbirth % | **${wSBRate.toFixed(1)}%** | < ${KPI.STILLBIRTH_RATE_ALERT}% | ${wSBRate <= KPI.STILLBIRTH_RATE_ALERT ? "✅ Under kontrol" : "🔴 Kræver handling"} |\n`;
  md += `| Øk. tab (lev. grise) | **${tabDKK.toLocaleString("da-DK")} DKK** | 0 DKK | ${tabDKK === 0 ? "✅ Ingen tab" : `🔴 Potentiel gevinst`} |\n`;
  if (farMissed > 0) {
    md += `| Øk. tab (manglende far.) | **${farTabDKK.toLocaleString("da-DK")} DKK** | 0 DKK | 🔴 Kapacitetsunderskud |\n`;
  }
  md += `\n`;

  // Narrativ analyse
  if (isGoodWeek) {
    md +=
      `> 🟢 **Stærk uge:** Trangtrommen er nået. Kuldstørrelsen (${wGnsLev.toFixed(1)}) overstiger KPI-målet ` +
      `og stillbirth-raten er under kontrolgrænsen. Fasthold rutiner.\n\n`;
  } else if (tabDKK > 0) {
    md +=
      `> 🔴 **Opmærksomhed:** Denne uge efterlader et potentielt produktionstab på ` +
      `**${tabDKK.toLocaleString("da-DK")} DKK** (${griseMissed.toFixed(0)} grise × ${ZOO.PRIS_PER_PATTEGRIS} DKK). ` +
      `Primær årsag: kuldstørrelse ${wGnsLev.toFixed(1)} vs. mål ${KPI.LEVENDE_PR_KULD}. ` +
      `Tjek BCS-scoring og foderkurver hos søer i fødsel.\n\n`;
  }

  // Kháng sinh & MMA
  if (alerts.length > 0) {
    alerts.forEach((a) => {
      md += `> **${a.level}:** ${a.msg}\n\n`;
    });
  }

  md += `---\n\n`;
  return md;
}

/**
 * Heatmap Lịch đẻ: cho thấy ngày nào / ca nào trong tuần có tỷ lệ tử vong cao nhất.
 * Dùng emoji màu 🔴🟡🟢 để quản lý điều phối nhân sự.
 *
 * Logic màu (SB%):
 *   🔴 > 15% : Kritisk
 *   🟡 8–15% : Forhøjet
 *   🟢 < 8%  : Acceptabel
 */
/**
 * Heatmap Lịch đẻ: cho thấy ngày nào / ca nào trong tuần có tỷ lệ tử vong cao nhất.
 * Tích hợp tính toán số lượng heo Extra (Overskudsgrise) để chuẩn bị nái ghép.
 */
function buildWeeklyHeatmap(daysGroup, sortedDatesAsc) {
  let md = `\n### 📅 Faringskalender — Heatmap (Personaleplanlægning)\n\n`;
  md += `> Farveindikator: 🔴 Kritisk SB% (>15%) | 🟡 Forhøjet (8–15%) | 🟢 OK (<8%)\n\n`;
  md += `| Dag | Dato | Dag-vagt (06-16) | Nat-vagt (16-06) | Faringer | SB% | 🍼 Extra Grise |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  sortedDatesAsc.forEach((dateStr) => {
    const dayData = daysGroup[dateStr];
    const dow = dayData[0]._realDate.getDay();
    const dayName = DANISH_DAYS[dow];

    let dagF = 0,
      dagL = 0,
      dagD = 0;
    let natF = 0,
      natL = 0,
      natD = 0;
    let totL = 0,
      totD = 0,
      totCap = 0;

    dayData.forEach((r) => {
      const lev = parseInt(r["Levendefødte"] || 0);
      const dod = parseInt(r["Dødfødte"] || 0);
      const kuld = parseInt(r["Kuld"]) || 0;
      const shift = getShift(r._realDate);

      totL += lev;
      totD += dod;
      totCap += getSowCapacity(kuld); // Cộng dồn công suất nuôi của ngày

      if (shift.startsWith("Dag")) {
        dagF++;
        dagL += lev;
        dagD += dod;
      } else {
        natF++;
        natL += lev;
        natD += dod;
      }
    });

    const totalF = dagF + natF;
    const sbTotal = calcStillbirthRate(totL, totD);
    const sbIcon = sbTotal > 15 ? "🔴" : sbTotal > 8 ? "🟡" : "🟢";

    // Tính số heo con dư thừa (Extra)
    const extraGrise = totL - totCap;
    const extraDisplay =
      extraGrise > 0 ? `**+${extraGrise}** 🔴` : `${extraGrise} 🟢`; // Số âm nghĩa là đang dư vú nuôi

    const dagCell =
      dagF > 0
        ? `${dagF} far. | SB:${calcStillbirthRate(dagL, dagD).toFixed(0)}%`
        : "—";
    const natCell =
      natF > 0
        ? `${natF} far. | SB:${calcStillbirthRate(natL, natD).toFixed(0)}%`
        : "—";

    md += `| **${dayName}** | ${dateStr} | ${dagCell} | ${natCell} | **${totalF}** | ${sbIcon} ${sbTotal.toFixed(1)}% | ${extraDisplay} |\n`;
  });

  return md + "\n";
}

/**
 * Tóm tắt nái nguy cơ MMA trong ngày
 */
function buildMMAAlertBlock(dayData) {
  const highRisk = dayData.filter(
    (r) => r._mmaRisk && r._mmaRisk.risk === "high",
  );
  const medRisk = dayData.filter(
    (r) => r._mmaRisk && r._mmaRisk.risk === "medium",
  );

  if (highRisk.length === 0 && medRisk.length === 0) return "";

  let md = "";
  if (highRisk.length > 0) {
    md += `> 🏥 **MMA HØJO RISIKO (kræver temp.måling 12h post partum):**<br>\n`;
    highRisk.forEach((r) => {
      md += `> **${r["Sonavn"]}** (Kuld ${r["Kuld"]}) — Risikofaktorer: _${r._mmaRisk.reasons.join(", ")}_<br>\n`;
    });
    md += "\n";
  }
  if (medRisk.length > 0) {
    md += `> ⚠️ **MMA MELLEM RISIKO (monitorér nøje):**<br>\n`;
    medRisk.forEach((r) => {
      md += `> **${r["Sonavn"]}** (Kuld ${r["Kuld"]}) — _${r._mmaRisk.reasons.join(", ")}_<br>\n`;
    });
    md += "\n";
  }
  return md;
}

// --- Phân tích parity ---
function buildParityAnalysis(weekData) {
  const groups = {
    "Gylte (1)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "2. Lægs": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Prime (3-5)": { f: 0, l: 0, d: 0, udsaetning: [] },
    "Gamle (6+)": { f: 0, l: 0, d: 0, udsaetning: [] },
  };
  const { KPI } = CONFIG;

  weekData.forEach((row) => {
    const kuld = parseInt(row["Kuld"]) || 0;
    const lev = parseInt(row["Levendefødte"]) || 0;
    const dod = parseInt(row["Dødfødte"]) || 0;

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
  md += `| Gruppe | Faringer | Lev/kuld | Døde/kuld | SB% | Udsætning Flag |\n`;
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

// --- Dag vs. Nat ---
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
  md += `| Vagt | Faringer | Lev/kuld | Døde/kuld | SB% |\n`;
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

// --- Lokation Heatmap ---
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

  const sorted = Object.entries(lokMap).sort(
    (a, b) =>
      calcStillbirthRate(b[1].l, b[1].d) - calcStillbirthRate(a[1].l, a[1].d),
  );

  let md = `\n### 🗺️ Lokation Heatmap\n\n`;
  md += `| Sektion | Faringer | Lev/kuld | Døde/kuld | SB% | Status |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  sorted.forEach(([lok, g]) => {
    const avgL = (g.l / g.f).toFixed(1);
    const avgD = (g.d / g.f).toFixed(1);
    const sbRate = calcStillbirthRate(g.l, g.d);
    const { KPI } = CONFIG;
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

// --- OBS-søer ---
function getObsSoer(dayData) {
  const obs = [];
  const { KPI } = CONFIG;

  dayData.forEach((r) => {
    const lev = parseInt(r["Levendefødte"] || 0);
    const dod = parseInt(r["Dødfødte"] || 0);
    const kuld = parseInt(r["Kuld"]) || 0;
    const sbRate = calcStillbirthRate(lev, dod);

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

    // Thêm cảnh báo thai gỗ nếu có dữ liệu
    const mumif = parseInt(r["Mumificerede"] || 0);
    if (mumif > 0) reasons.push(`Thai gỗ: ${mumif}`);

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
//  PHÂN TÍCH CHUYÊN GIA ZOOTEKNISK (ENTERPRISE BI — Årsrapport)
// ============================================================
function buildEnterpriseTrendAnalysis(yearData, weeksProcessed) {
  if (weeksProcessed.length < 2) {
    return "> *⏳ Der er ikke nok data endnu til den avancerede trendanalyse (kræver min. 2 uger).*\n\n";
  }

  const { KPI } = CONFIG;
  const sortedWeeks = [...weeksProcessed].sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  const history = [];
  let totalL_year = 0,
    totalD_year = 0,
    totalF_year = 0;

  sortedWeeks.forEach((w) => {
    const weekRows = yearData[w];
    let f = weekRows.length,
      l = 0,
      d = 0;
    let l_kuld1 = 0,
      f_kuld1 = 0;
    let l_kuld2 = 0,
      f_kuld2 = 0;
    let f_gammel = 0,
      d_gammel = 0,
      l_gammel = 0;
    let l_dag = 0,
      d_dag = 0,
      l_nat = 0,
      d_nat = 0;
    let levendeArray = [];
    let mumifTotal = 0;

    weekRows.forEach((row) => {
      const lev = parseInt(row["Levendefødte"] || 0);
      const dod = parseInt(row["Dødfødte"] || 0);
      const kuld = parseInt(row["Kuld"]) || 0;
      const shift = getShift(row._realDate);
      const mumif = parseInt(row["Mumificerede"] || 0);

      l += lev;
      d += dod;
      mumifTotal += mumif;
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
      mumifPrKuld: f > 0 ? mumifTotal / f : 0,
    });
  });

  const yrAvgL = totalF_year > 0 ? totalL_year / totalF_year : 0;
  const yrSB =
    totalL_year + totalD_year > 0
      ? (totalD_year / (totalL_year + totalD_year)) * 100
      : 0;

  const current = history[history.length - 1];
  const last4 = history.slice(-4);

  // Biểu đồ
  // Tính Krævet Gennemsnit cho từng chỉ số — truyền vào chart để vẽ đường tím
  // Năm Đan Mạch có 52 tuần ISO (đôi khi 53, nhưng 52 là chuẩn lập kế hoạch SEGES)
  const TOTAL_UGER_AAR = 52;
  const krævetF = calcKrævetGennemsnit(
    history.map((h) => h.f),
    KPI.FARINGER_UGE,
    TOTAL_UGER_AAR,
  );
  const krævetL = calcKrævetGennemsnit(
    history.map((h) => h.avgL),
    KPI.LEVENDE_PR_KULD,
    TOTAL_UGER_AAR,
  );
  const krævetSB = calcKrævetGennemsnit(
    history.map((h) => h.sb),
    KPI.STILLBIRTH_RATE_ALERT,
    TOTAL_UGER_AAR,
  );

  const chartF = generateSvgBarChart(
    history,
    "f",
    false,
    false,
    KPI.FARINGER_UGE,
    krævetF,
  );
  const chartL = generateSvgBarChart(
    history,
    "avgL",
    false,
    false,
    KPI.LEVENDE_PR_KULD,
    krævetL,
  );
  const chartSB = generateSvgBarChart(
    history,
    "sb",
    true,
    true,
    KPI.STILLBIRTH_RATE_ALERT,
    krævetSB,
  );

  let md = `\n## 🧠 Zooteknisk Ekspertanalyse\n\n`;
  md += `> **OVERBLIK:** Avanceret produktionsanalyse (${history.length} uger) — DanBred/SEGES standard.\n\n`;

  // --- 1. Produktionsflow ---
  md += `\n### 1. 📈 Produktionsflow & Ydelse\n\n`;
  md += `**Faringer pr. uge** (Seneste: **${current.f}** | Mål: ${KPI.FARINGER_UGE})\n`;
  md += `${chartF}\n\n`;
  md += `**Levende pr. kuld** (Seneste: **${current.avgL.toFixed(1)}** | Årsgns: ${yrAvgL.toFixed(1)})\n`;
  md += `${chartL}\n\n`;

  // Kommentar til Krævet Gennemsnit — forklarer den lilla linje til ledelsen
  if (krævetL !== null) {
    const ugerKørt = history.length;
    const ugerTilbage = 52 - ugerKørt;
    const gapVsGoal = krævetL - KPI.LEVENDE_PR_KULD;
    if (gapVsGoal > 0.5) {
      md +=
        `> 🟣 **Krævet gns. (lilla linje): ${krævetL.toFixed(2)} lev./kuld** — ` +
        `Efterslæbet kræver, at de resterende **${ugerTilbage} uger** leverer ` +
        `**${gapVsGoal.toFixed(1)} over KPI-målet** for at nå årsgennemsnittet. ` +
        `Intensiver faringshjælp og BCS-kontrol nu.\n\n`;
    } else if (gapVsGoal < -0.5) {
      md +=
        `> 🟣 **Krævet gns. (lilla linje): ${krævetL.toFixed(2)} lev./kuld** — ` +
        `Besætningen er foran planen. De resterende **${ugerTilbage} uger** må falde til ` +
        `**${Math.abs(gapVsGoal).toFixed(1)} under KPI** og stadig nå årsmålet. God buffer.\n\n`;
    } else {
      md +=
        `> 🟣 **Krævet gns. (lilla linje): ${krævetL.toFixed(2)} lev./kuld** — ` +
        `Besætningen er præcis på sporet. Fasthold nuværende rutiner de næste ${ugerTilbage} uger.\n\n`;
    }
  }

  // Trend-kommentar
  const { slope: slopeL } = calcLinearRegression(history.map((h) => h.avgL));
  if (slopeL > 0.1)
    md += `> 🟢 **Positiv Trend:** Kuldstørrelsen stiger (${slopeL > 0 ? "+" : ""}${slopeL.toFixed(2)} grise/uge). Fasthold.\n\n`;
  else if (slopeL < -0.1)
    md += `> 🔴 **Negativ Trend:** Kuldstørrelsen falder (${slopeL.toFixed(2)} grise/uge). Tjek BCS og foderkurver akut.\n\n`;

  if (current.stdDev > 3.5) {
    md +=
      `> ⚠️ **Høj Spredning (σ=${current.stdDev.toFixed(1)}):** Ustabilitet i kuldstørrelse. ` +
      `Indikerer problemer med brunstregistrering, semenhåndtering eller fodring.\n\n`;
  }

  // Thai gỗ (Mumificerede)
  if (current.mumifPrKuld > CONFIG.ZOO.MUMIFIED_ALERT_PER_KULD) {
    md +=
      `> 🧩 **Thai Gỗ Advarsel:** ${current.mumifPrKuld.toFixed(2)} mumificerede/kuld ` +
      `(Grænse: ${CONFIG.ZOO.MUMIFIED_ALERT_PER_KULD}). ` +
      `Mulige årsager: PRRS, PCV2 eller parvovirus. Kontakt dyrlæge.\n\n`;
  }

  // --- 2. Faringsovervågning ---
  md += `\n### 2. 🏥 Faringsovervågning\n\n`;
  md += `**Stillbirth % Trend** (Seneste: **${current.sb.toFixed(1)}%** | Årsgns: ${yrSB.toFixed(1)}%)\n`;
  md += `${chartSB}\n\n`;

  if (current.sb > KPI.STILLBIRTH_RATE_ALERT && current.sb > yrSB + 1) {
    md += `> 🚨 **Kritisk SB-stigning:** Øg faringshjælp. Tjek for feber og MMA-symptomer.\n\n`;
  } else if (current.sb < yrSB - 1) {
    md += `> 🌟 **Fremragende SB-kontrol:** Stærke overvågningsrutiner!\n\n`;
  }

  const avgDagSB = last4.reduce((s, h) => s + h.sbDag, 0) / last4.length;
  const avgNatSB = last4.reduce((s, h) => s + h.sbNat, 0) / last4.length;
  if (avgNatSB > avgDagSB + 3) {
    md +=
      `> 🌙 **Nattevagt Problem:** SB nat (${avgNatSB.toFixed(1)}%) > dag (${avgDagSB.toFixed(1)}%). ` +
      `Overvej ekstra tilsyn kl. 22–02.\n\n`;
  }

  // --- 3. Cellediagnostik ---
  md += `\n### 3. 🧬 Besætningsdiagnostik\n\n`;

  let dropCount = 0;
  last4.forEach((h) => {
    if (h.avgL1 !== null && h.avgL2 !== null && h.avgL2 < h.avgL1 - 1.0)
      dropCount++;
  });
  if (dropCount >= 3) {
    md += `> 🚨 **Kronisk 2. Lægs Dyk:** 2. kuld underpræsterer. Øg foderstyrken for gylte i diegivning.\n\n`;
  }

  const avgGammelPct =
    last4.reduce((s, h) => s + h.pctGammel, 0) / last4.length;
  const avgGammelSB = last4.reduce((s, h) => s + h.sbGammel, 0) / last4.length;
  if (avgGammelPct > 20 && avgGammelSB > KPI.STILLBIRTH_RATE_ALERT) {
    md +=
      `> ♻️ **Herd Burnout:** Gamle søer udgør ${avgGammelPct.toFixed(0)}% med høj SB (${avgGammelSB.toFixed(1)}%). ` +
      `Øg udsætningsraten — mål < 15% Kuld 6+.\n\n`;
  }

  md += `---\n\n`;
  return md;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BLOCK 5 — MAIN ORCHESTRATOR                           ║
// ╚══════════════════════════════════════════════════════════╝
function main() {
  const { INPUT_DIR, OUTPUT_DIR, KPI } = CONFIG;

  // Setup mapper
  if (!fs.existsSync(INPUT_DIR)) fs.mkdirSync(INPUT_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find Excel-fil
  const files = fs.readdirSync(INPUT_DIR);
  const excelFile = files.find(
    (f) => f.endsWith(".xlsx") || f.endsWith(".xls"),
  );
  if (!excelFile) {
    console.error("❌ Ingen Excel-fil (.xlsx/.xls) fundet i 'input' mappen.");
    return;
  }

  console.log(`⏳ Behandler fil: ${excelFile}...`);
  const inputFilePath = path.join(INPUT_DIR, excelFile);

  // --- BLOCK 2: Læs & validér data ---
  const { data: rawData, missingOptional } = readExcelData(inputFilePath);
  const hasMumif = !missingOptional.includes("Mumificerede");
  const hasIndgreb = !missingOptional.includes("Indgreb");
  const hasFeber = !missingOptional.includes("Feber");

  const validData = rawData.filter((r) => r["Oprettet den"] && r["Sonavn"]);
  console.log(`📋 ${validData.length} gyldige rækker fundet.`);

  // --- BLOCK 2: Gruppér data ---
  const grouped = processAndGroupData(validData);

  // ── Per-år loop ─────────────────────────────────────────────
  for (const year of Object.keys(grouped)) {
    const yearFolder = path.join(OUTPUT_DIR, year);
    if (!fs.existsSync(yearFolder))
      fs.mkdirSync(yearFolder, { recursive: true });

    const summaryMatrix = {};
    const weeksProcessedInYear = [];

    // ── Per-uge loop ───────────────────────────────────────────
    for (const week of Object.keys(grouped[year])) {
      let weekData = grouped[year][week];
      weekData.sort((a, b) => a._realDate - b._realDate);

      // Initialisér summaryMatrix
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

      // --- Gån medicin & MMA risk på hver row ---
      weekData.forEach((row, index) => {
        row._medicinPat = getMedicinePatFar(parseInt(row["Kuld"]) || 0, index);
        row._medicinSo = MEDICIN_SO;
        row._mmaRisk = assessMMARisk(row);
      });

      // Gruppér per dag
      const daysGroup = {};
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

      // Akkumulér ugetal
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
          const lev = parseInt(r["Levendefødte"]) || 0;
          const dod = parseInt(r["Dødfødte"]) || 0;

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

      // ══════════════════════════════════════════════════════════
      //  BYGG MARKDOWN-RAPPORT
      // ══════════════════════════════════════════════════════════
      let md = `\n# Uge ${week} — Farings Manager BI\n\n`;
      md += `> **Periode:** ${startStr} – ${endStr} | **Genereret:** ${new Date().toLocaleDateString("da-DK")}\n\n`;

      // ── Executive Summary (Chủ trại) ──────────────────────────
      md += buildExecutiveSummary(
        weekData,
        wGnsLev,
        wGnsDod,
        wSBRate,
        accFaringer,
        week,
      );

      // ── KPI Dashboard ─────────────────────────────────────────
      md += `\n## 🏆 KPI Dashboard\n\n`;
      md += `| Indikator | Mål | Resultat | Status |\n`;
      md += `| :--- | :---: | :---: | :--- |\n`;
      md += `| **Faringer** | ${KPI.FARINGER_UGE} | **${accFaringer}** | ${accFaringer >= KPI.FARINGER_UGE ? "🟢 Nået" : `🔴 Mangler ${KPI.FARINGER_UGE - accFaringer}`} |\n`;
      md += `| **Levende/kuld** | ${KPI.LEVENDE_PR_KULD} | **${wGnsLev.toFixed(1)}** | ${formatStatus(wGnsLev, KPI.LEVENDE_PR_KULD, true)} |\n`;
      md += `| **Gylte Levende** | ${KPI.LEVENDE_GYLTE_PR_KULD} | **${wGnsGylte.toFixed(1)}** | ${accFaringerGylte > 0 ? formatStatus(wGnsGylte, KPI.LEVENDE_GYLTE_PR_KULD, true) : "—"} |\n`;
      md += `| **Dødfødte/kuld** | ≤ ${KPI.DODFODTE_PR_KULD} | **${wGnsDod.toFixed(1)}** | ${formatStatus(wGnsDod, KPI.DODFODTE_PR_KULD, false)} |\n`;
      md += `| **Stillbirth %** | < ${KPI.STILLBIRTH_RATE_ALERT}% | **${wSBRate.toFixed(1)}%** | ${wSBRate <= KPI.STILLBIRTH_RATE_ALERT ? "🟢 OK" : "🔴 Kritisk"} |\n\n`;

      md += `---\n\n`;
      md += `\n## 📊 Ugens Fordeling\n\n`;
      md += buildParityAnalysis(weekData);
      md += buildShiftAnalysis(weekData);
      md += buildLokationHeatmap(weekData);

      // ── Heatmap faringskalender ────────────────────────────────
      md += buildWeeklyHeatmap(daysGroup, sortedDatesAsc);
      md += `---\n\n`;

      // ── Daglig faringsovervågning ──────────────────────────────
      md += `\n## 📅 Daglig Faringsovervågning\n\n`;

      sortedDatesAsc.forEach((dateStr) => {
        const dayData = daysGroup[dateStr];
        dayData.sort((a, b) => a._realDate - b._realDate);
        const dayOfWeekIndex = dayData[0]._realDate.getDay();
        const dayName = DANISH_DAYS[dayOfWeekIndex];

        md += `\n### ${dayName}, ${dateStr}\n\n`;

        // === NEW LOGIC: Tính toán Extra heo con mỗi ngày ===
        let dagligKapacitet = 0;
        let dagligLevende = 0;

        dayData.forEach((r) => {
          const kuld = parseInt(r["Kuld"]) || 0;
          const lev = parseInt(r["Levendefødte"]) || 0;
          dagligKapacitet += getSowCapacity(kuld);
          dagligLevende += lev;
        });

        const extraGrise = dagligLevende - dagligKapacitet;

        if (extraGrise > 0) {
          md += `> 🍼 **OVERSKUDSGRISE (EXTRA): +${extraGrise} grise**<br>\n`;
          md += `> _Kapacitet i dag: ${dagligKapacitet} grise | Født levende: ${dagligLevende} grise._ Kræver oprettelse af ammesøer (nurse sows)!\n\n`;
        } else {
          md += `> 🟢 **OVERSKUDSGRISE: Ingen (+0)**<br>\n`;
          md += `> _Kapacitet i dag: ${dagligKapacitet} grise | Født levende: ${dagligLevende} grise._ Der er **${Math.abs(extraGrise)} ledige patter** til at modtage grise fra andre sektioner.\n\n`;
        }
        // === END NEW LOGIC ===

        const obsSoer = getObsSoer(dayData);
        const topSoer = dayData.filter(
          (r) =>
            parseInt(r["Levendefødte"] || 0) >= KPI.TOP_SO_LEVENDE &&
            parseInt(r["Dødfødte"] || 0) === 0,
        );

        if (obsSoer.length > 0) {
          md += `> 🔴 **OBS-SØER (Kræver tjek):**<br>\n`;
          obsSoer.forEach((s) => {
            md += `> **${s.so}** (Lev: ${s.lev}, Døde: ${s.dod}, Lok: ${s.lok}) — _${s.reasons.join(" \\| ")}_<br>\n`;
          });
          md += "\n";
        }

        if (topSoer.length > 0) {
          md += `> 🌟 **STJERNESØER (0 døde):**<br>\n`;
          topSoer.forEach(
            (r) =>
              (md += `> **${r["Sonavn"]}** (Levende: ${r["Levendefødte"]}, Kuld: ${r["Kuld"]})<br>\n`),
          );
          md += "\n";
        }

        // MMA advarsel
        md += buildMMAAlertBlock(dayData);

        // Detailtabel
        md += `| Nr | So | Tid | Kuld | Grp | Vagt | Lev | Død | SB% | Mumif | Lokation | Vurdering | MMA | Med(Pat) | Med(So) |\n`;
        md += `| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |\n`;

        dayData.forEach((row, index) => {
          const nr = index + 1;
          const tid = `${String(row._realDate.getHours()).padStart(2, "0")}.${String(row._realDate.getMinutes()).padStart(2, "0")}`;
          const kuld = parseInt(row["Kuld"]) || 0;
          const lev = parseInt(row["Levendefødte"]) || 0;
          const dod = parseInt(row["Dødfødte"]) || 0;
          const mumif = hasMumif ? parseInt(row["Mumificerede"] || 0) : "—";
          const sbRate = calcStillbirthRate(lev, dod).toFixed(1);

          let rawLok = row["Faringslokation"] || row["Lokation"] || "";
          let displayLok = rawLok;
          if (rawLok.includes("/")) {
            const parts = rawLok.split("/");
            displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
          }

          const vurdering = getSowComment(lev, dod, kuld);
          const mmaIcon =
            row._mmaRisk.risk === "high"
              ? "🔴 Høj"
              : row._mmaRisk.risk === "medium"
                ? "🟡 Mid"
                : "🟢";

          md += `| ${nr} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${getParityGroup(kuld)} | ${getShift(row._realDate)} | **${lev}** | ${dod} | ${sbRate}% | ${mumif} | ${displayLok} | ${vurdering} | ${mmaIcon} | ${row._medicinPat} | ${row._medicinSo} |\n`;
        });

        md += `\n<br>\n\n`;
      });

      md += `---\n\n`;

      // ── Fuld faringsoversigt (rangeret) ───────────────────────
      md += `\n## 📋 Fuld Faringsoversigt (Rangeret)\n\n`;
      md += `> Hele ugens faringer rangeret efter ydeevne (flest levende → færrest døde).\n\n`;
      md += `| Rang | Dato | So | Tid | Kuld | Grp | Vagt | Lev | Død | SB% | Lokation | Vurdering | MMA | Med(Pat) |\n`;
      md += `| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;

      const sortedWeekData = [...weekData].sort((a, b) => {
        const levA = parseInt(a["Levendefødte"] || 0);
        const dodA = parseInt(a["Dødfødte"] || 0);
        const levB = parseInt(b["Levendefødte"] || 0);
        const dodB = parseInt(b["Dødfødte"] || 0);
        return levA !== levB ? levB - levA : dodA - dodB;
      });

      sortedWeekData.forEach((row, index) => {
        const rang = index + 1;
        const dato = dd(row._realDate).slice(0, 5);
        const tid = `${String(row._realDate.getHours()).padStart(2, "0")}.${String(row._realDate.getMinutes()).padStart(2, "0")}`;
        const kuld = parseInt(row["Kuld"]) || 0;
        const lev = parseInt(row["Levendefødte"]) || 0;
        const dod = parseInt(row["Dødfødte"]) || 0;
        const sbRate = calcStillbirthRate(lev, dod).toFixed(1);

        let rawLok = row["Faringslokation"] || row["Lokation"] || "";
        let displayLok = rawLok;
        if (rawLok.includes("/")) {
          const parts = rawLok.split("/");
          displayLok = `${parts[1].replace("-", " ")} - ${parts[0]}`;
        }

        const mmaIcon =
          row._mmaRisk.risk === "high"
            ? "🔴"
            : row._mmaRisk.risk === "medium"
              ? "🟡"
              : "🟢";

        md += `| ${rang} | ${dato} | **${row["Sonavn"] || ""}** | ${tid} | ${kuld} | ${getParityGroup(kuld)} | ${getShift(row._realDate)} | **${lev}** | ${dod} | ${sbRate}% | ${displayLok} | ${getSowComment(lev, dod, kuld)} | ${mmaIcon} | ${row._medicinPat} |\n`;
      });

      md += `\n`;
      fs.writeFileSync(path.join(yearFolder, fileName), "\uFEFF" + md, "utf8");
      console.log(`  ✅ Uge ${week} → ${fileName}`);
    }

    // ── Årsrapport ─────────────────────────────────────────────
    if (weeksProcessedInYear.length > 0) {
      let sumMd = `\n# 📊 Årsrapport ${year} — Zooteknisk BI Dashboard\n\n`;
      sumMd += `> Genereret: ${new Date().toLocaleDateString("da-DK")} | Standard: DanBred/SEGES 2024\n\n`;

      sumMd += buildEnterpriseTrendAnalysis(
        grouped[year],
        weeksProcessedInYear,
      );

      sumMd += `\n## 🗓️ Ugentlig Faringsoversigt\n\n`;
      sumMd += `> Format: **[Faringer]** *(Heraf gylte)* — _Lev/kuld \\| Døde/kuld \\| SB%_\n\n`;
      sumMd += `| Uge | Man | Tir | Ons | Tor | Fre | Lør | Søn | Total |\n`;
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
              const sbIcon =
                parseFloat(sbRate) > 15
                  ? "🔴"
                  : parseFloat(sbRate) > 8
                    ? "🟡"
                    : "🟢";
              wRow += ` **${f}** *(${f1})*<br>_L:${avgL} \\| D:${avgD}_<br>${sbIcon}${sbRate}% |`;
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

      // Gennemsnitlinje
      sumMd += `| **Gns.** |`;
      for (let day = 1; day <= 7; day++) {
        const t = totalSummary[day];
        if (t.c > 0) {
          const avgL = (t.l / t.f).toFixed(1);
          const avgD = (t.d / t.f).toFixed(1);
          const sbRate = calcStillbirthRate(t.l, t.d).toFixed(1);
          sumMd += ` **~${(t.f / t.c).toFixed(1)}** *(~${(t.f1 / t.c).toFixed(1)})*<br>_L:${avgL} \\| D:${avgD}_<br>_SB:${sbRate}%_ |`;
        } else {
          sumMd += ` — |`;
        }
      }
      sumMd += ` |\n`;

      const summaryFileName = `00 Ugentlig Sammenligning Ekspert ${year}.md`;
      fs.writeFileSync(
        path.join(yearFolder, summaryFileName),
        "\uFEFF" + sumMd,
        "utf8",
      );
      console.log(`  📊 Årsrapport → ${summaryFileName}`);
    }
  }

  console.log("\n✅ Behandling fuldført! Alle rapporter er eksporteret.\n");
}

main();
