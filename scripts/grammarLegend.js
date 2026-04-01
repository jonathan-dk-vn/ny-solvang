// scripts/grammarLegend.js

/**
 * FILE: scripts/grammarLegend.js
 * CHỨC NĂNG:
 * 1. Tạo thanh "Grammar Legend" nổi (Logic hiển thị & DOM).
 * 2. Quản lý trạng thái Bật/Tắt từ viết tắt (State Management).
 * 3. [TỐI ƯU] Xử lý format String cho Stacked Layout (Regex thay vì DOM).
 */

const STORAGE_KEY = 'grammar-legend-state';

// Danh sách các mục trong Legend
const LEGEND_ITEMS = [
  { label: 'C-Adv', colorVar: '--hl-central-adv', desc: 'Centraladverbier' },
  { label: 'Sub (n)', colorVar: '--hl-sub', desc: 'Substantiver (Danh từ)' },
  { label: 'Verb (vb)', colorVar: '--hl-verb', desc: 'Verber (Động từ)' },
  { label: 'Adj (adj)', colorVar: '--hl-adj', desc: 'Adjektiver (Tính từ)' },
  { label: 'Adv (adv)', colorVar: '--hl-adv', desc: 'Adverbier (Trạng từ)' },
  { label: 'Pron', colorVar: '--hl-pron', desc: 'Pronomener (Đại từ)' },
  { label: 'Prep', colorVar: '--hl-prep', desc: 'Præpositioner (Giới từ)' },
  { label: 'Conj', colorVar: '--hl-conj', desc: 'Konjunktioner (Liên từ)' },
  { label: 'T-Word', colorVar: '--hl-t-word', desc: 'T-Words' },
];

/**
 * [OPTIMIZED] Hàm xử lý chuỗi HTML thô (String Manipulation)
 * Thay vì thao tác DOM gây Layout Thrashing, ta dùng Regex để bọc thẻ ngay trong chuỗi HTML.
 * * @param {string} htmlString - Chuỗi HTML gốc chưa render
 * @returns {string} Chuỗi HTML đã được bọc thẻ .grammar-stack
 */
export function formatStackedAbbreviations(htmlString) {
  if (!htmlString) return htmlString;

  // Regex giải thích:
  // 1. Group $1: Thẻ span thứ nhất (Từ vựng)
  //    - class chứa 'highlight-'
  //    - class KHÔNG chứa 'word-abbr' (sử dụng negative lookahead: (?![^"]*word-abbr))
  // 2. \s*: Khoảng trắng giữa 2 thẻ (nếu có)
  // 3. Group $2: Thẻ span thứ hai (Viết tắt)
  //    - class chứa 'word-abbr'
  
  // Flag 'g': tìm tất cả, 'i': không phân biệt hoa thường, 's': dotAll (cho phép . khớp xuống dòng)
  const pattern = /(<span\s+[^>]*class="(?![^"]*word-abbr)[^"]*highlight-[^"]*"[^>]*>.*?<\/span>)\s*(<span\s+[^>]*class="[^"]*word-abbr[^"]*"[^>]*>.*?<\/span>)/gis;

  // Thực hiện thay thế chuỗi: Bọc Group 1 và Group 2 vào trong thẻ cha
  return htmlString.replace(pattern, '<span class="grammar-stack">$1$2</span>');
}

// =========================================================
// HELPER FUNCTIONS (Internal)
// =========================================================

function setLegendState(isOff) {
  localStorage.setItem(STORAGE_KEY, isOff ? 'off' : 'on');
  applyStateToDOM(isOff);
}

function applyStateToDOM(isOff) {
  if (isOff) {
    document.body.classList.add('grammar-legend-off');
  } else {
    document.body.classList.remove('grammar-legend-off');
  }

  const toggleBtn = document.querySelector('#grammar-legend-bar .legend-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = isOff ? 'Off' : 'On';
    if (isOff) {
      toggleBtn.style.opacity = '0.7';
      toggleBtn.style.backgroundColor = 'var(--color-bg-section)';
    } else {
      toggleBtn.style.opacity = '1';
      toggleBtn.style.backgroundColor = 'transparent';
    }
  }

  updateRadioButtons(isOff);
}

function updateRadioButtons(isOff) {
  const radioOff = document.getElementById('legend-off');
  const radioOn = document.getElementById('legend-on');
  
  if (radioOff && radioOn) {
    radioOff.checked = isOff;
    radioOn.checked = !isOff;
  }
}