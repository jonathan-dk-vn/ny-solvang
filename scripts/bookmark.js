// scripts/bookmark.js
import { elements } from "./domElements.js";
import { toggleModal } from "./util/modal.js";
import { restructuredNavData } from "./navigationData.generated.js";

const BOOKMARK_STORAGE_KEY = 'user_bookmarks_v1';
const bookmarkModalState = { isAnimating: false };
let bookmarks = new Set(); // Use a Set for unique hrefs and high-performance lookups

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

/**
 * Dispatches a custom event to notify other modules of bookmark changes.
 */
function dispatchChangeEvent() {
  const event = new CustomEvent('bookmarksChanged', {
    detail: { bookmarks: new Set(bookmarks) } // Send a copy
  });
  window.dispatchEvent(event);
}

/**
 * Loads bookmarks from localStorage, handling potential corruption and pruning orphaned entries.
 */
function loadBookmarks() {
  let storedBookmarks = [];
  try {
    const rawData = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (rawData) {
      storedBookmarks = JSON.parse(rawData);
      if (!Array.isArray(storedBookmarks)) {
        storedBookmarks = [];
      }
    }
  } catch (e) {
    console.error("Failed to parse bookmarks from localStorage, resetting.", e);
    storedBookmarks = [];
  }

  // Prune orphaned bookmarks
  // *** LOGIC ĐƯỢC CẬP NHẬT ***
  // `restructuredNavData` là mảng các modules.
  // Chúng ta cần lặp qua `categories` (là mảng tree) của mỗi module.
  const allValidLinks = restructuredNavData.flatMap(module => 
    getAllLinksRecursive(module.categories)
  );
  const allValidHrefs = new Set(allValidLinks.map(link => link.href));
  // *** KẾT THÚC CẬP NHẬT ***

  const validBookmarks = storedBookmarks.filter(href => allValidHrefs.has(href));
  bookmarks = new Set(validBookmarks);

  if (validBookmarks.length < storedBookmarks.length) {
    console.warn('Pruned orphaned bookmarks from storage.');
    saveBookmarks();
  }
}


/**
 * Persists the current Set of bookmarks to localStorage.
 */
function saveBookmarks() {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify([...bookmarks]));
}

/**
 * Toggles the bookmark state for a given href and notifies listeners.
 * @param {string} href - The href of the link (e.g., '#my-link').
 */
function toggleBookmark(href) {
  if (bookmarks.has(href)) {
    bookmarks.delete(href);
  } else {
    bookmarks.add(href);
  }
  saveBookmarks();
  dispatchChangeEvent(); // Broadcast the change
}

/**
 * Toggles the visibility of the bookmark modal.
 */
export function toggleBookmarkModal() {
  const wasHidden = toggleModal(elements.bookmarkModal, bookmarkModalState);
  if (wasHidden) {
    populateBookmarkModal();
  }
}

/**
 * Renders the list of saved bookmarks into the modal.
 */
function populateBookmarkModal() {
  const { bookmarkModalList } = elements;
  if (!bookmarkModalList) return;
  bookmarkModalList.innerHTML = ''; // Clear previous content

  if (bookmarks.size === 0) {
    bookmarkModalList.innerHTML = `<li class="p-8 text-center text-[var(--color-text-muted)]">You have no bookmarks. Click the heart icon next to an item to save it.</li>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  
  // *** LOGIC ĐƯỢC CẬP NHẬT ***
  const allNavLinks = restructuredNavData.flatMap(module => 
    getAllLinksRecursive(module.categories)
  );
  // *** KẾT THÚC CẬP NHẬT ***

  let bookmarkIndex = 0;
  bookmarks.forEach(href => {
    const linkData = allNavLinks.find(link => link && link.href === href);
    if (linkData) {
      bookmarkIndex++;
      const li = document.createElement('li');
      li.className = 'playlist-item cursor-pointer flex items-center gap-2';
      li.innerHTML = `
        <span class="text-[var(--color-text-muted)] font-mono text-sm w-6 text-right">${bookmarkIndex}.</span>
        <div class="flex-grow text-sm font-semibold text-[var(--color-text-headings)]">${linkData.text}</div>
      `;
      li.addEventListener('click', () => {
        window.location.hash = href;
        toggleBookmarkModal();
      });
      fragment.appendChild(li);
    }
  });
  bookmarkModalList.appendChild(fragment);
}

/**
 * Initializes the bookmark system on application start.
 */
export function initializeBookmarks() {
  loadBookmarks();

  window.addEventListener('requestToggleBookmark', (event) => {
    const { href } = event.detail;
    if (href) {
      toggleBookmark(href);
    }
  });

  window.addEventListener('bookmarksChanged', () => {
    if (elements.bookmarkModal && !elements.bookmarkModal.classList.contains('hidden')) {
      populateBookmarkModal();
    }
  });

  elements.bookmarkToggleBtn?.addEventListener('click', toggleBookmarkModal);
  elements.bookmarkModalCloseBtn?.addEventListener('click', toggleBookmarkModal);
  elements.bookmarkModal?.addEventListener('click', (e) => {
    if (e.target === elements.bookmarkModal) {
      toggleBookmarkModal();
    }
  });

  dispatchChangeEvent();
}