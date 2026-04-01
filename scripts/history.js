// scripts/history.js
import { elements } from "./domElements.js";
import { toggleModal } from "./util/modal.js";
import { restructuredNavData } from "./navigationData.generated.js";
import { cleanHashForTitle } from "./navigation.js";
import debugLog from "./util/debug.js";

const HISTORY_STORAGE_KEY = 'user_page_history_v1';
const historyModalState = { isAnimating: false };
let pageHistory = []; // Array of { hash, title, timestamp }

/**
 * =============================================================================
 * NEW RECURSIVE FUNCTION (v3)
 * * Lấy tất cả các link objects từ cấu trúc cây mới.
 * =============================================================================
 */
function getAllLinksRecursive(nodes) {
  let links = [];
  if (!nodes) {
    return links;
  }
  
  for (const node of nodes) {
    // 1. Nếu node là 'link', thêm nó vào
    if (node.type === 'link') {
      links.push(node);
    }
    
    // 2. Nếu node là 'category', đệ quy vào children của nó
    if (node.type === 'category' && node.children) {
      links.push(...getAllLinksRecursive(node.children));
    }
  }
  return links;
}

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    pageHistory = storedHistory ? JSON.parse(storedHistory) : [];
  } catch (e) {
    pageHistory = [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pageHistory));
}

export function addPageToHistory(hash) {
  if (!hash) return;
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;

  const allNavLinks = restructuredNavData.flatMap(module => 
    getAllLinksRecursive(module.categories)
  );
    
  const linkData = allNavLinks.find(link => link.href === `#${cleanHash}`);
  const title = linkData ? linkData.text : cleanHashForTitle(cleanHash);

  // Xóa item cũ nếu đã tồn tại để đưa lên đầu
  pageHistory = pageHistory.filter(item => item.hash !== cleanHash);
  
  // Thêm item mới vào đầu danh sách
  pageHistory.unshift({ hash: cleanHash, title: title, timestamp: Date.now() });
  
  // Đã bỏ dòng cắt mảng (slice) để lưu không giới hạn

  saveHistory();
}

export function toggleHistoryModal() {
  const wasHidden = toggleModal(elements.historyModal, historyModalState);
  if (wasHidden) {
    populateHistoryModal();
  }
}

function populateHistoryModal() {
  const { historyModalList } = elements;
  if (!historyModalList) return;
  historyModalList.innerHTML = '';

  if (pageHistory.length === 0) {
    historyModalList.innerHTML = `<li class="p-8 text-center text-[var(--color-text-muted)]">Your browsing history is empty.</li>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  pageHistory.forEach((item, index) => {
    
    // --- LOGIC FORMAT ĐƯỜNG DẪN NHIỀU MÀU SẮC ---
    let displayHtml = item.title;
    try {
      const decodedHash = decodeURIComponent(item.hash);
      const parts = decodedHash.split('/'); // Cắt chuỗi theo dấu gạch chéo
      
      // Mảng mã màu cho từng cấp độ (sử dụng mã màu HEX tùy ý)
      // Bạn có thể đổi màu ở đây để phù hợp với Theme của bạn
      const levelColors = [
        'text-[#3b82f6]', // Cấp 1: Màu xanh dương (Blue)
        'text-[#10b981]', // Cấp 2: Màu xanh lá ngọc (Emerald)
        'text-[#f59e0b]', // Cấp 3: Màu vàng cam (Amber)
        'text-[#8b5cf6]', // Cấp 4: Màu tím (Violet)
        'text-[#ec4899]'  // Cấp 5: Màu hồng (Pink) - dự phòng
      ];
      
      // Lặp qua từng cấp, bọc thẻ <span> với màu tương ứng
      displayHtml = parts.map((part, i) => {
        const colorClass = levelColors[i % levelColors.length];
        return `<span class="${colorClass}">${part}</span>`;
      }).join('<span class="text-[var(--color-text-muted)] opacity-50 mx-1.5 font-normal">&gt;</span>');
      // Nối lại bằng dấu > (được làm mờ nhẹ đi để làm nổi bật text)
      
    } catch (e) {
      console.warn("Could not decode hash for history item", e);
      displayHtml = `<span class="text-[var(--color-text-headings)]">${item.title}</span>`; 
    }
    // ----------------------------------------

    const li = document.createElement('li');
    // Thêm min-w-0 để đảm bảo chữ dài quá sẽ được cắt gọn bằng dấu ba chấm (...)
    li.className = 'playlist-item cursor-pointer flex items-center gap-2 p-2 hover:bg-[var(--color-bg-interactive-hover)] rounded-lg transition-colors';
    li.innerHTML = `
      <span class="text-[var(--color-text-muted)] font-mono text-sm w-6 text-right flex-shrink-0">${index + 1}.</span>
      <div class="flex-grow min-w-0">
        <span class="block text-sm font-semibold truncate leading-relaxed">${displayHtml}</span>
        <small class="block text-xs text-[var(--color-text-muted)] mt-0.5">${formatTimeAgo(item.timestamp)}</small>
      </div>
    `;
    
    li.addEventListener('click', () => {
      window.location.hash = `#${item.hash}`;
      toggleHistoryModal();
    });
    
    fragment.appendChild(li);
  });
  
  historyModalList.appendChild(fragment);
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

export function initializeHistory() {
  loadHistory();
  elements.historyToggleBtn?.addEventListener('click', toggleHistoryModal);
  elements.historyModalCloseBtn?.addEventListener('click', toggleHistoryModal);
  elements.historyModal?.addEventListener('click', (e) => {
    if (e.target === elements.historyModal) toggleHistoryModal();
  });
  elements.historyClearBtn?.addEventListener('click', () => {
    pageHistory = [];
    saveHistory();
    populateHistoryModal();
    debugLog('🧹 Cleared browsing history.');
  });
}