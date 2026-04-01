import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Thiết lập __dirname cho ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonFolder = path.join(__dirname, 'json');
const mdFolder = path.join(__dirname, 'md');
const combinedFilePath = path.join(mdFolder, 'all_combined.md');

function convertAndMergeJsonToMd() {
    try {
        // 1. Kiểm tra folder 'json'
        if (!fs.existsSync(jsonFolder)) {
            console.error("Lỗi: Không tìm thấy folder 'json'.");
            return;
        }

        // 2. Tạo folder 'md' nếu chưa có
        if (!fs.existsSync(mdFolder)) {
            fs.mkdirSync(mdFolder);
        }

        const files = fs.readdirSync(jsonFolder);
        let combinedMdContent = "# TỔNG HỢP TOÀN BỘ TỪ VỰNG\n\n";

        files.forEach(fileName => {
            if (path.extname(fileName).toLowerCase() === '.json') {
                const filePath = path.join(jsonFolder, fileName);
                const rawData = fs.readFileSync(filePath, 'utf8');
                const words = JSON.parse(rawData);

                if (Array.isArray(words)) {
                    // Tạo nội dung bảng cho file hiện tại
                    let tableHeader = `## File: ${fileName}\n\n`;
                    tableHeader += `| STT | Từ vựng |\n| :--- | :--- |\n`;
                    
                    let tableRows = "";
                    words.forEach((word, index) => {
                        const cleanWord = word.toString().replace(/\n/g, " ");
                        tableRows += `| ${index + 1} | ${cleanWord} |\n`;
                    });

                    const fileContent = tableHeader + tableRows + "\n\n";

                    // Xuất file MD riêng lẻ
                    const outputFileName = fileName.replace('.json', '.md');
                    const outputPath = path.join(mdFolder, outputFileName);
                    fs.writeFileSync(outputPath, fileContent, 'utf8');
                    console.log(`✅ Đã tạo file riêng: ${outputFileName}`);

                    // Cộng dồn vào nội dung file tổng hợp
                    combinedMdContent += fileContent;
                }
            }
        });

        // 3. Ghi file tổng hợp duy nhất
        fs.writeFileSync(combinedFilePath, combinedMdContent, 'utf8');
        
        console.log(`\n-----------------------------------------`);
        console.log(`🌟 THÀNH CÔNG!`);
        console.log(`- Các file riêng lẻ đã nằm trong: ${mdFolder}`);
        console.log(`- File gộp duy nhất: ${combinedFilePath}`);

    } catch (error) {
        console.error('Lỗi hệ thống:', error.message);
    }
}

convertAndMergeJsonToMd();