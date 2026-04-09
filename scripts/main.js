// scripts/main.js
import { assignElements, elements } from "./domElements.js";
import { initializeNavigation } from "./navigation.js";
import {
  loadMarkdownContent,
  togglePlaylistModal,
  navigatePlaylistWithKeyboard,
  playSelectedPlaylistItem,
} from "./contentLoader.js";
import { seekAudio } from "./audioUtils.js";
import { initializeToc, toggleTocModal } from "./toc.js";
import { initializeScrollMemory } from "./scrollMemory.js";
import { initializeHistory } from "./history.js";
import {
  focusCurrentAudioTextArea,
  exportAllDictations,
  clearAllDictations,
} from "./textAreaManager.js";
import { toggleModal } from "./util/modal.js";
import debugLog from "./util/debug.js";
import { hideLoading } from "./loading.js";

// Global state
let currentModalFocus = null;
const settingsModalState = { isAnimating: false };
// scripts/main.js

function initializeAbbrControls() {
  const abbrControls = document.getElementById("abbr-visibility-controls");
  const filterContainer = document.getElementById("abbr-filter-container");
  const filterButtonsContainer = document.getElementById("abbr-filter-buttons");

  // === THÊM LOGIC NGÔN NGỮ TẠI ĐÂY ===
  const langControls = document.getElementById("abbr-language-controls");
  const storageKeyLang = "grammar_abbr_language";
  let currentLang = localStorage.getItem(storageKeyLang) || "da";

  const radioDa = document.getElementById("lang-da");
  const radioEn = document.getElementById("lang-en");
  if (radioDa && radioEn) {
    radioDa.checked = currentLang === "da";
    radioEn.checked = currentLang === "en";
  }

  if (langControls) {
    langControls.addEventListener("change", (e) => {
      if (e.target.name === "abbr-lang") {
        localStorage.setItem(storageKeyLang, e.target.value);
        // Tự động tải lại nội dung bài học với ngôn ngữ mới
        import("./contentLoader.js").then((module) => {
          module.loadMarkdownContent();
        });
      }
    });
  }

  if (!abbrControls) return;

  // CẬP NHẬT: 'className' đã được sửa thành 'highlight-*' để khớp với HTML
  const grammarTypes = [
    {
      id: "sub",
      label: "Noun",
      colorVar: "--c-sub",
      className: "highlight-sub",
    },
    {
      id: "adj",
      label: "Adj",
      colorVar: "--c-adj",
      className: "highlight-adj",
    },
    {
      id: "verb",
      label: "Verb",
      colorVar: "--c-verb-inf", // Màu đại diện cho động từ
      className: "highlight-verb", // Class chung (CSS sẽ dùng selector thông minh)
    },
    {
      id: "adv",
      label: "Adv",
      colorVar: "--c-adv",
      className: "highlight-adv",
    },
    {
      id: "prep",
      label: "Prep",
      colorVar: "--c-prep",
      className: "highlight-prep",
    },
    {
      id: "pron",
      label: "Pron",
      colorVar: "--c-pron",
      className: "highlight-pron",
    },
    {
      id: "conj",
      label: "Conj",
      colorVar: "--c-conj",
      className: "highlight-conj",
    },
    {
      id: "tword",
      label: "T-word",
      colorVar: "--c-t-word",
      className: "highlight-t-word",
    },
  ];

  const storageKeyMain = "grammar_abbr_visible"; // Show/Hide tổng
  const storageKeyFilters = "grammar_filters_hidden"; // Các loại bị ẩn

  // Lấy trạng thái từ LocalStorage
  let isVisible = localStorage.getItem(storageKeyMain) !== "false";
  let hiddenFilters = JSON.parse(
    localStorage.getItem(storageKeyFilters) || "[]",
  );

  // Hàm cập nhật giao diện (UI)
  const applyState = () => {
    // 1. Xử lý Toggle tổng (Show/Hide All)
    document.body.classList.toggle("hide-grammar-abbr", !isVisible);

    const radioShow = document.getElementById("abbr-show");
    const radioHide = document.getElementById("abbr-hide");
    if (radioShow && radioHide) {
      radioShow.checked = isVisible;
      radioHide.checked = !isVisible;
    }

    // 2. Xử lý hiển thị vùng Filter
    if (filterContainer) {
      if (isVisible) {
        filterContainer.classList.remove("hidden");
        renderFilterButtons(); // Vẽ lại nút khi hiện
      } else {
        filterContainer.classList.add("hidden");
      }
    }

    // 3. Áp dụng các filter con (thêm class vào body để CSS ẩn)
    // Xóa hết các class ẩn cũ trước
    grammarTypes.forEach((type) => {
      document.body.classList.remove(`hide-type-${type.id}`);
    });
    // Thêm lại class ẩn dựa trên hiddenFilters
    hiddenFilters.forEach((id) => {
      document.body.classList.add(`hide-type-${id}`);
    });
  };

  // Hàm render các nút filter
  const renderFilterButtons = () => {
    if (!filterButtonsContainer) return;
    filterButtonsContainer.innerHTML = ""; // Clear cũ

    grammarTypes.forEach((type) => {
      const isActive = !hiddenFilters.includes(type.id);
      const btn = document.createElement("button");

      // Style cho button (Tailwind + Inline Style cho màu động)
      btn.className = `px-3 py-1 rounded-full text-xs font-bold transition-all border border-transparent shadow-sm select-none ${
        isActive ? "opacity-100" : "opacity-40 grayscale"
      }`;

      // Áp dụng màu nền dựa trên biến CSS (lấy màu chữ làm màu nền cho button)
      // Lưu ý: Style này giả định bạn muốn nút cùng màu với loại từ
      btn.style.backgroundColor = `var(${type.colorVar})`;
      btn.style.color = "#fff"; // Chữ trắng cho nổi bật
      // Nếu muốn viền màu thay vì nền màu, bạn có thể chỉnh lại logic này

      btn.textContent = type.label;

      // Sự kiện click
      btn.onclick = () => {
        if (isActive) {
          hiddenFilters.push(type.id); // Đang hiện -> Ẩn đi
        } else {
          hiddenFilters = hiddenFilters.filter((id) => id !== type.id); // Đang ẩn -> Hiện lại
        }
        localStorage.setItem(storageKeyFilters, JSON.stringify(hiddenFilters));
        applyState();
      };

      filterButtonsContainer.appendChild(btn);
    });
  };

  // Khởi chạy lần đầu
  applyState();

  // Lắng nghe sự kiện toggle tổng (Show/Hide)
  abbrControls.addEventListener("change", (e) => {
    if (e.target.name === "abbr-mode") {
      isVisible = e.target.value === "show";
      localStorage.setItem(storageKeyMain, isVisible);
      applyState();
    }
  });
}

