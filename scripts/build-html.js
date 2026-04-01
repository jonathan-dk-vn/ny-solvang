import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import chokidar from "chokidar";
import { fileURLToPath } from "url";
import { parse } from "node-html-parser";
import pLimit from "p-limit";

// =============================================================================
// 1. CẤU HÌNH & KHỞI TẠO
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFolder = process.env.DATA_FOLDER || "quintessential-essence";
const markdownDir = path.join(__dirname, "..", "public", dataFolder);

// Giới hạn xử lý song song
const limit = pLimit(20);

console.log(`[CONFIG] Markdown Input: ${markdownDir}`);
console.log(
  `[CONFIG] HTML Output:    (Double Build: html-data & html-data-en)`,
); // Đã sửa dòng này

// --- CẤU HÌNH NGUỒN TỪ VỰNG ---
// ==========================================
// 1. CẤU HÌNH CHO THƯ MỤC 'json' (ĐAN MẠCH / VIỆT)
// ==========================================
const WORD_SOURCES_DA = [
  {
    file: "words_substantiver.json",
    className: "highlight-sub",
    abbr: "(danh từ)",
    priority: 1,
  },
  {
    file: "words_adjektiver.json",
    className: "highlight-adj",
    abbr: "(tính từ)",
    priority: 1,
  },
  {
    file: "words_adverbier.json",
    className: "highlight-adv",
    abbr: "(trạng từ)",
    priority: 1,
  },
  {
    file: "words_praepositioner.json",
    className: "highlight-prep",
    abbr: "(giới từ)",
    priority: 1,
  },
  {
    file: "words_konjunktioner.json",
    className: "highlight-conj",
    abbr: "(liên từ)",
    priority: 1,
  },
  {
    file: "data-verb-navnem-output.json",
    className: "highlight-verb-inf",
    abbr: "(nguyên mẫu)",
    priority: 2,
  },
  {
    file: "data-verb-nutid-output.json",
    className: "highlight-verb-pres",
    abbr: "(hiện tại)",
    priority: 2,
  },
  {
    file: "data-verb-datid-output.json",
    className: "highlight-verb-past",
    abbr: "(động từ quá khứ)",
    priority: 2,
  },
  {
    file: "data-verb-førnutid-output.json",
    className: "highlight-verb-perf",
    abbr: "(hiện tại hoàn thành)",
    priority: 2,
  },
  {
    file: "data-verb-førdatid-output.json",
    className: "highlight-verb-pastperf",
    abbr: "(quá khứ hoàn thành)",
    priority: 2,
  },
  {
    file: "data-verb-bydem-output.json",
    className: "highlight-verb-imp",
    abbr: "(mệnh lệnh)",
    priority: 2,
  },
  {
    file: "words_centraladverbier.json",
    className: "highlight-central-adv",
    abbr: "(trạng từ trung tâm)",
    priority: 2,
  },
  {
    file: "words_pronomener.json",
    className: "highlight-pron",
    abbr: "(đại từ)",
    priority: 3,
  },
  {
    file: "words_t_liste.json",
    className: "highlight-t-word",
    abbr: "(t-từ)",
    priority: 3,
  },
];

// ==========================================
// 2. CẤU HÌNH CHO THƯ MỤC 'json-english' (TIẾNG ANH)
// ==========================================
const WORD_SOURCES_EN = [
  // Tên file giữ nguyên theo thư mục json-english, chỉ đổi abbr sang tiếng Anh
  {
    file: "words_substantiver.json",
    className: "highlight-sub",
    abbr: "(noun)",
    priority: 1,
  },
  {
    file: "words_adjektiver.json",
    className: "highlight-adj",
    abbr: "(adj)",
    priority: 1,
  },
  {
    file: "words_adverbier.json",
    className: "highlight-adv",
    abbr: "(adv)",
    priority: 1,
  },
  {
    file: "words_praepositioner.json",
    className: "highlight-prep",
    abbr: "(prep)",
    priority: 1,
  },
  {
    file: "words_konjunktioner.json",
    className: "highlight-conj",
    abbr: "(conj)",
    priority: 1,
  },
  {
    file: "data-verb-navnem-output.json",
    className: "highlight-verb-inf",
    abbr: "(infinitive)",
    priority: 2,
  },
  {
    file: "data-verb-nutid-output.json",
    className: "highlight-verb-pres",
    abbr: "(present verb)",
    priority: 2,
  },
  {
    file: "data-verb-datid-output.json",
    className: "highlight-verb-past",
    abbr: "(past verb)",
    priority: 2,
  },
  {
    file: "data-verb-førnutid-output.json",
    className: "highlight-verb-perf",
    abbr: "(present perf)",
    priority: 2,
  },
  {
    file: "data-verb-førdatid-output.json",
    className: "highlight-verb-pastperf",
    abbr: "(past perf)",
    priority: 2,
  },
  {
    file: "data-verb-bydem-output.json",
    className: "highlight-verb-imp",
    abbr: "(imperative)",
    priority: 2,
  },
  {
    file: "words_centraladverbier.json",
    className: "highlight-central-adv",
    abbr: "(central adv)",
    priority: 2,
  },
  {
    file: "words_pronomener.json",
    className: "highlight-pron",
    abbr: "(pronoun)",
    priority: 3,
  },
  {
    file: "words_t_liste.json",
    className: "highlight-t-word",
    abbr: "(t-word)",
    priority: 3,
  },
];

