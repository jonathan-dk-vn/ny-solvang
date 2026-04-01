import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsxModule from 'xlsx';

// 1. Cấu hình môi trường ES Module & fix lỗi thư viện xlsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const xlsx = xlsxModule.default || xlsxModule; // Chống đạn cho mọi kiểu export của SheetJS

// 2. Hàm chuyển đổi chuỗi ngày thành Date object (Định dạng: DD.MM.YYYY HH.mm)
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.trim().split(' ');
    if (parts.length !== 2) return new Date(0);
    
    const [DD, MM, YYYY] = parts[0].split('.');
    const [hh, mm] = parts[1].split('.');
    return new Date(YYYY, MM - 1, DD, hh, mm);
}

// 3. Hàm lấy số tuần theo chuẩn ISO 8601
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// 4. Hàm làm sạch chuỗi Markdown
function cleanMD(str) {
    return (String(str) || '').replace(/\r?\n|\r/g, ' ').replace(/\|/g, '-').trim();
}

// --- LUỒNG XỬ LÝ CHÍNH ---
function processData() {
    console.log("⏳ Đang đọc và phân tích dữ liệu...");
    const filePath = path.join(__dirname, 'data.xlsx');
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ Lỗi: Không tìm thấy file 'data.xlsx'.");
        return;
    }

    // Đọc file thông qua Buffer để né lỗi xlsx.readFile trên Node 24 ESM
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Lấy dữ liệu dưới dạng mảng 2 chiều (raw: false để giữ format string của ngày tháng)
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
    
    const records = [];
    
    // Phân tích từng dòng
    rows.forEach(row => {
        // Bỏ qua dòng tiêu đề hoặc dòng thiếu dữ liệu
        if (row.length < 9 || !row[1] || String(row[0]).includes('Sonavn') || String(row[0]).includes('Faringer')) return;
        
        const dateObj = parseDate(String(row[1]));
        if (dateObj.getTime() === 0) return; // Bỏ qua nếu lỗi parse ngày

        const record = {
            Sonavn: cleanMD(row[0]),
            DatoStr: String(row[1]).trim(),
            DatoObj: dateObj,
            Levendefodte: parseInt(row[2]) || 0,
            Dodfodte: parseInt(row[3]) || 0,
            Lokation: cleanMD(row[4]),
            Kuld: parseInt(row[5]) || 0,
            Tilstand: cleanMD(row[6]),
            Kommentar: cleanMD(row[7]),
            OprettetAf: cleanMD(row[8])
        };
        
        // Tạo các key để gom nhóm
        const month = String(record.DatoObj.getMonth() + 1).padStart(2, '0');
        const year = record.DatoObj.getFullYear();
        const day = String(record.DatoObj.getDate()).padStart(2, '0');
        
        record.MonthFolder = `${month}-${year}`;
        record.WeekStr = `Uge_${getISOWeek(record.DatoObj)}`;
        record.DayStr = `${day}.${month}.${year}`;
        
        records.push(record);
    });

    // Sắp xếp TOÀN BỘ dữ liệu từ cũ nhất -> mới nhất theo thời gian đẻ
    records.sort((a, b) => a.DatoObj - b.DatoObj);

    // Gom nhóm cấu trúc: Tháng -> Tuần -> Danh sách Record
    const dataByMonth = new Map();
    records.forEach(r => {
        if (!dataByMonth.has(r.MonthFolder)) dataByMonth.set(r.MonthFolder, new Map());
        const monthMap = dataByMonth.get(r.MonthFolder);
        
        if (!monthMap.has(r.WeekStr)) monthMap.set(r.WeekStr, []);
        monthMap.get(r.WeekStr).push(r);
    });

    // Tạo thư mục Output
    const outputDir = path.join(__dirname, 'Output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Xử lý ghi file Markdown
    dataByMonth.forEach((weekMap, monthName) => {
        const monthPath = path.join(outputDir, monthName);
        if (!fs.existsSync(monthPath)) fs.mkdirSync(monthPath, { recursive: true });

        weekMap.forEach((weekRecords, weekName) => {
            // Mảng weekRecords đã được sắp xếp tăng dần từ trước.
            // Xác định index của 2 nái đẻ cuối cùng trong tuần này.
            const totalInWeek = weekRecords.length;
            const lastTwoIndexes = [totalInWeek - 1, totalInWeek - 2];

            let wAlive = 0;
            let wDead = 0;
            const dayMap = new Map();

            // Áp dụng logic tính toán & Thuốc
            weekRecords.forEach((r, idx) => {
                wAlive += r.Levendefodte;
                wDead += r.Dodfodte;

                // Quy tắc thuốc heo con
                if (lastTwoIndexes.includes(idx)) {
                    r.MedPiglet = "Ingen"; // Không có thuốc cho 2 nái cuối
                } else if (r.Kuld === 1) {
                    r.MedPiglet = "Bimoxyl LA 3ml + Neuton 3ml";
                } else {
                    r.MedPiglet = "Bimoxyl LA 3ml";
                }

                // Quy tắc thuốc nái
                r.MedSow = "Oxytobel 2ml + Melovem 5ml";

                // Gom nhóm vào ngày
                if (!dayMap.has(r.DayStr)) dayMap.set(r.DayStr, []);
                dayMap.get(r.DayStr).push(r);
            });

            const wDeadRate = wAlive + wDead > 0 ? ((wDead / (wAlive + wDead)) * 100).toFixed(2) : 0;

            // Xây dựng nội dung file MD
            let mdContent = `# ${weekName.replace('_', ' ')} - Rapport\n\n`;
            mdContent += `**Ugesammendrag:**\n`;
            mdContent += `- Antal faringer: **${totalInWeek}**\n`;
            mdContent += `- Total levendefødte: **${wAlive}**\n`;
            mdContent += `- Total dødfødte: **${wDead}**\n`;
            mdContent += `- Dødfødselsrate: **${wDeadRate}%**\n\n`;
            mdContent += `---\n\n`;

            // Sắp xếp các ngày giảm dần (Ngày mới nhất xếp lên đầu file)
            const sortedDays = Array.from(dayMap.keys()).sort((a, b) => {
                const [d1, m1, y1] = a.split('.');
                const [d2, m2, y2] = b.split('.');
                return new Date(y2, m2-1, d2) - new Date(y1, m1-1, d1);
            });

            sortedDays.forEach(day => {
                const dayRecords = dayMap.get(day);
                // Giữ nguyên thứ tự thời gian tăng dần trong cùng 1 ngày
                
                let dAlive = 0;
                let dDead = 0;
                dayRecords.forEach(r => { dAlive += r.Levendefodte; dDead += r.Dodfodte; });
                const dDeadRate = dAlive + dDead > 0 ? ((dDead / (dAlive + dDead)) * 100).toFixed(2) : 0;

                mdContent += `## Dato: ${day}\n\n`;
                mdContent += `**Dagsammendrag:**\n`;
                mdContent += `- Antal faringer: **${dayRecords.length}**\n`;
                mdContent += `- Total levendefødte: **${dAlive}**\n`;
                mdContent += `- Total dødfødte: **${dDead}**\n`;
                mdContent += `- Dødfødselsrate: **${dDeadRate}%**\n\n`;

                // Bảng Markdown Đan Mạch
                mdContent += `| Nr. | Sonavn | Tid | Kuld | Levendefødte | Dødfødte | Lokation | Medicin (Pattegrise) | Medicin (So) | Oprettet af |\n`;
                mdContent += `| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;
                
                dayRecords.forEach((r, i) => {
                    const timeOnly = r.DatoStr.split(' ')[1] || '';
                    mdContent += `| ${i + 1} | **${r.Sonavn}** | ${timeOnly} | ${r.Kuld} | ${r.Levendefodte} | ${r.Dodfodte} | ${r.Lokation} | ${r.MedPiglet} | ${r.MedSow} | ${r.OprettetAf} |\n`;
                });
                
                mdContent += `\n<br>\n\n`;
            });

            // Ghi file
            const filePath = path.join(monthPath, `${weekName}.md`);
            fs.writeFileSync(filePath, mdContent, 'utf8');
        });
    });

    console.log("✅ Xử lý hoàn tất! File Markdown đã được tạo trong thư mục 'Output'.");
}

processData();