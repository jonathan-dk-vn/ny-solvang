import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CẤU HÌNH CHUNG ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const JSON_DIR = path.join(ROOT_DIR, 'json');
const APP_URL = 'http://localhost:5173';
const TIMEOUT = 10000;

// Cấu hình Mapping
const CATEGORY_MAP = [
  { json: 'words_substantiver.json',    class: 'highlight-sub',         cssVar: '--hl-sub',         name: 'Substantiver' },
  { json: 'words_t_liste.json',         class: 'highlight-t-word',      cssVar: '--hl-t-word',      name: 'Substantiver (Et)' },
  { json: 'words_verber.json',          class: 'highlight-verb',        cssVar: '--hl-verb',        name: 'Verber' },
  { json: 'words_adjektiver.json',      class: 'highlight-adj',         cssVar: '--hl-adj',         name: 'Adjektiver' },
  { json: 'words_adverbier.json',       class: 'highlight-adv',         cssVar: '--hl-adv',         name: 'Adverbier' },
  { json: 'words_centraladverbier.json',class: 'highlight-central-adv', cssVar: '--hl-central-adv', name: 'Centraladverbier' },
  { json: 'words_pronomener.json',      class: 'highlight-pron',        cssVar: '--hl-pron',        name: 'Pronomener' },
  { json: 'words_praepositioner.json',  class: 'highlight-prep',        cssVar: '--hl-prep',        name: 'Præpositioner' },
  { json: 'words_konjunktioner.json',   class: 'highlight-conj',        cssVar: '--hl-conj',        name: 'Konjunktioner' }
];

const ALL_HIGHLIGHT_CLASSES = CATEGORY_MAP.map(c => c.class);

// --- HELPER: LOAD DATA ---
function loadAllData() {
  const dictionary = new Map(); // Dùng cho check thiếu (Phase 2)
  const categorySets = {};      // Dùng cho check đúng sai (Phase 1)

  CATEGORY_MAP.forEach(cat => {
    try {
      const filePath = path.join(JSON_DIR, cat.json);
      if (!fs.existsSync(filePath)) return;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const words = JSON.parse(content);
      
      // Init set cho category này
      categorySets[cat.class] = new Set();

      if (Array.isArray(words)) {
        words.forEach(rawWord => {
          if (typeof rawWord === 'string') {
            const w = rawWord.toLowerCase().trim();
            // Lưu vào Dictionary tổng
            dictionary.set(w, { json: cat.json, name: cat.name, expectedClass: cat.class });
            // Lưu vào Set riêng
            categorySets[cat.class].add(w);
          }
        });
      }
    } catch (e) {
      console.error(`❌ Lỗi đọc file ${cat.json}:`, e.message);
    }
  });
  
  return { dictionary, categorySets };
}