const wordMap = new Map();
let DYNAMIC_SEARCH_REGEX = null;
let HOMOGRAPHS = new Set();

// =============================================================================
// 2. LOAD DATA
// =============================================================================

// [REPLACE] Toàn bộ hàm loadWordData cũ bằng hàm này
async function loadWordData(currentJsonFolder, activeWordSources) {
  wordMap.clear();
  HOMOGRAPHS.clear();
  let totalWords = 0;

  console.log(`[INIT] ⏳ Đang tải từ điển...`);

  // BƯỚC 1: Tải tất cả file vào bộ nhớ đệm (Buffer) - Vẫn chạy song song cho nhanh
  const loadedDictionaries = [];

  const dictPromises = activeWordSources.map((source) =>
    limit(async () => {
      const filePath = path.join(currentJsonFolder, source.file);
      try {
        await fs.access(filePath);
        const content = await fs.readFile(filePath, "utf-8");
        const words = JSON.parse(content);

        // Lưu tạm vào mảng chứ chưa ghi vào Map ngay
        loadedDictionaries.push({
          source: source,
          words: words,
        });
      } catch (err) {
        if (err.code !== "ENOENT")
          console.warn(`[WARN] Lỗi đọc ${source.file}: ${err.message}`);
      }
    }),
  );

  // Xử lý riêng file homographs (không đổi)
  const homographPromise = limit(async () => {
    const filePath = path.join(currentJsonFolder, "homographs.json");
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach((w) => HOMOGRAPHS.add(w.trim().toLowerCase()));
        console.log(`[INIT] ✅ Đã load ${HOMOGRAPHS.size} homographs.`);
      }
    } catch (err) {
      console.warn(`[WARN] Không thể load homographs.json: ${err.message}`);
    }
  });

  // Đợi tất cả các file tải xong hoàn toàn
  await Promise.all([...dictPromises, homographPromise]);

  // =========================================================================
  // BƯỚC 1.5: STRICT FILTERING (T-WORD overrides SUBSTANTIVER)
  // Logic: Loại bỏ từ khỏi danh sách Substantiver nếu:
  // 1. Nó trùng khớp hoàn toàn với T-word.
  // 2. Nó là một cụm từ (ví dụ "et gardin") chứa một T-word ("gardin").
  // =========================================================================
  const tListEntry = loadedDictionaries.find(
    (item) => item.source.file === "words_t_liste.json",
  );
  const subListEntry = loadedDictionaries.find(
    (item) => item.source.file === "words_substantiver.json",
  );

  if (
    tListEntry &&
    subListEntry &&
    Array.isArray(tListEntry.words) &&
    Array.isArray(subListEntry.words)
  ) {
    // Tạo Set chứa toàn bộ T-words để tra cứu nhanh
    const tSet = new Set(tListEntry.words.map((w) => w.toLowerCase().trim()));
    const originalCount = subListEntry.words.length;

    // Lọc danh sách Substantiver
    subListEntry.words = subListEntry.words.filter((word) => {
      const lower = word.toLowerCase().trim();

      // Check 1: Trùng khớp hoàn toàn
      if (tSet.has(lower)) return false;

      // Check 2: Cụm từ chứa T-word (Quan trọng cho "et gardin", "et loft"...)
      const parts = lower.split(/\s+/); // Tách từ theo khoảng trắng
      if (parts.length > 1) {
        // Nếu bất kỳ từ thành phần nào là T-word -> Loại bỏ cả cụm này
        // Lý do: Để hệ thống match từng từ riêng lẻ (match "et" riêng, "gardin" riêng)
        const containsTWord = parts.some((part) => tSet.has(part));
        if (containsTWord) return false;
      }

      return true;
    });

    console.log(
      `[FILTER] 🧹 Đã loại bỏ ${originalCount - subListEntry.words.length} từ/cụm từ khỏi danh sách Substantiver (do ưu tiên T-list).`,
    );
  }
  // =========================================================================

  // BƯỚC 2: Sắp xếp dữ liệu theo Priority (Thấp -> Cao)
  // Priority 1 (Substantiver) sẽ được xử lý trước.
  // Priority 3 (T-Word) sẽ được xử lý sau -> GHI ĐÈ lên Priority 1.
  loadedDictionaries.sort((a, b) => a.source.priority - b.source.priority);

  // BƯỚC 3: Ghi vào Map tuần tự (Đồng bộ)
  for (const item of loadedDictionaries) {
    if (Array.isArray(item.words)) {
      for (const w of item.words) {
        if (typeof w === "string") {
          const lower = w.trim().toLowerCase();
          if (lower) {
            // Logic ghi đè: Do đã sort, priority cao luôn thắng
            wordMap.set(lower, {
              className: item.source.className,
              abbr: item.source.abbr,
            });
            totalWords++;
          }
        }
      }
    }
  }

  console.log(`[INIT] ✅ Tổng cộng ${totalWords} từ vựng sau khi gộp.`);

  // BƯỚC 4: Tạo Regex (Giữ nguyên logic cũ)
  const allKeys = Array.from(wordMap.keys());
  // Sort dài trước ngắn sau để regex khớp từ dài nhất có thể
  allKeys.sort((a, b) => b.length - a.length);

  const pattern = allKeys
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  if (pattern.length > 0) {
    DYNAMIC_SEARCH_REGEX = new RegExp(
      `(?<![\\p{L}\\p{N}_])(${pattern})(?![\\p{L}\\p{N}_])`,
      "giu",
    );
    console.log(`[INIT] ✅ Đã tạo Strict Dynamic Regex.`);
  }
}