function toggleSettingsModal() {
  toggleModal(elements.settingsModal, settingsModalState);
}

function isMacOS() {
  return (
    navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
  );
}


function initializeEnhancedPlaylistModal() {
  if (
    !elements.playlistToggleBtn ||
    !elements.playlistModal ||
    !elements.playlistCloseBtn
  )
    return;

  elements.playlistToggleBtn.addEventListener("click", () => {
    togglePlaylistModal();
    currentModalFocus = "playlist";
  });

  elements.playlistCloseBtn.addEventListener("click", () => {
    togglePlaylistModal();
    currentModalFocus = null;
  });

  elements.playlistModal.addEventListener("click", (e) => {
    if (e.target === elements.playlistModal) {
      togglePlaylistModal();
      currentModalFocus = null;
    }
  });
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function initializeEnhancedKeyboardControls() {
  window.addEventListener("keydown", (event) => {
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.isContentEditable
    ) {
      return;
    }

    const audioPlayer = elements.globalPlayer.audio;
    const playerContainer = elements.globalPlayer.container;
    const SEEK_TIME = 5;
    const modifierPressed = isMacOS() ? event.metaKey : event.ctrlKey;

    if (event.key === "Escape") {
      if (!elements.playlistModal?.classList.contains("hidden")) {
        togglePlaylistModal();
        currentModalFocus = null;
        event.preventDefault();
      } else if (!elements.tocModal?.classList.contains("hidden")) {
        toggleTocModal();
        currentModalFocus = null;
        event.preventDefault();
      } else if (!elements.settingsModal?.classList.contains("hidden")) {
        toggleSettingsModal();
        currentModalFocus = null;
        event.preventDefault();
      } else if (!elements.navModal?.classList.contains("hidden")) {
        elements.navModalCloseBtn?.click();
        currentModalFocus = null;
        event.preventDefault();
      }
      return;
    }

    if (modifierPressed) {
      switch (event.key.toLowerCase()) {
        case "t":
          event.preventDefault();
          toggleTocModal();
          currentModalFocus = "toc";
          break;
        case "p":
          event.preventDefault();
          togglePlaylistModal();
          currentModalFocus = "playlist";
          break;
        case "s":
          event.preventDefault();
          toggleSettingsModal();
          currentModalFocus = "settings";
          break;
        case "n":
          event.preventDefault();
          elements.navToggle.click();
          currentModalFocus = "navigation";
          break;
        case "d":
          if (event.shiftKey) {
            event.preventDefault();
            focusCurrentAudioTextArea();
          }
          break;
        case "e":
          if (event.shiftKey) {
            event.preventDefault();
            exportAllDictations();
          }
          break;
        case "delete":
        case "backspace":
          if (event.shiftKey) {
            event.preventDefault();
            clearAllDictations();
          }
          break;
      }
      return;
    }

    if (
      currentModalFocus === "playlist" &&
      !elements.playlistModal?.classList.contains("hidden")
    ) {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault();
          navigatePlaylistWithKeyboard(event.key === "ArrowDown" ? 1 : -1);
          break;
        case "Enter":
          event.preventDefault();
          playSelectedPlaylistItem();
          break;
      }
      return;
    }

    if (
      !currentModalFocus &&
      playerContainer &&
      !playerContainer.classList.contains("hidden")
    ) {
      switch (event.code) {
        case "Space":
          event.preventDefault();
          if (audioPlayer.paused) {
            audioPlayer
              .play()
              .catch((e) => debugLog("error", "Audio play failed:", e));
          } else {
            audioPlayer.pause();
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          seekAudio(audioPlayer, SEEK_TIME);
          break;
        case "ArrowLeft":
          event.preventDefault();
          seekAudio(audioPlayer, -SEEK_TIME);
          break;
        case "KeyN":
          if (elements.globalPlayer.nextBtn) {
            event.preventDefault();
            elements.globalPlayer.nextBtn.click();
          }
          break;
        case "KeyD":
          event.preventDefault();
          focusCurrentAudioTextArea();
          break;
        case "KeyH":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            elements.dockToggleBtn?.click();
          }
          break;
      }
    }
  });
}

function initializeEnhancedSettingsModal() {
  if (
    !elements.settingsModal ||
    !elements.globalPlayer.settingsBtn ||
    !elements.settingsCloseBtn
  )
    return;

  elements.globalPlayer.settingsBtn.addEventListener("click", () => {
    toggleSettingsModal();
    currentModalFocus = "settings";
  });

  elements.settingsCloseBtn.addEventListener("click", () => {
    toggleSettingsModal();
    currentModalFocus = null;
  });

  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      toggleSettingsModal();
      currentModalFocus = null;
    }
  });
}

function initializePerformanceOptimizations() {
  let scrollTimeout;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
      }, 16);
    },
    { passive: true },
  );

  let resizeTimeout;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("optimized-resize"));
      }, 250);
    },
    { passive: true },
  );
}

function initializePlatformAdaptation() {
  const platformClass = isMacOS() ? "platform-macos" : "platform-windows";
  document.body.classList.add(platformClass);
}

function initializeHeadingClickScroll() {
  const attach = () => {
    const contentContainer = document
      .getElementById("content")
      ?.querySelector(".markdown-rendered");
    if (!contentContainer) return;
    const headers = contentContainer.querySelectorAll("h1, h2, h3, h4, h5");
    headers.forEach((header) => {
      if (header.dataset.clickScrollAttached === "true") return;
      header.addEventListener("click", () => {
        const targetTop = header.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      });
      header.dataset.clickScrollAttached = "true";
    });
  };

  window.addEventListener("content-rendered", attach);
  attach();
}

