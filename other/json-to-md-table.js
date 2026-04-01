import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CẤU HÌNH ---
const COLUMNS_COUNT = 50; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [SỬA LẠI ĐƯỜNG DẪN TẠI ĐÂY]
// Vì file này đang nằm ở root, ta trỏ thẳng vào public/json
const INPUT_DIR = path.resolve(__dirname, 'public/json');
const OUTPUT_DIR = path.resolve(__dirname, 'public/md-output'); 

// --- LOGIC ---

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateTableHeader(cols) {
  let headerRow = '|';
  let separatorRow = '|';
  
  for (let i = 1; i <= cols; i++) {
    headerRow += ` Cột ${i} |`;
    separatorRow += ` --- |`;
  }
  
  return `${headerRow}\n${separatorRow}\n`;
}

function convertJsonToMd() {
  console.log(`🚀 Bắt đầu chuyển đổi JSON -> MD (Bảng ${COLUMNS_COUNT} cột)...`);
  console.log(`📂 Đọc từ: ${INPUT_DIR}`);
  
  try {
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`❌ Không tìm thấy thư mục: ${INPUT_DIR}`);
        console.error('👉 Hãy kiểm tra xem bạn đã tạo thư mục "public/json" chưa?');
        return;
    }

    const files = fs.readdirSync(INPUT_DIR);
    
    files.forEach(file => {
      if (!file.endsWith('.json')) return;

      const inputPath = path.join(INPUT_DIR, file);
      const outputPath = path.join(OUTPUT_DIR, file.replace('.json', '.md'));

      const rawData = fs.readFileSync(inputPath, 'utf8');
      let jsonData;

      try {
        jsonData = JSON.parse(rawData);
      } catch (err) {
        console.error(`❌ Lỗi parse JSON file ${file}:`, err.message);
        return;
      }

      if (!Array.isArray(jsonData)) {
        console.warn(`⚠️  Bỏ qua ${file}: File này không phải là một danh sách (Array).`);
        return;
      }

      let mdContent = `# Dữ liệu từ ${file}\n\n`;
      mdContent += generateTableHeader(COLUMNS_COUNT);

      for (let i = 0; i < jsonData.length; i += COLUMNS_COUNT) {
        const chunk = jsonData.slice(i, i + COLUMNS_COUNT);
        while (chunk.length < COLUMNS_COUNT) {
          chunk.push(''); 
        }
        const rowString = chunk.map(item => String(item).replace(/\|/g, '&#124;').replace(/\n/g, ' ')).join(' | ');
        mdContent += `| ${rowString} |\n`;
      }

      fs.writeFileSync(outputPath, mdContent);
      console.log(`✅ Đã tạo: ${file.replace('.json', '.md')}`);
    });

    console.log(`\n🎉 Hoàn tất! File MD được lưu tại: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('🔥 Lỗi chương trình:', error);
  }
}

convertJsonToMd();