// =============================================================================
// 3. HTML POST-PROCESSING
// =============================================================================

function highlightWordsInHtml(htmlContent) {
  if (wordMap.size === 0 || !DYNAMIC_SEARCH_REGEX) return htmlContent;
  const root = parse(htmlContent);
  const IGNORED_TAGS = new Set([
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "A",
    "BUTTON",
  ]);

  function traverse(node) {
    const tagName = node.tagName ? node.tagName.toUpperCase() : null;
    if (tagName && IGNORED_TAGS.has(tagName)) return;

    if (node.nodeType === 3) {
      const text = node.text;
      if (!text || !text.trim()) return;

      const newText = text.replace(DYNAMIC_SEARCH_REGEX, (match) => {
        const lower = match.toLowerCase();
        const entry = wordMap.get(lower);
        if (entry) {
          const isHomograph = HOMOGRAPHS.has(lower);
          if (!isHomograph) {
            return `__HL_OPEN__${entry.className}__HL_MID__${match}__HL_CLOSE____AB_OPEN__${entry.className}__AB_MID__${entry.abbr}__AB_CLOSE__`;
          }
        }
        return match;
      });

      if (newText !== text) node.textContent = newText;
    } else {
      if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.forEach(traverse);
      }
    }
  }

  traverse(root);
  return root
    .toString()
    .replace(/__HL_OPEN__/g, '<span class="')
    .replace(/__HL_MID__/g, '">')
    .replace(/__HL_CLOSE__/g, "</span>")
    .replace(/__AB_OPEN__/g, ' <span class="word-abbr ')
    .replace(/__AB_MID__/g, '">')
    .replace(/__AB_CLOSE__/g, "</span>");
}

