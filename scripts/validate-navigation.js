// scripts/validate-navigation.js
// PHIÊN BẢN CẬP NHẬT: Ghi tất cả log ra file 'scripts/util/nav-test.md'

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Nhập dữ liệu đã tạo để so sánh
import { restructuredNavData } from './navigationData.generated.js';

// --- Cấu hình và Đường dẫn ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const markdownDir = path.join(__dirname, '..', 'public', 'gold-data');

// --- Cấu hình Ghi Log ra File ---
const outputDir = path.join(__dirname, 'util');
const outputFilePath = path.join(outputDir, 'nav-test.md');
const logOutput = []; // Mảng để thu thập tất cả log

// --- Trình trợ giúp (Helpers) Ghi log (Không dùng màu) ---
const logPass = (prefix, message) => logOutput.push(`${prefix}✅ ${message}`);
const logFail = (prefix, message) => {
  logOutput.push(`${prefix}❌ ${message}`);
  summary.errors++;
};
const logInfo = (prefix, message) => logOutput.push(`${prefix}ℹ️ ${message}`);
const logTitle = (prefix, message) => logOutput.push(`\n${prefix}${message}`);
const logDim = (prefix, message) => logOutput.push(`${prefix}  ${message}`);

const summary = {
  nodesChecked: 0,
  errors: 0,
};

// --- SAO CHÉP LOGIC TỪ generate-navigation.js (ĐÃ SỬA LỖI) ---
const smallWords = new Set([
  "og", "i", "på", "til", "af", "med", "for", "and", "the", "of", "in", "on", "at", "to", "with", "ved", "om"
]);

const naturalSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

function beautifyName(name) {
  let clean = name.replace(/\.md$/i, '');
  
  // --- ÁP DỤNG SỬA LỖI TẠI ĐÂY ---
  clean = clean.replace(/^\d+[\s.-_]/, ''); // <-- SỬA LỖI LOGIC: Xóa * hoặc +
  // --- KẾT THÚC SỬA LỖI ---
  
  clean = clean.replace(/[-_]/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean.split(' ').map((word, index) => {
    const lowerWord = word.toLowerCase();
    if (index === 0 || !smallWords.has(lowerWord)) {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return lowerWord;
  }).join(' ');
}


function makeHashFromRelativeMd(relativePath) {
  const withoutExt = relativePath.replace(/\.md$/i, '');
  const hash = withoutExt.replace(/\\/g, '/');
  return `#${hash}`;
}

function buildRecursiveTree(dirPath) {
  const children = [];
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.'))
      .sort(naturalSort);
  } catch (e) {
    logOutput.push(`[VALIDATE-SCAN] ❌ Lỗi khi đọc thư mục: ${dirPath} - ${e.message}`);
    summary.errors++;
    return [];
  }

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedChildren = buildRecursiveTree(entryPath);
      if (nestedChildren.length > 0) {
        children.push({
          type: 'category',
          title: beautifyName(entry.name),
          children: nestedChildren,
        });
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = path.relative(markdownDir, entryPath);
      children.push({
        type: 'link',
        text: beautifyName(entry.name),
        href: makeHashFromRelativeMd(relPath),
      });
    }
  }
  return children;
}

/**
 * Quét thư mục gold-data và xây dựng cây dữ liệu MỚI (fresh)
 */
