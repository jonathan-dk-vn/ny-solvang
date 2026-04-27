import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

// Cấu hình đường dẫn cho chuẩn ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thư mục đầu vào 
const inputDir = path.join(__dirname, 'Input');

// Đường dẫn Output
const outputDir = '/Users/jonathan/Documents/code/ny-solvang/public/quintessential-essence/2 Vaccination af søer 4 uger før faring/2026';

// Tự động tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Hàm tính tuần phối giống dựa vào tuần tiêm và khoảng lùi (offset)
 */
function getMatingWeek(vaccinationWeek, offset) {
    let week = vaccinationWeek - offset;
    if (week <= 0) {
        week += 52;
    }
    return week;
}

/**
 * Đọc dữ liệu từ file Excel cho một tuần cụ thể
 */
function readExcelData(week) {
    const fileName = `service-list-${week}.xlsx`;
    const filePath = path.join(inputDir, fileName);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const sows = [];
    for (let i = 8; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Bỏ qua nếu dòng rỗng
        if (!row || !row[0] || row[0].toString().trim() === "") continue;

        const sonavn = row[0].toString().trim();

        // Bỏ qua dòng chân trang (chỉ chứa số 1)
        if (sonavn === "1") continue;

        sows.push({
            Sonavn: sonavn,
            Lokation: row[2] ? row[2].toString().trim() : "",
            Kuld: parseInt(row[5], 10) || 0
        });
    }

    return sows;
}

/**
 * Tự động quét thư mục và xuất file MD
 */
function autoGenerate() {
    console.log("🔍 Đang quét thư mục Input để tìm dữ liệu...");
    
    const files = fs.readdirSync(inputDir);
    const availableWeeks = new Set();
    
    files.forEach(file => {
        const match = file.match(/^service-list-(\d+)\.xlsx$/);
        if (match) {
            availableWeeks.add(parseInt(match[1], 10));
        }
    });

    if (availableWeeks.size === 0) {
        console.log("⚠️ Không tìm thấy file Excel nào trong thư mục Input.");
        return;
    }

    let generatedCount = 0;

    for (let targetWeek = 1; targetWeek <= 53; targetWeek++) {
        const team2Week = getMatingWeek(targetWeek, 13);
        const team3Week = getMatingWeek(targetWeek, 10);

        if (availableWeeks.has(team2Week) && availableWeeks.has(team3Week)) {
            generateMarkdown(targetWeek, team2Week, team3Week);
            generatedCount++;
        }
    }

    console.log(`\n🎉 Hoàn tất! Đã lưu ${generatedCount} file vào: \n📂 ${outputDir}`);
}

/**
 * Hàm render ra nội dung file Markdown
 */
function generateMarkdown(targetWeek, team2Week, team3Week) {
    const team2DataRaw = readExcelData(team2Week) || [];
    const team3DataRaw = readExcelData(team3Week) || [];

    let team2Sows = team2DataRaw; 
    let team3Sows = team3DataRaw.filter(sow => sow.Kuld === 0);

    // HÀM SẮP XẾP NÁI THEO CHUỒNG -> THEO LỨA ĐẺ
    const sortSows = (a, b) => {
        const locA = a.Lokation || "";
        const locB = b.Lokation || "";
        
        // 1. Sắp xếp theo tên chuồng (hiểu được chuỗi số, vd "7" xếp trước "10")
        const locCompare = locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
        if (locCompare !== 0) {
            return locCompare;
        }
        
        // 2. Nếu cùng chuồng, xếp theo lứa đẻ (Kuld). 
        // Đang để b.Kuld - a.Kuld (Giảm dần: nái già trước, tơ sau). 
        // Nếu bạn muốn Tăng dần, sửa lại thành: return a.Kuld - b.Kuld;
        return b.Kuld - a.Kuld;
    };

    // Áp dụng thuật toán sắp xếp cho cả 2 mảng
    team2Sows.sort(sortSows);
    team3Sows.sort(sortSows);

    let mdContent = `# Vaccinationsplan - Uge ${targetWeek}\n\n`;

    mdContent += `## Team 1: Nye Gylte\n\n`;
    mdContent += `**Samlet antal:** ....., Vitamin E 5ml, Hyobac 1ml, Stellume 2ml.\n\n`;
    mdContent += `---\n\n`;

    // ---------------- TEAM 2 ----------------
    mdContent += `## Team 2: Søer løbet i uge ${team2Week}\n\n`;
    mdContent += `_Vaccine for alle drægtige søer: Vitamin E (5ml), Hyobac (1ml), Porcilcis (2ml), Sunseng (2ml)_\n\n`;
    
    let counterTeam2 = 1;

    if (team2Sows.length > 0) {
        mdContent += `| Nr. | Sonavn | Kuld | Lokation | Vitamin E | Hyobac | Porcilcis | Sunseng |\n`;
        mdContent += `| :-- | :------- | :--: | :------- | :-------: | :----: | :-------: | :-----: |\n`;
        team2Sows.forEach(sow => {
            mdContent += `| ${counterTeam2} | **${sow.Sonavn}** | ${sow.Kuld} | ${sow.Lokation} | 5 ml | 1 ml | 2 ml | 2 ml |\n`;
            counterTeam2++;
        });
    } else {
        mdContent += `*(Ingen data fundet for uge ${team2Week})*\n`;
    }
    mdContent += `\n<br>\n\n`;

    // ---------------- TEAM 3 ----------------
    mdContent += `## Team 3: Søer løbet i uge ${team3Week}\n\n`;
    mdContent += `_Vaccine KUN for 1. lægs (Kuld = 0): Hyobac (1ml), Sunseng (2ml)_\n\n`;

    let counterTeam3 = 1;

    if (team3Sows.length > 0) {
        mdContent += `| Nr. | Sonavn | Kuld | Lokation | Hyobac | Sunseng |\n`;
        mdContent += `| :-- | :------- | :--: | :------- | :----: | :-----: |\n`;
        team3Sows.forEach(sow => {
            mdContent += `| ${counterTeam3} | **${sow.Sonavn}** | ${sow.Kuld} | ${sow.Lokation} | 1 ml | 2 ml |\n`;
            counterTeam3++;
        });
    } else {
         mdContent += `*(Ingen data fundet for uge ${team3Week})*\n`;
    }
    mdContent += `\n<br>\n`;

    const outputFilePath = path.join(outputDir, `Uge ${targetWeek}.md`);
    fs.writeFileSync(outputFilePath, mdContent, 'utf8');
    console.log(`✅ Đã tạo: Uge ${targetWeek}.md`);
}

autoGenerate();