function enhanceExerciseHtml(htmlContent) {
  let processed = htmlContent;
  processed = processed.replace(
    /_{3,}/g,
    '<input type="text" class="exercise-input" autocomplete="off" spellcheck="false" />',
  );

  const root = parse(processed);
  const newRoot = parse('<div class="markdown-rendered"></div>');
  const container = newRoot.firstChild;
  let currentSection = null;

  root.childNodes.forEach((node) => {
    if (node.tagName === "H2" && node.text.trim().startsWith("Opgave")) {
      currentSection = parse(
        '<section class="exercise-card"></section>',
      ).firstChild;
      container.appendChild(currentSection);
      currentSection.appendChild(node);
    } else if (node.tagName === "H2") {
      currentSection = null;
      container.appendChild(node);
    } else {
      if (currentSection) {
        currentSection.appendChild(node);
      } else {
        container.appendChild(node);
      }
    }
  });

  const instructionKeywords = [
    "Holdrunde",
    "Gruppearbejde",
    "Makkerarbejde",
    "Klassearbejde",
  ];
  function findFirstStrong(node) {
    if (!node.childNodes) return null;
    for (const child of node.childNodes) {
      if (child.tagName === "STRONG") return child;
      if (!child.tagName || child.tagName === "SPAN") {
        const res = findFirstStrong(child);
        if (res) return res;
      }
    }
    return null;
  }

  container.querySelectorAll("p").forEach((p) => {
    const text = p.textContent.trim();
    const hasKeyword = instructionKeywords.some((kw) => text.includes(kw));
    if (hasKeyword) {
      const strongNode = findFirstStrong(p);
      if (
        strongNode &&
        instructionKeywords.some((kw) => strongNode.textContent.includes(kw))
      ) {
        p.setAttribute(
          "class",
          (p.getAttribute("class") || "") + " instruction-box",
        );
      }
    }
  });

  return newRoot.toString();
}

// =============================================================================
// 4. MARKDOWN PRE-PROCESSING & PROCESSING
// =============================================================================

function smartPreprocessMarkdown(content) {
  const lines = content.split("\n");
  let inCodeFence = false;
  return lines
    .map((line) => {
      if (line.trim().startsWith("```")) {
        inCodeFence = !inCodeFence;
        return line;
      }
      if (inCodeFence) return line;
      const deepIndentRegex = /^( {4,})/;
      const match = line.match(deepIndentRegex);
      if (match) {
        const trimmed = line.trim();
        if (/^([-*+]|\d+\.)\s/.test(trimmed)) return line;
        return "  " + trimmed;
      }
      return line;
    })
    .join("\n");
}

function enhanceNestedTranslations(htmlContent) {
  const root = parse(htmlContent);

  // Chỉ tìm trong các bảng thường (đã được bọc bởi markdown-table-wrapper)
  const cells = root.querySelectorAll(
    ".markdown-table-wrapper td, .markdown-table-wrapper th",
  );

  cells.forEach((cell) => {
    let html = cell.innerHTML.trim();

    // Regex thông minh bóc tách 3 thành phần: Bản gốc, (Dịch 1), (Dịch 2)
    // Hỗ trợ cách nhau bằng dấu cách hoặc thẻ <br> (nếu người dùng ép xuống dòng trong markdown table)
    const transRegex =
      /^(.*?)(?:\s*<br\s*\/?>\s*|\s+)\((.*?)\)(?:\s*<br\s*\/?>\s*|\s+)\((.*?)\)\s*$/i;

    const match = html.match(transRegex);

    if (match) {
      // Bóc tách thành công
      const original = match[1].trim();
      const trans1 = match[2].trim();
      const trans2 = match[3].trim();

      // Thay thế nội dung của ô bằng cấu trúc HTML mới
      // Đặt class đồng bộ với hệ thống Translation Control có sẵn trong main.js
      cell.innerHTML = `
        <div class="nested-translation-cell">
          <div class="col-original">${original}</div>
          <div class="col-trans1 translation-text">${trans1}</div>
          <div class="col-trans2 translation-text">${trans2}</div>
        </div>
      `;
      // Thêm class cho thẻ td cha để dễ style bằng CSS
      cell.classList.add("has-nested-translation");
    }
  });

  return root.toString();
}

const isHeadingLine = (line) => /^\s*#{1,6}\s/.test(line);
const isTableLine = (line) => /^\s*\|.*\|?\s*$/.test(line);
const stripBlockquote = (s) => (s || "").replace(/^\s*>+\s*/, "");