function initializeDockToggle() {
  const STORAGE_KEY = "dock_collapsed_state";
  const AUTO_COLLAPSE_DELAY = 5000;

  const { dockToggleBtn, dockCollapseIcon, dockExpandIcon } = elements;
  const dockContainer = document.getElementById("floating-dock-container");
  const bottomNav = document.getElementById("bottom-nav-bar");

  if (!dockToggleBtn || !dockContainer) return;

  let collapseTimeout;

  // --- UI Update Helper ---
  const updateDockUI = (collapsed) => {
    dockContainer.classList.toggle("collapsed", collapsed);
    if (bottomNav) bottomNav.classList.toggle("nav-collapsed", collapsed);

    if (dockCollapseIcon && dockExpandIcon) {
      dockCollapseIcon.classList.toggle("hidden", collapsed);
      dockExpandIcon.classList.toggle("hidden", !collapsed);
    }

    dockToggleBtn.title = collapsed
      ? "Mở rộng trình phát"
      : "Thu gọn trình phát";
    localStorage.setItem(STORAGE_KEY, collapsed);
    window.dispatchEvent(
      new CustomEvent("dock-collapsed-changed", { detail: { collapsed } }),
    );
  };

  // --- Smart Scroll Logic (Auto Collapse/Expand on Scroll) ---
  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY;
          const SCROLL_THRESHOLD = 10; // Ngưỡng cuộn tối thiểu

          // Bỏ qua nếu cuộn quá đà (rubber banding trên iOS)
          if (
            currentScrollY < 0 ||
            currentScrollY + window.innerHeight > document.body.scrollHeight
          ) {
            ticking = false;
            return;
          }

          // Cuộn xuống -> Thu gọn
          if (diff > SCROLL_THRESHOLD && currentScrollY > 50) {
            if (!dockContainer.classList.contains("collapsed")) {
              updateDockUI(true);
            }
          }
          // Cuộn lên -> Mở ra
          else if (diff < -SCROLL_THRESHOLD) {
            if (dockContainer.classList.contains("collapsed")) {
              updateDockUI(false);
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );

  // --- Auto Collapse Timer Logic ---
  const startCollapseTimer = () => {
    clearTimeout(collapseTimeout);
    // Không tự động đóng khi đang dev ở localhost (để dễ debug)
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return;
    }

    if (!dockContainer.classList.contains("collapsed")) {
      collapseTimeout = setTimeout(() => {
        updateDockUI(true);
      }, AUTO_COLLAPSE_DELAY);
    }
  };

  const cancelCollapseTimer = () => {
    clearTimeout(collapseTimeout);
  };

  // --- Initialization ---
  const savedState = localStorage.getItem(STORAGE_KEY);
  const isInitiallyCollapsed = savedState === "true";
  updateDockUI(isInitiallyCollapsed);
  if (!isInitiallyCollapsed) startCollapseTimer();

  // --- Event Listeners ---
  dockToggleBtn.addEventListener("click", () => {
    const isCurrentlyCollapsed = dockContainer.classList.contains("collapsed");
    const newState = !isCurrentlyCollapsed;
    updateDockUI(newState);
    if (!newState) startCollapseTimer();
    else cancelCollapseTimer();
  });

  // Giữ dock mở khi đang tương tác (hover/touch)
  const keepOpenEvents = (el) => {
    if (!el) return;
    el.addEventListener("mouseenter", cancelCollapseTimer);
    el.addEventListener("mouseleave", startCollapseTimer);
    el.addEventListener("touchstart", cancelCollapseTimer, { passive: true });
    el.addEventListener("touchend", () => startCollapseTimer());
  };

  keepOpenEvents(dockContainer);
  keepOpenEvents(bottomNav);
}

function initializeMobileWarning() {
  const MOBILE_BREAKPOINT = 1024;
  const body = document.body;
  const continueBtn = document.getElementById("mobile-warning-continue-btn");

  if (!continueBtn) {
    return;
  }

  let wasDismissedOnSmallScreen = false;

  function checkScreenSize() {
    const isSmall = window.innerWidth < MOBILE_BREAKPOINT;

    if (isSmall) {
      if (!wasDismissedOnSmallScreen) {
        body.classList.add("mobile-unsupported");
      }
    } else {
      body.classList.remove("mobile-unsupported");
      wasDismissedOnSmallScreen = false;
    }
  }

  continueBtn.addEventListener("click", () => {
    wasDismissedOnSmallScreen = true;
    body.classList.remove("mobile-unsupported");
  });

  window.addEventListener("resize", checkScreenSize);
  checkScreenSize();
}

function closeDrawer() {
  if (elements.drawerContent) {
    elements.drawerContent.style.transform = "";
    elements.drawerContent.style.transition = "";
    elements.drawerContent.classList.remove("is-dragging");
  }
  if (elements.drawerOverlay) {
    elements.drawerOverlay.style.opacity = "";
  }

  elements.mobileControlsDrawer.classList.remove("drawer-open");
  document.body.classList.remove("drawer-active");
  setTimeout(() => {
    elements.mobileControlsDrawer.classList.add("hidden");
  }, 300);
}

function openDrawer() {
  const controlsRow = document.querySelector(".controls-row");
  if (!controlsRow) return;

  elements.drawerButtonsContainer.innerHTML = "";
  const buttons = controlsRow.querySelectorAll(".control-btn");
  const noAudio = document.body.classList.contains("no-audio-mode");
  const audioControlIds = [
    "global-play-pause-btn",
    "global-next-btn",
    "playlist-toggle-btn",
  ];

  buttons.forEach((button) => {
    if (noAudio && audioControlIds.includes(button.id)) {
      return;
    }

    const container = document.createElement("div");
    container.className =
      "flex items-center p-2 rounded-lg hover:bg-[var(--color-bg-interactive-hover)] cursor-pointer";

    const clonedButton = button.cloneNode(true);
    clonedButton.classList.remove("hidden");

    // [FIX] Xóa ID để tránh xung đột CSS (vì ID có style riêng màu nhạt)
    // Điều này giúp nút nhận style mặc định của class .control-btn (màu đậm hơn)
    clonedButton.removeAttribute("id");

    const title = button.getAttribute("title");
    const titleSpan = document.createElement("span");
    titleSpan.className = "ml-4 text-[var(--color-text-body)]";
    titleSpan.textContent = title;

    container.appendChild(clonedButton);
    container.appendChild(titleSpan);

    container.addEventListener("click", () => {
      button.click();
      closeDrawer();
    });

    elements.drawerButtonsContainer.appendChild(container);
  });

  elements.mobileControlsDrawer.classList.remove("hidden");
  requestAnimationFrame(() => {
    elements.mobileControlsDrawer.classList.add("drawer-open");
    document.body.classList.add("drawer-active");
  });
}

