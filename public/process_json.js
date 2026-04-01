import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Thiết lập __dirname cho ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'json');

// Hàm sắp xếp theo bảng chữ cái tiếng Đan Mạch
const danishSort = (a, b) => {
    return a.localeCompare(b, 'da', { sensitivity: 'base' });
};

fs.readdir(directoryPath, (err, files) => {
    if (err) return console.log('Không thể quét thư mục: ' + err);

    files.forEach((file) => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(directoryPath, file);

            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) return;

                try {
                    let words = JSON.parse(data);
                    if (Array.isArray(words)) {
                        // Chuẩn hoá chữ thường, xoá trùng lặp
                        let uniqueWords = [...new Set(words.map(w => w.toLowerCase().trim()))];
                        
                        // Sắp xếp
                        uniqueWords.sort(danishSort);

                        fs.writeFile(filePath, JSON.stringify(uniqueWords, null, 2), (err) => {
                            if (err) console.log(`Lỗi ${file}: ${err}`);
                            else console.log(`✓ Đã xong: ${file}`);
                        });
                    }
                } catch (e) {
                    console.log(`Lỗi định dạng file ${file}`);
                }
            });
        }
    });
});