async function processMarkdownFile(filePath, currentOutputDir) {
  try {
    // 1. Đọc nội dung Markdown gốc để lưu trữ nguyên bản
    let rawContent = await fs.readFile(filePath, "utf-8");

    // 2. Tiền xử lý nội dung cho phần giao diện chính (Rich HTML)
    let content = smartPreprocessMarkdown(rawContent);

    const lines = content.split("\n");
    const out = [];
    let currentHeadingText = "";

    // Text Buffer: Gom các dòng text lại để xử lý ngắt dòng HTML đúng chuẩn
    let textBuffer = [];

    // Helper: Flush buffered text
    const flushBuffer = () => {
      if (textBuffer.length > 0) {
        // Join lines with newline space to preserve sentence flow
        const combined = textBuffer.join("\n");
        if (combined.trim()) {
          out.push(marked.parse(combined));
        }
        textBuffer = [];
      }
    };

    let i = 0;
    const len = lines.length;

    while (i < len) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Empty lines trigger flush (paragraph break)
      if (!trimmedLine) {
        flushBuffer();
        i++;
        continue;
      }

      // 1. Code Blocks
      if (trimmedLine.startsWith("```")) {
        flushBuffer(); // Stop previous paragraph
        const codeLines = [line];
        i++;
        while (i < len) {
          codeLines.push(lines[i]);
          if (lines[i].trim().startsWith("```")) {
            i++;
            break;
          }
          i++;
        }
        let renderedCode = marked.parse(codeLines.join("\n"));
        if (!renderedCode.includes('class="language-')) {
          renderedCode = renderedCode
            .replace("<pre><code>", '<pre class="grammar-block">')
            .replace("</code></pre>", "</pre>");
        }
        out.push(renderedCode);
        continue;
      }

      // 2. Audio Button
      if (trimmedLine.startsWith("audiosrc:")) {
        flushBuffer();
        const audioSrc = trimmedLine.substring(9).trim().replace(/\\/g, "");
        const buttonText = currentHeadingText || path.basename(filePath, ".md");
        out.push(
          `<p><button class="content-play-btn" data-audiosrc="${audioSrc}"><span>${buttonText}</span></button></p>`,
        );
        i++;
        continue;
      }

      // 3. Images
      if (trimmedLine.startsWith("imgsrc:")) {
        flushBuffer();
        let imgSrc = trimmedLine.substring(7).trim();
        if (imgSrc.startsWith("public/")) imgSrc = imgSrc.substring(7);
        const altText = currentHeadingText || path.basename(filePath, ".md");
        out.push(
          `<img src="${imgSrc}" alt="${altText}" class="content-image" loading="lazy" />`,
        );
        i++;
        continue;
      }

      // 4. HTML Link
      if (trimmedLine.startsWith("htmlsrc:")) {
        flushBuffer();
        const fullPath = trimmedLine.substring(8).trim();
        const fileNameWithExt = path.basename(fullPath);
        const displayName = fileNameWithExt.replace(/\.html$/i, "");
        const htmlMatch = fullPath.match(/[\/\\]html[\/\\].*$/i);
        let relativeUrl = htmlMatch
          ? htmlMatch[0].replace(/\\/g, "/")
          : `/${fileNameWithExt}`;
        if (!relativeUrl.startsWith("/")) relativeUrl = "/" + relativeUrl;

        const isDevelopment = process.env.NODE_ENV === "development";
        const finalUrl = isDevelopment
          ? `http://127.0.0.1:5501${relativeUrl}`
          : relativeUrl;

        out.push(`
          <p class="special-link-container">
            <a href="${finalUrl}" target="_blank" class="fancy-html-link">
              <span class="link-icon">🔗</span>
              <span class="link-text">${displayName}</span>
            </a>
          </p>
        `);
        i++;
        continue;
      }

      // 5. Parallel Translations
      if (!isTableLine(trimmedLine)) {
        const translations = [];
        // Look ahead for translation lines
        let nextIndex = i + 1;
        let foundTranslation = false;

        // Peek logic
        let tempJ = nextIndex;
        while (tempJ < len) {
          const nextStr = stripBlockquote(lines[tempJ] || "").trim();
          if (nextStr.startsWith("(") && nextStr.endsWith(")")) {
            translations.push(nextStr.slice(1, -1));
            foundTranslation = true;
            tempJ++;
          } else if (nextStr === "") {
            tempJ++;
          } else {
            break;
          }
        }

        if (foundTranslation) {
          flushBuffer(); // Flush any pending text before the table

          const originalLine = trimmedLine;
          const headingMatch = originalLine.match(/^(\s*#{1,6})\s/);
          const isHeader = !!headingMatch;
          const headerPrefix = isHeader ? headingMatch[1] + " " : "";
          if (isHeader)
            currentHeadingText = originalLine.replace(/#{1,6}\s*/, "").trim();

          const renderCell = (txt) =>
            isHeader ? marked.parse(txt) : marked.parseInline(txt);

          let tableHtml = '<table class="parallel-translations"><tbody><tr>';
          tableHtml += `<td data-label="Original">${renderCell(stripBlockquote(originalLine))}</td>`;
          translations.forEach((t, idx) => {
            tableHtml += `<td data-label="Translation ${idx + 1}">${renderCell(isHeader ? headerPrefix + t : t)}</td>`;
          });
          tableHtml += "</tr></tbody></table>\n";
          out.push(tableHtml);
          i = tempJ; // Skip past translation lines
          continue;
        }
      }

      // 6. Tables
      if (isTableLine(trimmedLine)) {
        flushBuffer();
        const tableLines = [line];
        let j = i + 1;
        while (j < len && lines[j].trim() !== "" && isTableLine(lines[j])) {
          tableLines.push(lines[j]);
          j++;
        }
        out.push(
          `<div class="markdown-table-wrapper">${marked.parse(tableLines.join("\n"))}</div>`,
        );
        i = j;
        continue;
      }

      // 7. Headings & Normal Text
      if (isHeadingLine(trimmedLine)) {
        // Headings are blocks, so flush before them
        flushBuffer();
        currentHeadingText = trimmedLine.replace(/#{1,6}\s*/, "").trim();
        // Treat heading as a single line block to be parsed immediately
        out.push(marked.parse(line));
      } else {
        // Normal text line -> Buffer it!
        textBuffer.push(line);
      }
      i++;
    }

    // Flush remaining buffer at end of file
    flushBuffer();

    let htmlContent = `<div class="markdown-rendered">${out.join("\n")}</div>`;

    htmlContent = highlightWordsInHtml(htmlContent);
    htmlContent = enhanceExerciseHtml(htmlContent);
    htmlContent = enhanceNestedTranslations(htmlContent);

    // Parse rawContent để lấy HTML thuần tuý mà không cần xử lý tuỳ chỉnh
    // =========================================================================
    // 3. THÊM MỚI: TẠO VÀ BỔ SUNG PHẦN BASIC HTML TỪ MARKDOWN GỐC (ĐÃ NÂNG CẤP)
    // =========================================================================

    // 3.1. Tách nội dung Markdown gốc thành từng dòng
    const rawLines = rawContent.split("\n");

    // 3.2. Lọc bỏ các dòng chứa bản dịch (Parallel Translations)
    const filteredRawLines = rawLines.filter((line) => {
      // Regex này bắt các dòng:
      // - Bắt đầu bằng khoảng trắng hoặc dấu blockquote (>)
      // - Theo sau là dấu (
      // - Chứa nội dung bất kỳ
      // - Kết thúc bằng dấu ) và khoảng trắng
      const isTranslationLine = /^\s*>*\s*\(.*?\)\s*$/.test(line);

      // Trả về false để LOẠI BỎ dòng này, true để GIỮ LẠI
      return !isTranslationLine;
    });

    // 3.3. (Tuỳ chọn bổ sung) Xoá bản dịch lồng trong bảng (Nested Translations)
    // Ví dụ: | Jeg (I) (Tôi) | -> | Jeg |
    const cleanedRawContent = filteredRawLines
      .join("\n")
      .replace(
        /(\s*<br\s*\/?>\s*|\s+)\(.*?\)(\s*<br\s*\/?>\s*|\s+)\(.*?\)/gi,
        "",
      );

    // 3.4. Biên dịch nội dung đã làm sạch thành HTML thuần
    const basicHtml = marked.parse(cleanedRawContent);

    // BỌC 2 PHIÊN BẢN VÀO 2 CONTAINER RIÊNG BIỆT (MỚI)
    let finalHtmlContent = `
      <div id="rich-content-view">
        ${htmlContent}
      </div>
      <div id="raw-content-view" style="display: none;">
        <div class="basic-markdown-rendered">
          ${basicHtml}
        </div>
      </div>
    `;

    const rel = path.relative(markdownDir, filePath).replace(/\.md$/i, ".html");
    const outputFilePath = path.join(currentOutputDir, rel);
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
    // LƯU Ý: Đổi htmlContent thành finalHtmlContent ở hàm writeFile
    await fs.writeFile(outputFilePath, finalHtmlContent, "utf-8");
  } catch (err) {
    console.error(`[ERROR] ${filePath}:`, err.message);
  }
}
async function buildLanguagePipeline(langConfig) {
  // Thêm wordSources vào đây
  const { jsonFolderName, outputDirName, wordSources } = langConfig;
  const currentJsonFolder = path.join(
    __dirname,
    "..",
    "public",
    jsonFolderName,
  );
  const currentOutputDir = path.join(__dirname, "..", "public", outputDirName);

  console.log(`\n===========================================`);
  console.log(`🚀 BẮT ĐẦU BUILD: ${jsonFolderName.toUpperCase()}`);
  console.log(`===========================================`);

  // Truyền wordSources vào hàm loadWordData
  await loadWordData(currentJsonFolder, wordSources);

  async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
      }),
    );
    return files.flat();
  }

  try {
    await fs.rm(currentOutputDir, { recursive: true, force: true });
    const allFiles = await getFiles(markdownDir);
    const mdFiles = allFiles.filter((f) => f.endsWith(".md"));
    const tasks = mdFiles.map((f) =>
      limit(() => processMarkdownFile(f, currentOutputDir)),
    );
    await Promise.all(tasks);
    console.log(
      `[DONE] Đã build xong ${mdFiles.length} files vào ${outputDirName}.`,
    );
  } catch (e) {
    console.error("[ERROR]", e);
  }
}