function scanPhysicalData() {
  const modules = [];
  if (!fs.existsSync(markdownDir)) {
    logOutput.push(`[VALIDATE-SCAN] ❌ Error: Không tìm thấy thư mục: ${markdownDir}`);
    summary.errors++;
    return []; 
  }

  const moduleDirs = fs.readdirSync(markdownDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .sort(naturalSort);

  for (const moduleDir of moduleDirs) {
    const modulePath = path.join(markdownDir, moduleDir.name);
    const children = buildRecursiveTree(modulePath);
    if (children.length > 0) {
      modules.push({
        title: beautifyName(moduleDir.name),
        categories: children,
      });
    }
  }
  return modules;
}

// --- LOGIC SO SÁNH ĐỆ QUY (ĐÃ SỬA LỖI) ---

function compareTrees(genNodes, physNodes, pathPrefix, indent = "  ") {
  const maxLen = Math.max(genNodes.length, physNodes.length);

  if (genNodes.length !== physNodes.length) {
    logFail(indent, `Số lượng không khớp tại '${pathPrefix}': (Generated: ${genNodes.length}, Physical: ${physNodes.length})`);
  }

  for (let i = 0; i < maxLen; i++) {
    const gen = genNodes[i];
    const phys = physNodes[i];
    summary.nodesChecked++;

    if (!gen) {
      logFail(indent, `THIẾU trong 'Generated': Node vật lý '${phys.title || phys.text}' tồn tại nhưng không có trong restructuredNavData.`);
      continue;
    }
    if (!phys) {
      logFail(indent, `THỪA trong 'Generated': Node '${gen.title || gen.text}' có trong restructuredNavData nhưng không tìm thấy trên hệ thống tệp.`);
      continue;
    }

    if (gen.type !== phys.type) {
      logFail(indent, `Loại không khớp tại '${pathPrefix}': (Generated: ${gen.type}, Physical: ${phys.type}) cho '${gen.title || gen.text}'`);
      continue;
    }

    if (gen.type === 'link') {
      const currentPath = `${pathPrefix}/${phys.text || gen.text}`;
      let linkError = false;

      // Sửa lỗi kiểm tra tên rỗng
      if (!gen.text || gen.text.trim() === "") {
        // Chỉ báo lỗi nếu tên vật lý *không* rỗng (nghĩa là beautifyName đã thất bại)
        if (phys.text && phys.text.trim() !== "") {
            logFail(indent, `Link Text LÀ RỖNG (EMPTY) tại '${currentPath}' (Tên vật lý: ${phys.text})`);
            linkError = true;
        } else if (!phys.text || phys.text.trim() === "") {
            // Cả hai đều rỗng, đây là một lỗi trong logic beautifyName, nhưng chúng *khớp nhau*
             logFail(indent, `Link Text LÀ RỖNG (EMPTY) ở cả hai nguồn tại '${currentPath}'`);
             linkError = true;
        }
      }

      if (gen.text !== phys.text) {
        logFail(indent, `Link Text không khớp tại '${currentPath}': (Gen: '${gen.text}', Phys: '${phys.text}')`);
        linkError = true;
      }
      if (gen.href !== phys.href) {
        logFail(indent, `Link Href không khớp tại '${currentPath}': (Gen: '${gen.href}', Phys: '${phys.href}')`);
        linkError = true;
      }
      if (!linkError) {
        logPass(indent, `Link: ${gen.text}`);
        logDim(indent, `-> href: ${gen.href}`);
      }
    }

    if (gen.type === 'category') {
      const currentPath = `${pathPrefix}/${phys.title || gen.title}`;
      let categoryError = false;

      // Sửa lỗi kiểm tra tên rỗng
      if (!gen.title || gen.title.trim() === "") {
        if (phys.title && phys.title.trim() !== "") {
            logFail(indent, `Category Title LÀ RỖNG (EMPTY) tại '${currentPath}' (Tên vật lý: ${phys.title})`);
            categoryError = true;
        } else if (!phys.title || phys.title.trim() === "") {
             logFail(indent, `Category Title LÀ RỖNG (EMPTY) ở cả hai nguồn tại '${currentPath}'`);
             categoryError = true;
        }
      }

      if (gen.title !== phys.title) {
        logFail(indent, `Category Title không khớp tại '${currentPath}': (Gen: '${gen.title}', Phys: '${phys.title}')`);
        categoryError = true;
      }
      
      if (!categoryError) {
        logPass(indent, `Category: ${gen.title}`);
      }
      
      const genChildren = gen.children || [];
      const physChildren = phys.children || [];
      compareTrees(genChildren, physChildren, currentPath, indent + "  ");
    }
  }
}

// --- CHẠY BÀI TEST ---

function main() {
  logOutput.push("# Báo cáo Kiểm tra Cây thư mục Navigation");
  logOutput.push(`*Thời gian chạy: ${new Date().toISOString()}*`);
  logOutput.push(`\n[VALIDATE-NAV] Bắt đầu quét hệ thống tệp tại: ${markdownDir}...`);
  const freshlyScannedData = scanPhysicalData();
  
  if (summary.errors > 0 && freshlyScannedData.length === 0) {
     logFail("", "Quét hệ thống tệp thất bại. Hủy bỏ so sánh.");
  } else {
    logInfo("", "Quét hệ thống tệp hoàn tất.");
    logOutput.push(`\n[VALIDATE-NAV] Bắt đầu so sánh với 'restructuredNavData.generated.js'...`);

    const maxLen = Math.max(restructuredNavData.length, freshlyScannedData.length);
    if (restructuredNavData.length !== freshlyScannedData.length) {
      logFail("", `Số lượng Module gốc không khớp: (Generated: ${restructuredNavData.length}, Physical: ${freshlyScannedData.length})`);
    }

    for (let i = 0; i < maxLen; i++) {
      const genMod = restructuredNavData[i];
      const physMod = freshlyScannedData[i];

      if (!genMod) {
        logFail("", `THIẾU Module trong 'Generated': Module vật lý '${physMod.title}' tồn tại nhưng không có trong restructuredNavData.`);
        continue;
      }
      if (!physMod) {
        logFail("", `THỪA Module trong 'Generated': Module '${genMod.title}' có trong restructuredNavData nhưng không tìm thấy trên hệ thống tệp.`);
        continue;
      }

      if (genMod.title !== physMod.title) {
        logFail("", `Module Title không khớp: (Gen: '${genMod.title}', Phys: '${physMod.title}')`);
      }

      logTitle("", `📦 Module: ${genMod.title}`);
      compareTrees(genMod.categories || [], physMod.categories || [], genMod.title, "  ");
    }
  }

  // --- In tổng kết vào mảng log ---
  logOutput.push("\n" + "=".repeat(40));
  logInfo("", "Kiểm tra hoàn tất.");
  logOutput.push(`  Nodes đã kiểm tra: ${summary.nodesChecked}`);

  if (summary.errors === 0) {
    logPass("", `Tuyệt vời! restructuredNavData hoàn toàn đồng bộ với hệ thống tệp.`);
  } else {
    logFail("", `Đã tìm thấy ${summary.errors} lỗi. Vui lòng kiểm tra log bên trên.`);
    logInfo("", "Nếu lỗi là do bạn vừa thay đổi tệp, hãy chạy lại 'scripts/generate-navigation.js' để cập nhật.");
  }

  // --- GHI FILE ---
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    
    const logContent = logOutput.join('\n');
    fs.writeFileSync(outputFilePath, logContent, 'utf-8');
    
    console.log(`[VALIDATE-NAV] ✅ Đã ghi báo cáo vào: ${path.relative(path.join(__dirname, '..'), outputFilePath)}`);
  } catch (writeError) {
    console.error(`[VALIDATE-NAV] ❌ LỖI NGHIÊM TRỌNG: Không thể ghi file log tại ${outputFilePath}`, writeError);
  }
  
  process.exit(summary.errors === 0 ? 0 : 1);
}

main();