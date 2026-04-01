import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsxModule from 'xlsx';

// 1. Cấu hình môi trường ES Module & fix lỗi Buffer của thư viện xlsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const xlsx = xlsxModule.default || xlsxModule;

// Hàm làm sạch chuỗi tránh vỡ format bảng Markdown
function cleanMD(str) {
    return (String(str) || '').replace(/\r?\n|\r/g, ' ').replace(/\|/g, '-').trim();
}

// --- LUỒNG XỬ LÝ CHÍNH ---
function processVaccinationList() {
    console.log("⏳ Đang phân tích file 'service-list-1.xlsx'...");
    const filePath = path.join(__dirname, 'service-list-1.xlsx');
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ Lỗi: Không tìm thấy file 'service-list-1.xlsx'. Vui lòng kiểm tra lại tên file!");
        return;
    }

    // Đọc file thông qua Buffer
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Lấy dữ liệu dưới dạng mảng 2 chiều
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
    
    if (rows.length === 0) {
        console.log("⚠️ File Excel đang trống!");
        return;
    }

    // 1. Tự động tìm dòng chứa tiêu đề (Header)
    let headerRowIdx = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].some(cell => String(cell).toLowerCase().includes('sonavn'))) {
            headerRowIdx = i;
            break;
        }
    }

    // Làm sạch tiêu đề gốc
    const originalHeaders = rows[headerRowIdx].map(h => cleanMD(h));
    const finalHeaders = [...originalHeaders];

    // 2. Xử lý điều kiện Cột 'Lokation'
    let lokationIdx = finalHeaders.findIndex(h => h.toLowerCase().includes('lokation'));
    if (lokationIdx === -1) {
        finalHeaders.push('Lokation');
        lokationIdx = finalHeaders.length - 1; // Cập nhật lại Index mới
    }

    // 3. Khai báo 4 cột Thuốc Vaccine
    const newColumns = ['Vitamin E 5ml', 'Hyobac 1ml', 'Porcilcis 2ml', 'Sunseng 2 ml'];
    finalHeaders.push(...newColumns);

    // 4. Tạo thư mục Output
    const outputDir = path.join(__dirname, 'Output', '2 Vaccination af søer 4 uger før faring');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 5. Build nội dung Markdown
    let mdContent = `# Vaccination af søer 4 uger før faring\n\n`;
    
    // Tạo phần Header cho bảng Markdown
    mdContent += `| Nr. | ${finalHeaders.join(' | ')} |\n`;
    mdContent += `| :--- | ${finalHeaders.map(() => ':---').join(' | ')} |\n`;

    let count = 1; // Khởi tạo số thứ tự

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Bỏ qua các dòng trống hoàn toàn
        if (!row || row.length === 0 || !row.some(cell => String(cell).trim() !== '')) continue;

        let mdRow = `| ${count++} | `;
        
        // Duyệt qua từng cột trong Final Headers để ánh xạ dữ liệu
        finalHeaders.forEach((headerName, idx) => {
            
            // Nếu là 4 cột Thuốc -> Hiển thị icon checked
            if (newColumns.includes(headerName)) {
                mdRow += `✅ | `;
            } 
            
            // Nếu là cột Lokation -> Kiểm tra rỗng và điền "Opdatering"
            else if (idx === lokationIdx) {
                const originalIdx = originalHeaders.indexOf(headerName);
                let val = originalIdx !== -1 ? cleanMD(row[originalIdx]) : "";
                
                if (!val || val === '') {
                    val = "Opdatering";
                }
                mdRow += `${val} | `;
            } 
            
            // Các cột dữ liệu gốc thông thường
            else {
                const originalIdx = originalHeaders.indexOf(headerName);
                const val = originalIdx !== -1 ? cleanMD(row[originalIdx]) : "";
                mdRow += `${val} | `;
            }
        });

        mdContent += mdRow + '\n';
    }

    // 6. Ghi file hoàn chỉnh
    const outPath = path.join(outputDir, 'Vaccination_Rapport.md');
    fs.writeFileSync(outPath, mdContent, 'utf8');
    
    console.log(`✅ Hoàn tất! Báo cáo tiêm phòng đã được xuất tại: ${outPath}`);
}

processVaccinationList();