async function buildAll() {
  console.time("Total Build Time");

  // 1. Build cho Đan Mạch
  await buildLanguagePipeline({
    jsonFolderName: "json",
    outputDirName: "html-data",
    wordSources: WORD_SOURCES_DA, // Truyền bộ Đan Mạch
  });

  // 2. Build cho Tiếng Anh
  await buildLanguagePipeline({
    jsonFolderName: "json-english",
    outputDirName: "html-data-en",
    wordSources: WORD_SOURCES_EN, // Truyền bộ Tiếng Anh
  });

  console.timeEnd("Total Build Time");
}

// =============================================================================
// 6. RUN & WATCH
// =============================================================================

// =============================================================================
// 6. RUN & WATCH
// =============================================================================

// Bỏ bớt 1 dòng comment "// 6. RUN & WATCH" bị lặp thừa của bạn đi nhé

if (process.argv.includes("--watch")) {
  await buildAll();
  console.log(`\n[WATCH] Đang theo dõi...`);

  const jsonFolderDa = path.join(__dirname, "..", "public", "json");
  const jsonFolderEn = path.join(__dirname, "..", "public", "json-english");

  const watcher = chokidar.watch([markdownDir, jsonFolderDa, jsonFolderEn], {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  watcher.on("all", async (event, filePath) => {
    if (filePath.endsWith(".json")) {
      console.log("[WATCH] Từ điển thay đổi. Rebuild toàn bộ...");
      await buildAll();
    } else if (filePath.endsWith(".md")) {
      if (event !== "unlink") {
        console.log(`\n[WATCH] File thay đổi: ${path.basename(filePath)}`);

        const outDirDa = path.join(__dirname, "..", "public", "html-data");
        const outDirEn = path.join(__dirname, "..", "public", "html-data-en");

        // 1. Nạp từ điển Đan Mạch và Build file
        await loadWordData(jsonFolderDa, WORD_SOURCES_DA);
        await processMarkdownFile(filePath, outDirDa);

        // 2. Nạp từ điển Tiếng Anh và Build file
        await loadWordData(jsonFolderEn, WORD_SOURCES_EN);
        await processMarkdownFile(filePath, outDirEn);

        console.log(`[WATCH] ✅ Đã cập nhật file HTML cho cả 2 ngôn ngữ.`);
      }
    }
  });
} else {
  buildAll();
}