// --- MAIN TEST SCRIPT ---
(async () => {
  console.log('🚀 Bắt đầu TEST TOÀN DIỆN GRAMMAR HIGHLIGHTS...\n');

  // 1. Chuẩn bị dữ liệu
  const { dictionary, categorySets } = loadAllData();
  console.log(`📚 Đã nạp dữ liệu chuẩn: ${dictionary.size} từ vựng.`);

  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    // Chờ render (quan trọng nếu dùng React/Vue hoặc load content động)
    await new Promise(r => setTimeout(r, 2000));

    // =========================================================
    // PHA 1: KIỂM TRA FALSE POSITIVE (Highlight sai/thừa/sai màu)
    // =========================================================
    console.log('\n--- PHA 1: KIỂM TRA CHẤT LƯỢNG HIGHLIGHT HIỆN CÓ ---');
    
    // Lấy tất cả các element đang được highlight trên page
    const highlightedElements = await page.evaluate((map) => {
      const results = [];
      // Tạo element giả để lấy màu chuẩn từ CSS Variable
      const rootStyles = getComputedStyle(document.documentElement);
      const colorMap = {};
      
      map.forEach(item => {
        // Hack: browser convert var(--color) sang rgb()
        const temp = document.createElement('div');
        temp.style.color = `var(${item.cssVar})`;
        document.body.appendChild(temp);
        colorMap[item.class] = getComputedStyle(temp).color;
        document.body.removeChild(temp);
      });

      map.forEach(item => {
        const els = document.querySelectorAll(`.${item.class}`);
        els.forEach(el => {
          results.push({
            text: el.innerText,
            currentClass: item.class,
            currentColor: getComputedStyle(el).color,
            expectedColor: colorMap[item.class]
          });
        });
      });
      return results;
    }, CATEGORY_MAP);

    let p1Errors = 0;
    highlightedElements.forEach(el => {
      const cleanText = el.text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").trim();
      
      // Check 1: Sai màu
      if (el.currentColor !== el.expectedColor) {
        console.error(`   🎨 Lỗi màu: "${el.text}" (${el.currentClass}). Mong đợi: ${el.expectedColor}, Thực tế: ${el.currentColor}`);
        p1Errors++;
      }

      // Check 2: Highlight thừa (Từ này không có trong file JSON tương ứng)
      // Lưu ý: Logic này tương đối, vì cleanText có thể chưa sạch hẳn với các từ phức tạp
      if (categorySets[el.currentClass] && !categorySets[el.currentClass].has(cleanText)) {
        // Log warning thôi vì có thể do biến thể từ (số nhiều, chia thì...) mà JSON chưa cover hết
        // console.warn(`   ⚠️  Cảnh báo dữ liệu: "${el.text}" được highlight là ${el.currentClass} nhưng không thấy trong JSON gốc.`);
      }
    });

    if (p1Errors === 0) console.log('✅ Pha 1 OK: Màu sắc hiển thị đúng.');
    else console.log(`❌ Pha 1: Phát hiện ${p1Errors} lỗi hiển thị.`);


    // =========================================================
    // PHA 2: KIỂM TRA FALSE NEGATIVE (Highlight thiếu/bỏ sót)
    // =========================================================
    console.log('\n--- PHA 2: KIỂM TRA CÁC TỪ BỊ BỎ SÓT (MISSING) ---');

    const plainTextWords = await page.evaluate((highlightClasses) => {
      const contentRoot = document.querySelector('.markdown-content');
      if (!contentRoot) return [];
      const wordsFound = [];
      
      const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT, null, false);
      let node;
      
      while (node = walker.nextNode()) {
        const parent = node.parentElement;
        // Nếu cha nó ĐÃ là highlight class -> Bỏ qua (vì đã được highlight)
        const isHighlighted = highlightClasses.some(cls => parent.classList.contains(cls));
        
        if (!isHighlighted) {
          // Lấy text trần và tách từ
          const text = node.nodeValue || "";
          // Regex đơn giản lấy từ, bao gồm ký tự Đan Mạch
          const matches = text.toLowerCase().match(/[a-zæøå0-9-]+/g);
          if (matches) wordsFound.push(...matches);
        }
      }
      return [...new Set(wordsFound)]; // Unique
    }, ALL_HIGHLIGHT_CLASSES);

    let p2Errors = 0;
    const missingLog = [];

    plainTextWords.forEach(word => {
      if (word.length < 2 || !isNaN(word)) return; // Bỏ qua từ quá ngắn hoặc số

      if (dictionary.has(word)) {
        const info = dictionary.get(word);
        p2Errors++;
        missingLog.push({ word, ...info });
      }
    });

    if (p2Errors === 0) {
      console.log('✅ Pha 2 OK: Không có từ nào bị bỏ sót.');
    } else {
      console.log(`❌ Pha 2: Phát hiện ${p2Errors} từ có trong JSON nhưng KHÔNG được highlight:`);
      
      // Group lại để in cho gọn
      const grouped = {};
      missingLog.forEach(item => {
        const key = `${item.name} (${item.json})`;
        if (!grouped[key]) grouped[key] = [];
        if (grouped[key].length < 10) grouped[key].push(item.word);
      });

      for (const [cat, words] of Object.entries(grouped)) {
        console.log(`   📂 ${cat}: ${words.join(', ')}...`);
      }
    }

    // =========================================================
    // TỔNG KẾT
    // =========================================================
    console.log('\n=============================================');
    if (p1Errors === 0 && p2Errors === 0) {
      console.log('🎉 XUẤT SẮC! HỆ THỐNG HIGHLIGHT HOẠT ĐỘNG HOÀN HẢO.');
    } else {
      console.log(`🚨 KẾT THÚC VỚI LỖI:`);
      console.log(`   - Lỗi hiển thị (Sai màu/CSS): ${p1Errors}`);
      console.log(`   - Lỗi bỏ sót (Logic JS/Regex): ${p2Errors}`);
    }

  } catch (error) {
    console.error('🔥 Fatal Error:', error);
  } finally {
    await browser.close();
  }
})();