import fs from 'fs';
import path from 'path';

/**
 * GIẢI PHÁP TRIỆT ĐỂ:
 * 1. Chuyển đổi folder/file thành Heading từ H1 đến H6 dựa trên độ sâu.
 * 2. Chỉ khi độ sâu > 6 mới chuyển sang dạng liệt kê (bullet points).
 * 3. Tự động nhận diện DATA_FOLDER từ môi trường hoặc dùng mặc định.
 */

const folderName = process.env.DATA_FOLDER || 'quintessential-essence';
const rootDir = process.cwd();
const CONTENT_DIR = path.join(rootDir, 'public', folderName);
// Lưu vào folder dữ liệu để build-html.js quét được và convert sang HTML
const OUTPUT_FILE = path.join(CONTENT_DIR, 'Categories.md');

function generateCategories() {
    console.log(`🔍 Đang quét cấu trúc thư mục tại: ${CONTENT_DIR}`);

    if (!fs.existsSync(CONTENT_DIR)) {
        console.error(`❌ Thư mục không tồn tại: ${CONTENT_DIR}`);
        return;
    }

    let markdown = '';

    function walk(dir, depth = 1) {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
                         .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
        
        entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(CONTENT_DIR, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                // Xử lý Thư mục: Dùng Heading nếu depth <= 6
                if (depth <= 6) {
                    markdown += `\n${'#'.repeat(depth)} ${entry.name}\n`;
                } else {
                    // Vượt quá H6 thì dùng danh sách có thụt đầu dòng
                    const indent = '  '.repeat(depth - 7);
                    markdown += `${indent}- **${entry.name}**\n`;
                }
                // Đệ quy vào cấp tiếp theo
                walk(fullPath, depth + 1);
            } else if (entry.name.endsWith('.md') && entry.name !== 'Categories.md') {
                // Xử lý File bài học: Chuyển thành Link
                const title = entry.name.replace('.md', '');
                const hash = encodeURIComponent(relativePath.replace('.md', ''));
                
                if (depth <= 6) {
                    markdown += `${'#'.repeat(depth)} [${title}](#${hash})\n`;
                } else {
                    const indent = '  '.repeat(depth - 7);
                    markdown += `${indent}- [${title}](#${hash})\n`;
                }
            }
        });
    }

    // Khởi tạo quá trình quét từ H1
    walk(CONTENT_DIR, 1);

    try {
        fs.writeFileSync(OUTPUT_FILE, markdown.trim());
        console.log(`✅ Đã tạo Categories.md thành công (H1-H6) tại: ${OUTPUT_FILE}`);
    } catch (err) {
        console.error(`❌ Lỗi ghi file: ${err.message}`);
    }
}

generateCategories();