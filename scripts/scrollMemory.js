// scripts/scrollMemory.js
import { elements } from "./domElements.js";
import debugLog from "./util/debug.js";

const STORAGE_KEY = 'user_scroll_memory_v1';
let scrollMemory = {};
let intersectionObserver = null;
let debounceTimeout = null;

/**
 * Loads scroll position data from localStorage.
 */
function loadScrollMemory() {
  try {
    const storedMemory = localStorage.getItem(STORAGE_KEY);
    scrollMemory = storedMemory ? JSON.parse(storedMemory) : {};
    debugLog('🧠 Scroll Memory loaded:', scrollMemory);
  } catch (e) {
    debugLog('error', 'Failed to load scroll memory:', e);
    scrollMemory = {};
  }
}

/**
 * Saves the current reading position for a specific page, debounced for performance.
 * [OPTIMIZED] Uses existing timeout reference correctly.
 */
function saveReadingPosition(pageHash, headingId) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    scrollMemory[pageHash] = headingId;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scrollMemory));
      // Log level 'debug' instead of info to reduce console noise
      debugLog('debug', `🧠 Saved position for #${pageHash}: ${headingId}`);
    } catch (e) {
      debugLog('error', 'Failed to save scroll memory:', e);
    }
  }, 500); // Debounce 500ms
}

/**
 * Sets up an IntersectionObserver to track the topmost heading in the viewport.
 * [OPTIMIZED] Removed unnecessary array sorting.
 */
function setupPositionObserver() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  const contentContainer = elements.contentDiv?.querySelector(".markdown-rendered");
  if (!contentContainer) return;

  const headings = contentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (headings.length === 0) return;

  const observerOptions = {
    root: null,
    // [TRICK] rootMargin này tạo một "đường kẻ" vô hình ở khoảng 15% từ trên xuống.
    // Chỉ những heading băng qua đường kẻ này mới kích hoạt callback.
    rootMargin: "0px 0px -85% 0px", 
    threshold: 0, // Chỉ cần chạm nhẹ là tính
  };

  intersectionObserver = new IntersectionObserver((entries) => {
    // [PERFORMANCE] Không sort lại mảng entries.
    // Entries chỉ chứa những phần tử CÓ THAY ĐỔI trạng thái.
    // Ta chỉ cần tìm phần tử nào đang INTERSECTING là được.
    
    let activeEntry = null;
    // Lặp để tìm entry active mới nhất (nếu có nhiều cái cùng lúc thì lấy cái cuối)
    for (const entry of entries) {
        if (entry.isIntersecting) {
            activeEntry = entry;
        }
    }

    if (activeEntry) {
      const headingId = activeEntry.target.id;
      const pageHash = window.location.hash.slice(1);
      if (pageHash && headingId) {
        saveReadingPosition(pageHash, headingId);
      }
    }
  }, observerOptions);

  headings.forEach(heading => intersectionObserver.observe(heading));
  debugLog('debug', `👀 Scroll Memory Observer attached for ${headings.length} headings.`);
}

/**
 * Restores the scroll position on page load.
 */
export function restoreReadingPosition() {
  const pageHash = window.location.hash.slice(1);
  const savedHeadingId = scrollMemory[pageHash];

  if (savedHeadingId) {
    // Delay nhẹ để đảm bảo layout ổn định (reflow xong)
    setTimeout(() => {
      const targetElement = document.getElementById(savedHeadingId);
      if (targetElement) {
        // [OPTIMIZED] block: 'start' đôi khi bị che bởi sticky header, dùng center an toàn hơn
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center' 
        });
        debugLog(`✅ Restored scroll to element #${savedHeadingId}`);
      }
    }, 300);
  }
}

/**
 * Clean up observer (Memory Management)
 */
export function cleanupScrollMemory() {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
    }
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    window.removeEventListener('content-rendered', setupPositionObserver);
}

/**
 * Initializes the Scroll Memory module.
 */
export function initializeScrollMemory() {
  loadScrollMemory();
  window.addEventListener('content-rendered', setupPositionObserver);
}