function initializeDrawerGestures() {
  const drawerContent = elements.drawerContent;
  const overlay = elements.drawerOverlay;

  if (!drawerContent || !overlay) return;

  if (!drawerContent.querySelector(".drawer-handle-container")) {
    const handleContainer = document.createElement("div");
    handleContainer.className = "drawer-handle-container";

    const handleBar = document.createElement("div");
    handleBar.className = "drawer-handle-bar";

    handleContainer.appendChild(handleBar);
    drawerContent.prepend(handleContainer);
  }

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  const DRAG_THRESHOLD = 120;

  const onTouchStart = (e) => {
    const isHandle = e.target.closest(".drawer-handle-container");
    const isAtTop = drawerContent.scrollTop === 0;

    if (!isAtTop && !isHandle) return;

    startY = e.touches[0].clientY;
    isDragging = true;

    drawerContent.classList.add("is-dragging");
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;

    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      e.preventDefault();

      drawerContent.style.transform = `translateY(${deltaY}px)`;

      const opacity = 1 - Math.min(deltaY / 300, 1);
      overlay.style.opacity = opacity;
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    drawerContent.classList.remove("is-dragging");

    const deltaY = currentY - startY;

    if (deltaY > DRAG_THRESHOLD) {
      closeDrawer();
    } else {
      drawerContent.style.transform = "";
      overlay.style.opacity = "";
    }
  };

  drawerContent.addEventListener("touchstart", onTouchStart, { passive: true });
  drawerContent.addEventListener("touchmove", onTouchMove, { passive: false });
  drawerContent.addEventListener("touchend", onTouchEnd);
}

function initializeWordDoubleTapScroll() {
  // Lấy container chứa nội dung bài học
  const contentContainer = document.getElementById("content");
  if (!contentContainer) return;

  // Hàm tính toán và cuộn element ra giữa màn hình
  const scrollToCenter = (element) => {
    // Tránh việc cuộn khi người dùng click vào khoảng trống của vùng chứa lớn
    if (
      !element ||
      element.id === "content" ||
      element.classList.contains("markdown-rendered")
    ) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;

    // Công thức: Vị trí tuyệt đối của Element - (Nửa chiều cao màn hình) + (Nửa chiều cao của Element)
    const targetY = rect.top + scrollTop - viewportHeight / 2 + rect.height / 2;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  };

  // 1. Xử lý cho Desktop (Chuột)
  contentContainer.addEventListener("dblclick", (e) => {
    scrollToCenter(e.target);
  });

  // 2. Xử lý cho Mobile (Cảm ứng)
  let lastTapTime = 0;
  contentContainer.addEventListener(
    "touchend",
    (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;

      // Khoảng thời gian < 300ms giữa 2 lần chạm được tính là Double Tap
      if (tapLength < 300 && tapLength > 0) {
        scrollToCenter(e.target);

        // Ngăn chặn hành vi zoom mặc định của trình duyệt mobile khi double tap
        // Nếu bạn muốn giữ lại tính năng zoom, có thể comment dòng dưới lại
        if (e.cancelable) e.preventDefault();
      }
      lastTapTime = currentTime;
    },
    { passive: false },
  );
}

function initializeMobileDrawer() {
  if (elements.mobileControlsTrigger) {
    elements.mobileControlsTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      openDrawer();
    });
  }
  if (elements.drawerCloseBtn) {
    elements.drawerCloseBtn.addEventListener("click", closeDrawer);
  }
  if (elements.drawerOverlay) {
    elements.drawerOverlay.addEventListener("click", closeDrawer);
  }

  initializeDrawerGestures();
}

// =========================================================================
// STATIC GRAMMAR TABLE (QUÉT TOÀN BỘ TỪ VỰNG 1 LẦN)
// =========================================================================

// =========================================================================
// STATIC GRAMMAR TABLE (QUÉT TOÀN BỘ TỪ VỰNG 1 LẦN & SẮP XẾP KÈM SỐ LẦN XUẤT HIỆN)
// =========================================================================

const grammarTypesMap = {
  "highlight-verb-inf": { label: "nguyên mẫu", order: 1 },
  "highlight-verb-pres": { label: "hiện tại", order: 2 },
  "highlight-verb-past": { label: "quá khứ", order: 3 },
  "highlight-verb-perf": { label: "hoàn thành", order: 4 },
  "highlight-verb-imp": { label: "mệnh lệnh", order: 5 },
  "highlight-pron": { label: "đại từ", order: 6 },
  "highlight-conj": { label: "liên từ", order: 7 },
  "highlight-prep": { label: "giới từ", order: 8 },
  "highlight-t-word": { label: "t-từ", order: 9 },
  "highlight-sub": { label: "danh từ", order: 10 },
  "highlight-adj": { label: "tính từ", order: 11 },
  "highlight-adv": { label: "trạng từ", order: 12 },
  "highlight-central-adv": { label: "trạng từ TT", order: 13 },
};

