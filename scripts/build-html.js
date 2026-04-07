// scripts/build-html.js
import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import chokidar from "chokidar";
import { fileURLToPath } from "url";
import pLimit from "p-limit";
import { parse } from "node-html-parser"; // <-- THÊM THƯ VIỆN NÀY

// =============================================================================
// 1. CẤU HÌNH & KHỞI TẠO
// =============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thư mục chứa báo cáo Markdown (quintessential-essence)
const dataFolder = process.env.DATA_FOLDER || "quintessential-essence";
const markdownDir = path.join(__dirname, "..", "public", dataFolder);

// Thư mục đầu ra duy nhất cho HTML
const outputDir = path.join(__dirname, "..", "public", "html-data");

// Giới hạn xử lý song song để không làm quá tải CPU
const limit = pLimit(20);

console.log(`[CONFIG] Thư mục nguồn (Markdown): ${markdownDir}`);
console.log(`[CONFIG] Thư mục đích (HTML): ${outputDir}`);

// =============================================================================
// 2. XỬ LÝ CHUYỂN ĐỔI MARKDOWN -> HTML
// =============================================================================
async function processMarkdownFile(filePath) {
  try {
    // Đọc nội dung file Markdown gốc
    const rawContent = await fs.readFile(filePath, "utf-8");

    // Xử lý trước một số thẻ tùy chỉnh nếu báo cáo của bạn có sử dụng
    const lines = rawContent.split("\n");
    const processedLines = lines.map((line) => {
      const trimmedLine = line.trim();
      
      // Xử lý ảnh tùy chỉnh (nếu có)
      if (trimmedLine.startsWith("imgsrc:")) {
        let imgSrc = trimmedLine.substring(7).trim();
        if (imgSrc.startsWith("public/")) imgSrc = imgSrc.substring(7);
        return `<img src="${imgSrc}" class="content-image" loading="lazy" />\n`;
      }
      
      // Xử lý link HTML tĩnh (nếu có)
      if (trimmedLine.startsWith("htmlsrc:")) {
        const fullPath = trimmedLine.substring(8).trim();
        const fileNameWithExt = path.basename(fullPath);
        const displayName = fileNameWithExt.replace(/\.html$/i, "");
        return `<p><a href="/${fileNameWithExt}" target="_blank">🔗 ${displayName}</a></p>\n`;
      }
      
      return line;
    });

    // Dùng marked để biên dịch Markdown cơ bản thành HTML
    let htmlContent = marked.parse(processedLines.join("\n"));

    // -------------------------------------------------------------------------
    // BƯỚC NÂNG CẤP: GẮN DATA-LABEL CHO TABLE ĐỂ LÀM RESPONSIVE TRÊN MOBILE
    // -------------------------------------------------------------------------
    const root = parse(htmlContent);
    const tables = root.querySelectorAll('table');

    tables.forEach(table => {
      // 1. Lấy danh sách text của các thẻ <th> (tiêu đề cột)
      const headers = table.querySelectorAll('th').map(th => th.textContent.trim());

      // 2. Lặp qua từng hàng <tr> trong <tbody> (bỏ qua thead)
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
          // Gán data-label tương ứng với cột của nó
          if (headers[index]) {
            cell.setAttribute('data-label', headers[index]);
          }
        });
      });
    });

    // Cập nhật lại htmlContent sau khi đã gắn data-label
    htmlContent = root.toString();
    // -------------------------------------------------------------------------

    // Bọc trong container chuẩn để CSS hiện tại của bạn vẫn hiển thị đẹp
    const finalHtml = `<div class="markdown-rendered">\n${htmlContent}\n</div>`;

    // Tính toán đường dẫn lưu file HTML tương ứng
    const relPath = path.relative(markdownDir, filePath).replace(/\.md$/i, ".html");
    const outputFilePath = path.join(outputDir, relPath);
    
    // Tạo thư mục nếu chưa có và ghi file HTML
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
    await fs.writeFile(outputFilePath, finalHtml, "utf-8");
    
  } catch (err) {
    console.error(`[ERROR] Lỗi khi xử lý file ${filePath}:`, err.message);
  }
}

// =============================================================================
// 3. QUẢN LÝ QUÁ TRÌNH BUILD VÀ ĐỌC THƯ MỤC
// =============================================================================
async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return files.flat();
}

async function buildAll() {
  console.time("Build Time");
  console.log(`\n🚀 BẮT ĐẦU BUILD BÁO CÁO NÔNG TRẠI`);
  
  try {
    // Xóa sạch thư mục html-data cũ trước khi build lại
    await fs.rm(outputDir, { recursive: true, force: true });
    
    // Lấy tất cả các file .md trong thư mục data
    const allFiles = await getFiles(markdownDir);
    const mdFiles = allFiles.filter((f) => f.endsWith(".md"));
    
    // Chạy processMarkdownFile song song
    const tasks = mdFiles.map((f) => limit(() => processMarkdownFile(f)));
    await Promise.all(tasks);
    
    console.log(`[DONE] ✅ Đã chuyển đổi thành công ${mdFiles.length} file báo cáo.`);
  } catch (e) {
    console.error("[ERROR] Quá trình build thất bại:", e);
  }
  console.timeEnd("Build Time");
}

// =============================================================================
// 4. CHẠY SCRIPT (WATCH MODE HOẶC BUILD ONCE)
// =============================================================================
if (process.argv.includes("--watch")) {
  await buildAll();
  console.log(`\n[WATCH] Đang theo dõi thay đổi trong thư mục báo cáo...`);

  const watcher = chokidar.watch([markdownDir], {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  watcher.on("all", async (event, filePath) => {
    if (filePath.endsWith(".md")) {
      if (event === "unlink") {
        // Khi xóa file markdown -> Tự động xóa file HTML tương ứng
        const relPath = path.relative(markdownDir, filePath).replace(/\.md$/i, ".html");
        const outputFilePath = path.join(outputDir, relPath);
        try {
          await fs.rm(outputFilePath, { force: true });
          console.log(`[WATCH] 🗑️ Đã xóa bản HTML của: ${relPath}`);
        } catch (e) {}
      } else {
        // Khi thêm mới hoặc chỉnh sửa file
        console.log(`\n[WATCH] 🔄 Đang cập nhật báo cáo: ${path.basename(filePath)}`);
        await processMarkdownFile(filePath);
      }
    }
  });
} else {
  buildAll();
}