function renderStaticGrammarTable() {
  const container = document.getElementById("dynamic-grammar-container");
  const contentArea = document.getElementById("content");

  if (!container || !contentArea) return;

  const wordsByType = {};

  const ignoreWords = [
    "nguyên thể",
    "nguyên mẫu",
    "hiện tại",
    "quá khứ",
    "động từ quá khứ",
    "phân từ",
    "hoàn thành",
    "hiện tại hoàn thành",
    "mệnh lệnh",
    "động từ",
    "đại từ",
    "liên từ",
    "giới từ",
    "t-từ",
    "danh từ",
    "tính từ",
    "trạng từ",
    "trạng từ trung tâm",
    "trạng từ tt",
  ];

  const highlightedWords = contentArea.querySelectorAll(
    '[class*="highlight-"]',
  );

  highlightedWords.forEach((el) => {
    if (
      el.closest(".grammar-legend") ||
      el.closest(".legend-container") ||
      el.closest(".pt-tooltip")
    )
      return;

    let word = el.childNodes[0]?.nodeValue?.trim() || el.textContent.trim();
    word = word.replace(/[.,!?;:()]/g, "").toLowerCase();

    if (!word || ignoreWords.includes(word)) return;

    let matchedClass = null;
    for (const cls in grammarTypesMap) {
      if (el.classList.contains(cls)) {
        matchedClass = cls;
        break;
      }
    }

    if (matchedClass) {
      if (!wordsByType[matchedClass]) {
        wordsByType[matchedClass] = new Map();
      }
      const currentCount = wordsByType[matchedClass].get(word) || 0;
      wordsByType[matchedClass].set(word, currentCount + 1);
    }
  });

  const activeTypes = Object.keys(grammarTypesMap).sort((a, b) => {
    return grammarTypesMap[a].order - grammarTypesMap[b].order;
  });

  const wordsArrayByType = {};

  activeTypes.forEach((type) => {
    if (wordsByType[type]) {
      const sortedWords = Array.from(wordsByType[type].entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0]);
        })
        .map(([word, count]) => ({ word: word, count: count }));

      wordsArrayByType[type] = sortedWords;
    } else {
      wordsArrayByType[type] = [];
    }
  });

  const verbTypes = [
    "highlight-verb-inf",
    "highlight-verb-pres",
    "highlight-verb-past",
    "highlight-verb-perf",
    "highlight-verb-imp",
  ];

  const otherTypes = [
    "highlight-pron",
    "highlight-conj",
    "highlight-prep",
    "highlight-t-word",
    "highlight-sub",
    "highlight-adj",
    "highlight-adv",
    "highlight-central-adv",
  ];

  const buildHorizontalListForTypes = (typesToRender, title) => {
    const validTypes = typesToRender
      .filter(
        (type) => wordsArrayByType[type] && wordsArrayByType[type].length > 0,
      )
      .sort((a, b) => wordsArrayByType[a].length - wordsArrayByType[b].length);

    if (validTypes.length === 0) return "";

    let listHTML = `<div style="display: flex; flex-direction: column; gap: 14px;">`;

    validTypes.forEach((type, index) => {
      if (index > 0) {
        listHTML += `<div style="height: 1px; background-color: var(--color-border); opacity: 0.6; border-radius: 1px;"></div>`;
      }

      const info = grammarTypesMap[type];

      const wordsString = wordsArrayByType[type]
        .map((item, i, arr) => {
          const isLast = i === arr.length - 1;
          
          // Tạo HTML cho số đếm (mờ, nhỏ, lùi ra 2px để không dính vào chữ)
          // Bạn có thể tùy chỉnh font-size hoặc opacity nếu muốn mờ/nhỏ hơn nữa
          const countBadge = `<span style="font-size: 0.65rem; font-weight: 400; color: var(--color-text-muted); opacity: 0.8; margin-left: 2px; user-select: none;">${item.count}</span>`;

          return `
          <span class="grammar-word-link" data-word="${item.word}" data-type="${type}" data-current-index="0" title="Click để xem trong bài" style="display: inline-block; color: var(--color-text-body); font-weight: 500; margin-right: 6px;">
            ${item.word}${countBadge}${!isLast ? '<span style="color: var(--color-border); pointer-events: none;">,</span>' : ""}
          </span>
        `.trim();
        })
        .join("");

      listHTML += `
        <div style="line-height: 1.8;">
          <span class="${type}" style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; border: 1px solid currentColor; margin-right: 8px; vertical-align: baseline; position: relative; top: -1px;">
            ${info.label}
          </span>
          <span style="font-size: 0.95rem;">
            ${wordsString}
          </span>
        </div>
      `;
    });

    listHTML += `</div>`;

    return `
      <div style="margin-bottom: 2.5rem;">
        ${title ? `<h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px; color: var(--color-text-headings); border-bottom: 2px solid var(--color-border); padding-bottom: 8px;">${title}</h4>` : ""}
        ${listHTML}
      </div>
    `;
  };

  const verbHTML = buildHorizontalListForTypes(verbTypes, "Động từ (Verber)");
  const otherHTML = buildHorizontalListForTypes(otherTypes, "Từ loại khác");

  if (!verbHTML && !otherHTML) {
    container.innerHTML = `<p class="text-center text-[var(--color-text-muted)] italic mt-4">Không tìm thấy từ vựng nào được đánh dấu trong bài học này.</p>`;
    return;
  }

  // CẬP NHẬT CSS: FIX VỠ LAYOUT (Không dùng inline-block nữa, dùng thuộc tính 'left')
  const interactiveStyles = `
    <style>
      .grammar-word-link {
        cursor: pointer;
        transition: color 0.2s ease;
      }
      .grammar-word-link:hover {
        color: var(--color-text-link, #2563eb) !important;
      }
      
      .grammar-shake-target {
        animation: wordShakeAnim 1s cubic-bezier(.36,.07,.19,.97) both !important;
        position: relative; /* Fix vỡ layout: position relative không làm thay đổi chiều cao của dòng (line-height) */
        z-index: 10;
      }
      
      /* Keyframes hiệu ứng Rung Lắc bằng thuộc tính 'left' thay cho 'transform' */
      @keyframes wordShakeAnim {
        10%, 90% { left: -2px; }
        20%, 80% { left: 3px; }
        30%, 50%, 70% { left: -4px; }
        40%, 60% { left: 4px; }
      }
    </style>
  `;

  container.innerHTML = interactiveStyles + otherHTML + verbHTML;

  container.addEventListener("click", container._grammarClickListener);

  // =====================================================================
  // THÊM MỚI: CHỨC NĂNG HOVER HIỆN TOOLTIP 10 CÂU VÍ DỤ (ĐÃ NÂNG CẤP)
  // =====================================================================

  // 1. Khởi tạo Tooltip
  let tooltipEl = document.getElementById("grammar-hover-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "grammar-hover-tooltip";
    document.body.appendChild(tooltipEl);

    // Ngăn chặn việc click vào bên trong tooltip làm nó vô tình bị ẩn
    tooltipEl.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
  }

  // 2. Cache để tối ưu tốc độ (Giữ nguyên phần này)
  if (!window._grammarSentenceCache) {
    window._grammarSentenceCache = {};
  }

  // 2. Cache để tối ưu tốc độ
  if (!window._grammarSentenceCache) {
    window._grammarSentenceCache = {};
  }

  // Hàm trích xuất chính xác câu chứa từ (PHIÊN BẢN NÂNG CẤP TOÀN DIỆN)
  const getSentencesForWord = (word, typeClass) => {
    const cacheKey = `${word}-${typeClass}`;
    if (window._grammarSentenceCache[cacheKey]) {
      return window._grammarSentenceCache[cacheKey];
    }

    const sentences = [];
    const seenTexts = new Set();
    const elementsInContent = contentArea.querySelectorAll(`.${typeClass}`);

    for (const el of elementsInContent) {
      // BƯỚC 1: LỌC RÁC TỪ TOOLTIP 
      if (el.closest('.pt-tooltip')) continue;

      // BƯỚC 2: LÀM SẠCH TỪ VỰNG TỐI ĐA 
      // Xóa triệt để mọi loại dấu câu, ngoặc kép, gạch ngang dính vào từ (VD: "ord", (ord), ord—)
      let elWord = el.childNodes[0]?.nodeValue?.trim() || el.textContent.trim();
      elWord = elWord.replace(/[.,!?;:()"'“”‘’\[\]{}/\\—-]/g, "").toLowerCase();

      if (elWord === word) {
        // BƯỚC 3: MỞ RỘNG TẦM QUÉT NGỮ CẢNH DOM (Bao phủ 100% tài liệu)
        // Bắt chính xác câu dù nó nằm ở Tiêu đề (h1-h6), Danh sách (li), Trích dẫn (blockquote) hay Bảng (td)
        const blockParent = el.closest(".pt-trigger-text, p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, figcaption") || el.parentElement;
        
        if (blockParent) {
          const clone = blockParent.cloneNode(true);
          
          // Dọn dẹp DOM
          clone.querySelectorAll('.word-abbr, .pt-tooltip').forEach(node => node.remove());
          
          let blockText = clone.textContent.trim().replace(/\s+/g, " ");
          
          // BƯỚC 4: TÁCH CÂU SIÊU CẤP (Super Delimiter)
          // Xử lý hoàn hảo các câu kết thúc bằng chấm than/chấm hỏi đi kèm ngoặc kép (VD: He said "Hello!" Then...)
          const sentenceDelimiter = /([.?!]+["'”’]?)\s+(?=[A-ZÆØÅa-zæøå0-9"'])/g;
          const splitSentences = blockText.replace(sentenceDelimiter, "$1|").split("|");

          for (let s of splitSentences) {
            let sentenceText = s.trim();
            
            // Regex tìm từ vựng tiếng Đan Mạch an toàn (đã cấu hình ở bước trước)
            const wordRegex = new RegExp(`(^|[^a-zA-ZæøåÆØÅ0-9_])(${word})(?=[^a-zA-ZæøåÆØÅ0-9_]|$)`, "gi");
            
            if (wordRegex.test(sentenceText)) {
              
              // BƯỚC 5: LỌC CÂU TRÙNG LẶP & ĐẨY VÀO MẢNG
              // Điều kiện !seenTexts.has(sentenceText) đảm bảo Tooltip của bạn không bị spam bởi các câu giống hệt nhau
              if (!seenTexts.has(sentenceText) && sentenceText.length > 0) {
                seenTexts.add(sentenceText);
                wordRegex.lastIndex = 0; // Reset index của Regex trước khi thực hiện replace
                
                // Giữ nguyên ký tự trước ($1) và highlight từ khóa ($2)
                const highlightedSentence = sentenceText.replace(wordRegex, "$1<mark>$2</mark>");
                sentences.push(highlightedSentence);
              }

            }
          }
        }
      }
    }

    window._grammarSentenceCache[cacheKey] = sentences;
    return sentences;
  };

  // --- BỘ MÁY TRẠNG THÁI (STATE MACHINE) ĐỂ TRACKING HÀNH VI ---
  const pointerState = {
    downTime: 0,
    lastTapTime: 0,
    startX: 0,
    startY: 0,
  };

  if (container._grammarPointerDownListener) {
    container.removeEventListener(
      "pointerdown",
      container._grammarPointerDownListener,
    );
    container.removeEventListener(
      "pointerup",
      container._grammarPointerUpListener,
    );
  }

  // Bắt đầu chạm / nhấn chuột
  container._grammarPointerDownListener = (e) => {
    // Chỉ nhận click chuột trái (button 0) hoặc chạm cảm ứng
    if (e.pointerType === "mouse" && e.button !== 0) return;

    pointerState.downTime = performance.now();
    pointerState.startX = e.clientX;
    pointerState.startY = e.clientY;
  };

  // Kết thúc chạm / nhả chuột
  container._grammarPointerUpListener = (e) => {
    const upTime = performance.now();
    const timeSinceDown = upTime - pointerState.downTime;
    const timeSinceLastTap = upTime - pointerState.lastTapTime;

    pointerState.lastTapTime = upTime; // Lưu lại thời gian của cú click/tap hiện tại

    // 1. CHẶN DOUBLE CLICK VÀ DOUBLE TAP CỰC MẠNH
    // - e.detail >= 2: Chặn Click đúp chuột trên Desktop
    // - timeSinceLastTap < 400ms: Chặn Double-tap trên Mobile
    if (e.detail >= 2 || (timeSinceLastTap > 0 && timeSinceLastTap < 400)) {
      return; // Hủy toàn bộ tiến trình
    }

    // 2. BỘ LỌC RUNG TAY (SHAKY CLICK)
    const moveX = Math.abs(e.clientX - pointerState.startX);
    const moveY = Math.abs(e.clientY - pointerState.startY);
    // Nếu nhấp nhả quá nhanh (< 200ms) VÀ di chuyển cực ít (< 10px) thì coi như là click hụt, không phải kéo bôi đen
    if (timeSinceDown < 200 && moveX < 10 && moveY < 10) {
      return;
    }

    // 3. ĐỢI TRÌNH DUYỆT RENDER VÙNG CHỌN (10ms) RỒI MỚI XỬ LÝ
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      // Ràng buộc: Bắt buộc phải có chữ được bôi đen thực sự
      if (!selectedText || selection.isCollapsed) {
        return;
      }

      const link = e.target.closest(".grammar-word-link");
      if (!link) return;

      // Xác minh cực ngặt: Chữ được bôi đen PHẢI NẰM BÊN TRONG thẻ từ vựng này
      if (!selection.containsNode(link, true)) return;

      const word = link.dataset.word;
      const type = link.dataset.type;
      const sentences = getSentencesForWord(word, type);

      if (sentences.length > 0) {
        const typeLabel = grammarTypesMap[type]?.label || "Từ vựng";
        const headerHTML = `<div style="font-size: 0.95rem; font-weight: 800; color: var(--color-text-headings); margin-bottom: 10px; border-bottom: 2px solid var(--color-text-link); padding-bottom: 6px; text-transform: uppercase;">Ví dụ: "${word}" <span style="font-size:0.7rem; font-weight:normal; color:var(--color-text-muted); float:right; margin-top:3px;">(${typeLabel})</span></div>`;

        const listHTML = sentences
          .map(
            (s, index) =>
              `<div class="grammar-sentence-item">
                 <span class="grammar-sentence-number">${index + 1}.</span>
                 <span class="grammar-sentence-text">${s}</span>
               </div>`,
          )
          .join("");

        tooltipEl.innerHTML = headerHTML + listHTML;
        tooltipEl.classList.add("visible");

        // 4. SMART POSITIONING DỰA TRÊN "RANGE" (VÙNG SÁNG XANH CỦA CHỮ ĐƯỢC BÔI)
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Tooltip luôn neo chính giữa vùng chữ đang bôi đen
        let topPos = rect.bottom + 10;
        let leftPos = rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2;

        // Chống tràn màn hình dưới
        if (topPos + tooltipEl.offsetHeight > window.innerHeight) {
          topPos = rect.top - tooltipEl.offsetHeight - 10;
        }

        // Chống tràn 2 bên trái/phải màn hình
        if (leftPos < 10) leftPos = 10;
        if (leftPos + tooltipEl.offsetWidth > window.innerWidth) {
          leftPos = window.innerWidth - tooltipEl.offsetWidth - 10;
        }

        tooltipEl.style.top = `${topPos}px`;
        tooltipEl.style.left = `${leftPos}px`;
      }
    }, 10); // Micro-task delay
  };

  // Sử dụng Pointer Events - Dòng chuẩn web hiện đại (Bao gồm chuột, cảm ứng, bút cảm ứng)
  container.addEventListener(
    "pointerdown",
    container._grammarPointerDownListener,
  );
  container.addEventListener("pointerup", container._grammarPointerUpListener);

  // Click ra vùng trống để ẩn (Giữ nguyên)
  if (!window._grammarOutsideClickListener) {
    window._grammarOutsideClickListener = (e) => {
      if (tooltipEl && tooltipEl.classList.contains("visible")) {
        // Chỉ ẩn nếu người dùng không click vào vùng bôi đen và không click vào chính Tooltip
        if (
          !e.target.closest("#grammar-hover-tooltip") &&
          !e.target.closest(".grammar-word-link")
        ) {
          tooltipEl.classList.remove("visible");
          window.getSelection().removeAllRanges(); // Tự động xóa bôi đen khi đóng tooltip
        }
      }
    };
    document.addEventListener(
      "pointerdown",
      window._grammarOutsideClickListener,
    );
  }

  // 4. Click ra khoảng trống để ẩn Tooltip (Click Outside)
  if (!window._grammarOutsideClickListener) {
    window._grammarOutsideClickListener = (e) => {
      if (tooltipEl && tooltipEl.classList.contains("visible")) {
        // Kiểm tra xem vị trí click có KHÔNG nằm trong tooltip và KHÔNG nằm trong vùng từ vựng
        if (
          !e.target.closest("#grammar-hover-tooltip") &&
          !e.target.closest(".grammar-word-link")
        ) {
          tooltipEl.classList.remove("visible");
        }
      }
    };
    // Lắng nghe click chuột trên toàn màn hình
    document.addEventListener("mousedown", window._grammarOutsideClickListener);
  }
}

function initializeGrammarTable() {
  // Lắng nghe sự kiện sau khi Markdown đã được convert thành HTML
  window.addEventListener("content-rendered", () => {
    renderStaticGrammarTable(); // Render đúng 1 lần
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const bottomNav = document.getElementById("bottom-nav-bar");
  const navModal = document.getElementById("nav-modal");
  const navPlaceholder = document.getElementById("nav-modal-placeholder");
  const breadcrumb = document.querySelector(".nav-breadcrumb");

  // Helper: Mở rộng các Accordion cha của một element
  function expandParents(element) {
    let current = element.parentElement;
    while (current && current !== navPlaceholder) {
      if (current.classList.contains("nav-accordion-container")) {
        current.classList.add("expanded");
        current.style.gridTemplateRows = "1fr";

        // Tìm header tương ứng để xoay icon
        const header = current.previousElementSibling;
        if (header) {
          const icon = header.querySelector(".category-toggle-icon");
          if (icon) icon.classList.add("expanded");
        }
      }
      current = current.parentElement;
    }
  }

  function collapseAll() {
    if (!navPlaceholder) return;
    const allContainers = navPlaceholder.querySelectorAll(
      ".nav-accordion-container",
    );
    const allIcons = navPlaceholder.querySelectorAll(".category-toggle-icon");

    allContainers.forEach((container) => {
      container.classList.remove("expanded");
      container.style.gridTemplateRows = "0fr";
    });

    allIcons.forEach((icon) => {
      icon.classList.remove("expanded");
      icon.style.transform = "";
    });
  }

  // --- NGĂN SỰ KIỆN TỪ GỐC (STOP PROPAGATION) ---
  const bottomLeftControls = document.getElementById("bottom-left-controls");
  if (bottomLeftControls) {
    bottomLeftControls.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // --- LOGIC NAV BAR CLICK [FIXED] ---
  if (bottomNav) {
    bottomNav.addEventListener("click", (e) => {
      // 1. Chặn click vào controls
      if (
        e.target.closest("#bottom-left-controls") ||
        e.target.closest("button") ||
        e.target.closest("input") ||
        e.target.closest(".control-btn")
      ) {
        return;
      }

      // 2. Logic phân chia khu vực click
      // Click vào Tên bài học (Breadcrumb) -> Mở TOC
      if (e.target.closest("#nav-breadcrumb-container")) {
        toggleTocModal();
        return;
      }

      // Click vào Categories (hoặc khoảng trống còn lại) -> Mở Nav Modal
      if (navModal) navModal.classList.remove("hidden");

      // Logic mở accordion thông minh dựa trên class active
      if (navPlaceholder) {
        const activeLink = navPlaceholder.querySelector(
          "a.nav-link.current-page",
        );
        if (activeLink) {
          collapseAll();
          expandParents(activeLink);
          setTimeout(() => {
            activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      }
    });
  }

  if (breadcrumb) {
    breadcrumb.addEventListener("click", (e) => {
      e.stopPropagation();
      collapseAll();
    });
  }
});

function findAnchorElement() {
  const contentContainer =
    document.querySelector(".markdown-content") ||
    document.getElementById("content");
  if (!contentContainer) return null;

  const candidates = Array.from(contentContainer.children);

  let bestCandidate = null;
  let minScore = Infinity;
  const sweetSpot = 150;

  for (const el of candidates) {
    if (el.offsetHeight === 0) continue;

    const rect = el.getBoundingClientRect();

    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      let distance = Math.abs(rect.top);

      if (rect.top >= 0 && rect.top < sweetSpot) {
        distance = rect.top;
      } else if (rect.top < 0) {
        distance = Math.abs(rect.top) + 20;
      }

      if (/^H[1-6]$/.test(el.tagName)) {
        distance -= 50;
      }

      if (distance < minScore) {
        minScore = distance;
        bestCandidate = el;
      }
    }
  }

  if (bestCandidate) {
    const rect = bestCandidate.getBoundingClientRect();
    const topRatio = rect.top < 0 ? rect.top / rect.height : null;

    return {
      element: bestCandidate,
      topRatio: topRatio,
      initialTop: rect.top,
    };
  }
  return null;
}

function initializeFontScaler() {
  const { desktopFontSlider, mobileFontSlider } = elements;
  const STORAGE_KEY = "user_font_size_percent";
  const DEFAULT_SIZE = 100;

  let lockedAnchor = null;
  let isDragging = false;

  const startDrag = () => {
    isDragging = true;
    lockedAnchor = findAnchorElement();
  };

  const endDrag = () => {
    isDragging = false;
    lockedAnchor = null;
  };

  let currentSize = parseInt(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SIZE;

  const applyFontSize = (size) => {
    const anchor =
      isDragging && lockedAnchor ? lockedAnchor : findAnchorElement();

    requestAnimationFrame(() => {
      document.documentElement.style.fontSize = `${size}%`;

      const updateSliderVisual = (slider) => {
        if (!slider) return;
        const min = slider.min ? parseInt(slider.min) : 60;
        const max = slider.max ? parseInt(slider.max) : 140;
        const percent = ((size - min) / (max - min)) * 100;
      };
      updateSliderVisual(desktopFontSlider);
      updateSliderVisual(mobileFontSlider);

      if (anchor) {
        const newRect = anchor.element.getBoundingClientRect();
        let scrollAdjustment = 0;

        if (anchor.topRatio !== null) {
          const expectedTop = newRect.height * anchor.topRatio;
          scrollAdjustment = newRect.top - expectedTop;
        } else {
          scrollAdjustment = newRect.top - anchor.initialTop;
        }

        if (Math.abs(scrollAdjustment) > 1) {
          window.scrollBy({
            top: scrollAdjustment,
            behavior: "auto",
          });
        }
      }
    });
  };

  const updateState = (size) => {
    currentSize = size;
    if (desktopFontSlider && desktopFontSlider.value !== size)
      desktopFontSlider.value = size;
    if (mobileFontSlider && mobileFontSlider.value !== size)
      mobileFontSlider.value = size;

    localStorage.setItem(STORAGE_KEY, size);
    applyFontSize(size);
  };

  const setupSlider = (slider) => {
    if (!slider) return;

    slider.addEventListener("mousedown", startDrag);
    slider.addEventListener("touchstart", startDrag, { passive: true });

    slider.addEventListener("input", (e) => updateState(e.target.value));

    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("touchend", endDrag);
    slider.addEventListener("change", endDrag);
  };

  setupSlider(desktopFontSlider);
  setupSlider(mobileFontSlider);

  updateState(currentSize);
}

function initializeReadingMode() {
  const radioGrammar = document.getElementById("mode-grammar");
  const radioReading = document.getElementById("mode-reading");
  const grammarGroup = document.getElementById("grammar-settings-group");

  const abbrShow = document.getElementById("abbr-show");
  const abbrHide = document.getElementById("abbr-hide");

  const STORAGE_KEY = "user_reading_mode";
  let currentMode = localStorage.getItem(STORAGE_KEY) || "grammar";

  const applyMode = (mode) => {
    if (mode === "reading") {
      // 1. Chế độ ĐỌC
      if (radioReading) radioReading.checked = true;
      document.body.classList.add("reading-mode-active"); // CSS sẽ tự ẩn html gốc, hiện html raw
      if (grammarGroup) grammarGroup.style.display = "none"; // Ẩn cài đặt ngữ pháp

      // Tự động chuyển Grammatiske forkortelser sang "Skjul" và kích hoạt event
      if (abbrHide && !abbrHide.checked) {
        abbrHide.checked = true;
        abbrHide.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      // 2. Chế độ HỌC NGỮ PHÁP
      if (radioGrammar) radioGrammar.checked = true;
      document.body.classList.remove("reading-mode-active"); // CSS tự hiện html gốc, ẩn html raw
      if (grammarGroup) grammarGroup.style.display = "block"; // Hiện lại cài đặt

      // Tự động chuyển Grammatiske forkortelser sang "Vis" và kích hoạt event
      if (abbrShow && !abbrShow.checked) {
        abbrShow.checked = true;
        abbrShow.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  // Khởi chạy khi tải trang
  applyMode(currentMode);

  // Lắng nghe thao tác click của user
  document.querySelectorAll('input[name="reading-mode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const mode = e.target.value;
      localStorage.setItem(STORAGE_KEY, mode);
      applyMode(mode);
    });
  });
}

async function initializeApp() {
  initializePlatformAdaptation();
  assignElements();
  initializeMobileWarning();
  initializeScrollMemory();
  initializeHistory();
  initializeNavigation();
  initializeHeadingClickScroll();
  initializeEnhancedPlaylistModal();
  initializeToc();
  initializeFontScaler();
  initializeEnhancedKeyboardControls();
  initializeEnhancedSettingsModal();
  initializePerformanceOptimizations();
  initializeDockToggle();
  initializeMobileDrawer();
  initializeWordDoubleTapScroll();

  document.getElementById("home-btn")?.addEventListener("click", () => {
    window.location.hash = "#Categories";
  });

  window.addEventListener("hashchange", loadMarkdownContent);
  window.addEventListener(
    "optimized-resize",
    debounce(() => {}, 100),
  );

  await loadMarkdownContent();

  hideLoading();

  document.body.classList.add("app-loaded");
  window.dispatchEvent(new CustomEvent("app-initialized"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("page-hidden", document.hidden);
});
