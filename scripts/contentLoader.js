// scripts/contentLoader.js
import { elements } from "./domElements.js";
import { restructuredNavData } from "./navigationData.generated.js";
import {
  updateTimeDisplay,
  handleProgressBarChange,
  setPlaybackRate,
} from "./audioUtils.js";
import { generateToc } from "./toc.js";
import { showLoading, hideLoading } from "./loading.js";
import { toggleModal } from "./util/modal.js";
import debugLog from "./util/debug.js";
import { restoreReadingPosition } from "./scrollMemory.js";
import { addPageToHistory } from "./history.js";
import {
  createTextAreaForAudioButton,
  setupAudioTextAreaSync,
  initializeTextAreaSystem,
  focusCurrentAudioTextArea,
  removeCurrentTextArea,
} from "./textAreaManager.js";

// Import hàm xử lý String (đã tối ưu) - loại bỏ Layout Thrashing
import { formatStackedAbbreviations } from "./grammarLegend.js";

const AUDIO_BASE_URL = "https://pub-972fa9cd102b4f668be539d1ad1f76e3.r2.dev/";

let contentAudioButtons = [];
let currentPlayingButton = null;
let isGlobalPlayerInitialized = false;
let isTextAreaSystemInitialized = false;
const playlistModalState = { isAnimating: false };
let isContentDivListenerAttached = false;

// ============================================================
// HELPER FUNCTIONS - Element Position & Scrolling
// ============================================================

function logElementPosition(element, eventName) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  debugLog(
    `%c[DEBUG] Vị trí nút audio tại sự kiện '${eventName}':`,
    "color: #ff6f61;",
    {
      top: rect.top.toFixed(2),
      left: rect.left.toFixed(2),
      height: rect.height.toFixed(2),
    },
  );
}

function scrollToPosition(element) {
  if (!element) {
    debugLog(
      "error",
      "📜 [scrollToPosition] Lỗi: Không có element nào được cung cấp để cuộn.",
    );
    return Promise.resolve();
  }
  const startTime = performance.now();
  logElementPosition(element, "Bắt đầu cuộn");
  debugLog(
    `📜 [${startTime.toFixed(
      2,
    )}ms] [scrollToPosition] Bắt đầu cuộn đến 70% viewport.`,
  );
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const targetPosition = rect.top + scrollTop - window.innerHeight * 0.3;
  window.scrollTo({
    top: targetPosition,
    behavior: "smooth",
  });
  return new Promise((resolve) =>
    setTimeout(() => {
      const endTime = performance.now();
      logElementPosition(element, "Cuộn hoàn tất (ước tính)");
      debugLog(
        `✅ [${endTime.toFixed(
          2,
        )}ms] [scrollToPosition] Đã ra lệnh cuộn. Tổng thời gian: ${(
          endTime - startTime
        ).toFixed(2)}ms`,
      );
      resolve();
    }, 600),
  );
}

// ============================================================
// PLAYLIST MODAL FUNCTIONS
// ============================================================

function populatePlaylistModal() {
  const { playlistModalList, playlistToggleBtn } = elements;
  if (!playlistModalList || !playlistToggleBtn) return;
  playlistModalList.innerHTML = "";
  if (contentAudioButtons.length > 1) {
    playlistToggleBtn.classList.remove("hidden");
  } else {
    playlistToggleBtn.classList.add("hidden");
  }
  if (contentAudioButtons.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "playlist-empty";
    emptyState.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p>No audio tracks available on this page</p>
      </div>
    `;
    playlistModalList.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  contentAudioButtons.forEach((button, index) => {
    const buttonText =
      button.querySelector("span")?.textContent || `Track ${index + 1}`;

    const listItem = document.createElement("li");
    listItem.dataset.audiosrc = button.dataset.audiosrc;
    listItem.dataset.trackNumber = index + 1;

    listItem.className =
      "playlist-item cursor-pointer flex items-center gap-3 p-4 rounded-lg hover:bg-[var(--color-bg-interactive-hover)] transition-colors group";

    listItem.innerHTML = `
      <span class="text-[var(--color-text-muted)] font-mono text-sm w-6 text-right group-hover:text-[var(--color-text-link)] transition-colors">${
        index + 1
      }.</span>
      <div class="flex-grow">
        <span class="block text-sm font-semibold text-[var(--color-text-headings)] line-clamp-1">${buttonText}</span>
      </div>
      <div class="playing-indicator hidden">
         <svg class="w-4 h-4 text-[var(--color-btn-play)] animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
      </div>
    `;

    listItem.addEventListener("click", () => {
      playAudioFromButton(button);
      setTimeout(() => {
        togglePlaylistModal();
      }, 200);
    });

    fragment.appendChild(listItem);
  });

  playlistModalList.appendChild(fragment);
  setTimeout(addStaggeredPlaylistAnimations, 100);
  updatePlaylistActiveState();
}

function addStaggeredPlaylistAnimations() {
  const playlistItems =
    elements.playlistModalList.querySelectorAll(".playlist-item");
  playlistItems.forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateX(-30px) scale(0.95)";
    setTimeout(() => {
      item.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
      item.style.opacity = "1";
      item.style.transform = "translateX(0) scale(1)";
    }, index * 50);
  });
}

function updatePlaylistActiveState() {
  const { playlistModalList } = elements;
  if (!playlistModalList) return;
  playlistModalList.querySelectorAll("li").forEach((item) => {
    item.classList.remove("now-playing");
    item.querySelector(".playing-indicator").classList.add("hidden");
  });
  if (currentPlayingButton) {
    const activeSrc = currentPlayingButton.dataset.audiosrc;
    const activeItem = playlistModalList.querySelector(
      `li[data-audiosrc="${activeSrc}"]`,
    );
    if (activeItem) {
      activeItem.classList.add("now-playing");
      activeItem.querySelector(".playing-indicator").classList.remove("hidden");
      scrollToActivePlaylistItem(activeItem);
    }
  }
}

function scrollToActivePlaylistItem(activeItem) {
  if (!activeItem || !elements.playlistModalList) return;
  const modalScrollContainer = activeItem.parentElement.parentElement;
  if (!modalScrollContainer) return;
  const itemOffsetTop = activeItem.offsetTop;
  const modalHeight = modalScrollContainer.clientHeight;
  const itemHeight = activeItem.offsetHeight;
  const scrollTop = itemOffsetTop - modalHeight / 2 + itemHeight / 2;
  modalScrollContainer.scrollTo({
    top: Math.max(0, scrollTop),
    behavior: "smooth",
  });
}

function togglePlaylistModal() {
  const wasHidden = toggleModal(elements.playlistModal, playlistModalState);
  if (wasHidden) {
    setTimeout(() => {
      const nowPlayingItem =
        elements.playlistModalList?.querySelector(".now-playing");
      if (nowPlayingItem) {
        scrollToActivePlaylistItem(nowPlayingItem);
      }
    }, 400);
  }
}

function navigatePlaylistWithKeyboard(direction) {
  const playlistItems =
    elements.playlistModalList?.querySelectorAll(".playlist-item");
  if (!playlistItems || playlistItems.length === 0) return;
  let currentIndex = Array.from(playlistItems).findIndex((item) =>
    item.classList.contains("keyboard-selected"),
  );
  if (currentIndex === -1) {
    currentIndex = currentPlayingButton
      ? contentAudioButtons.indexOf(currentPlayingButton)
      : -1;
  }
  const newIndex =
    (currentIndex + direction + playlistItems.length) % playlistItems.length;
  const targetItem = playlistItems[newIndex];
  if (targetItem) {
    playlistItems.forEach((item) => item.classList.remove("keyboard-selected"));
    targetItem.classList.add("keyboard-selected");
    scrollToActivePlaylistItem(targetItem);
  }
}

function playSelectedPlaylistItem() {
  const selectedItem =
    elements.playlistModalList?.querySelector(".keyboard-selected");
  if (selectedItem) {
    selectedItem.click();
  }
}

// ============================================================
// GLOBAL PLAYER FUNCTIONS
// ============================================================

function initializeGlobalPlayer() {
  const gp = elements.globalPlayer;
  debugLog(
    "🔧 [initializeGlobalPlayer] Bắt đầu thiết lập trình phát toàn cục.",
  );
  if (gp.playPauseBtn) {
    gp.playPauseBtn.addEventListener("click", toggleGlobalPlayPause);
  }
  if (gp.nextBtn) {
    gp.nextBtn.addEventListener("click", playNextTrack);
  }
  if (gp.audio) {
    gp.audio.addEventListener("timeupdate", updateGlobalProgress);
    gp.audio.addEventListener("loadedmetadata", () => {
      debugLog("ℹ️ [loadedmetadata] Metadata đã tải, cập nhật thời lượng.");
      updateGlobalDuration();
    });
    gp.audio.addEventListener("canplay", () => {
      debugLog("▶️ [canplay] Audio đã sẵn sàng để phát.");
      if (gp.audio.src && gp.audio.src !== window.location.href) {
        const playPromise = gp.audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            debugLog(
              "error",
              "Lỗi tự động phát. Trình duyệt có thể đã chặn nó.",
              e,
            );
            updatePlayPauseIcons(true);
          });
        }
      }
    });
    gp.audio.addEventListener("play", () => {
      debugLog("▶️ [play] Sự kiện 'play' được kích hoạt.");
      updatePlayPauseIcons(false);
    });
    gp.audio.addEventListener("pause", () => {
      debugLog("⏸️ [pause] Sự kiện 'pause' được kích hoạt.");
      updatePlayPauseIcons(true);
    });
    gp.audio.addEventListener("ended", handleGlobalAudioEnd);
  }
  if (gp.progressBar) {
    gp.progressBar.addEventListener("input", (e) => {
      debugLog("🔄 [progressBar] Người dùng tương tác với thanh tiến trình.");
      handleProgressBarChange(e, gp.audio);
    });
  }
  if (gp.playbackRateControls) {
    gp.playbackRateControls.addEventListener("click", (e) => {
      if (e.target.name === "playback-rate") {
        const rate = parseFloat(e.target.value);
        debugLog(`⏩ [playbackRate] Thay đổi tốc độ phát thành: ${rate}x`);
        setPlaybackRate(gp.audio, rate);
      }
    });
  }
  setPlaybackRate(gp.audio, 1);
  const rate1Radio = document.querySelector(
    'input[name="playback-rate"][value="1"]',
  );
  if (rate1Radio) rate1Radio.checked = true;
  const multiplePlayRadio = document.querySelector(
    'input[name="playback-mode"][value="multiple"]',
  );
  if (multiplePlayRadio) multiplePlayRadio.checked = true;
  if (gp.audio) {
    gp.audio.loop = false;
  }
  debugLog(
    "✅ [initializeGlobalPlayer] Thiết lập trình phát toàn cục hoàn tất.",
  );
  isGlobalPlayerInitialized = true;
}

function playNextTrack() {
  if (!currentPlayingButton || contentAudioButtons.length < 2) return;
  const currentIndex = contentAudioButtons.indexOf(currentPlayingButton);
  const nextIndex = (currentIndex + 1) % contentAudioButtons.length;
  debugLog(
    `⏭️ [playNextTrack] Chuyển từ bài ${currentIndex + 1} sang bài ${
      nextIndex + 1
    }.`,
  );
  playAudioFromButton(contentAudioButtons[nextIndex]);
}

function toggleGlobalPlayPause() {
  const gp = elements.globalPlayer;
  debugLog(
    `⏯️ [toggleGlobalPlayPause] Trạng thái audio hiện tại: ${
      gp.audio.paused ? "paused" : "playing"
    }`,
  );
  if (gp.audio.paused) {
    if (!gp.audio.src || gp.audio.src === window.location.href) {
      debugLog(
        "▶️ [toggleGlobalPlayPause] Không có audio, phát bài đầu tiên trong danh sách.",
      );
      if (contentAudioButtons.length > 0) {
        playAudioFromButton(contentAudioButtons[0]);
      } else {
        debugLog(
          "warn",
          "⚠️ [toggleGlobalPlayPause] Không có audio nào để phát.",
        );
      }
    } else {
      debugLog("▶️ [toggleGlobalPlayPause] Tiếp tục phát audio hiện tại.");
      gp.audio.play().catch((e) => debugLog("error", "Lỗi khi phát lại:", e));
    }
  } else {
    debugLog("⏸️ [toggleGlobalPlayPause] Tạm dừng audio hiện tại.");
    gp.audio.pause();
  }
}

function updateGlobalProgress() {
  const gp = elements.globalPlayer;
  if (!isFinite(gp.audio.duration) || gp.audio.duration === 0) {
    return;
  }
  const progressPercent = (gp.audio.currentTime / gp.audio.duration) * 100;
  gp.progressBar.value = progressPercent;
  const filledColor = "var(--color-btn-play)";
  const emptyColor = "var(--color-border)";
  gp.progressBar.style.background = `linear-gradient(to right, ${filledColor} ${progressPercent}%, ${emptyColor} ${progressPercent}%)`;
  updateTimeDisplay(gp.audio, gp.currentTimeEl, gp.durationTimeEl);
}

function updateGlobalDuration() {
  updateTimeDisplay(
    elements.globalPlayer.audio,
    elements.globalPlayer.currentTimeEl,
    elements.globalPlayer.durationTimeEl,
  );
}

function handleGlobalAudioEnd() {
  debugLog("🏁 [handleGlobalAudioEnd] Audio đã kết thúc.");
  const mode =
    document.querySelector('input[name="playback-mode"]:checked')?.value ||
    "multiple";
  if (window.titleManager) window.titleManager.clearAudioFromTitle();
  if (mode === "single") {
    debugLog("🔁 [handleGlobalAudioEnd] Chế độ single, phát lại từ đầu.");
    elements.globalPlayer.audio.currentTime = 0;
    elements.globalPlayer.audio
      .play()
      .catch((e) => debugLog("error", "Audio replay failed:", e));
  } else {
    debugLog(
      "⏭️ [handleGlobalAudioEnd] Chế độ multiple, chuyển bài tiếp theo.",
    );
    setTimeout(() => playNextTrack(), 150);
  }
}

function updatePlayPauseIcons(isPaused) {
  const gp = elements.globalPlayer;
  const playIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
    </svg>
  `;
  const pauseIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H8zm5 0a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1h-1z" clip-rule="evenodd" />
    </svg>
  `;

  if (gp.playPauseBtn) {
    gp.playPauseBtn.innerHTML = isPaused ? playIcon : pauseIcon;
  }

  contentAudioButtons.forEach((btn) => {
    btn.classList.remove("playing", "now-playing");
    const span = btn.querySelector("span");
    if (span) {
      btn.innerHTML = `<span>${span.textContent}</span>`;
    }
  });

  if (!isPaused && currentPlayingButton) {
    currentPlayingButton.classList.add("playing", "now-playing");
    const span = currentPlayingButton.querySelector("span");
    if (span) {
      currentPlayingButton.innerHTML = `⏸ ${span.outerHTML}`;
    }

    const audioTitle = currentPlayingButton.querySelector("span")?.textContent;
    if (window.titleManager && audioTitle) {
      window.titleManager.updateTitleWithAudio(audioTitle);
    }
  } else if (window.titleManager) {
    window.titleManager.clearAudioFromTitle();
  }
}

async function playAudioFromButton(button) {
  const audioSrc = button.dataset.audiosrc;
  const gp = elements.globalPlayer;
  const fullSrc = AUDIO_BASE_URL + audioSrc;
  const startTime = performance.now();
  debugLog(
    `\n🚀 [playAudioFromButton] Bắt đầu phiên làm việc mới cho: ${audioSrc} lúc ${startTime.toFixed(
      2,
    )}ms`,
  );
  logElementPosition(button, "Bắt đầu playAudioFromButton");

  if (currentPlayingButton === button) {
    debugLog(
      "⏯️ [playAudioFromButton] Cùng một bài hát, chỉ toggle play/pause.",
    );
    toggleGlobalPlayPause();
    return;
  }

  gp.audio.pause();
  gp.progressBar.value = 0;
  gp.progressBar.style.background = `linear-gradient(to right, var(--color-border) 0%, var(--color-border) 100%)`;
  gp.currentTimeEl.textContent = "00:00";
  gp.durationTimeEl.textContent = "00:00";
  gp.titleEl.textContent = "Đang tải...";
  updatePlayPauseIcons(true);
  currentPlayingButton = button;
  updatePlaylistActiveState();
  const audioTitle =
    button.querySelector("span")?.textContent || "Now playing...";
  gp.titleEl.textContent = audioTitle;
  gp.audio.src = fullSrc;
  gp.audio.load();
  if (window.titleManager) {
    window.titleManager.updateTitleWithAudio(audioTitle);
  }
  const handleUiTransition = async () => {
    const playbackMode =
      document.querySelector('input[name="playback-mode"]:checked')?.value ||
      "multiple";
    logElementPosition(button, "Trước khi xóa Text Area cũ");
    await removeCurrentTextArea();
    if (playbackMode === "single") {
      debugLog(
        "📜 [handleUiTransition] Chế độ Single Track, đang tạo Text Area.",
      );
      logElementPosition(button, "Sau khi xóa Text Area cũ (bố cục ổn định)");
      await createTextAreaForAudioButton(button);
      logElementPosition(button, "Sau khi tạo Text Area mới (bố cục thay đổi)");
      await scrollToPosition(button);
      logElementPosition(button, "Sau khi cuộn xong");
      focusCurrentAudioTextArea();
    } else {
      debugLog(
        "📜 [handleUiTransition] Chế độ Multiple Tracks, không tạo Text Area.",
      );
      await scrollToPosition(button.closest("p") || button);
    }
  };
  handleUiTransition();
  const endTime = performance.now();
  debugLog(
    `✅ [${endTime.toFixed(
      2,
    )}ms] [playAudioFromButton] Đã ra lệnh cho tất cả các hành động. Tổng thời gian: ${(
      endTime - startTime
    ).toFixed(2)}ms`,
  );
}

// ============================================================
// MAIN CONTENT LOADER - [REFACTORED VERSION]
// ============================================================

export async function loadMarkdownContent() {
  showLoading();

  if (!isTextAreaSystemInitialized) {
    initializeTextAreaSystem();
    isTextAreaSystemInitialized = true;
  }
  if (!isGlobalPlayerInitialized) {
    initializeGlobalPlayer();
    setupAudioTextAreaSync();
  }

  const gp = elements.globalPlayer;

  let hash = window.location.hash.slice(1);
  if (!hash || hash === "") {
    hash = "Categories";
    window.history.replaceState(null, "", "#Categories");
  }

  const decodedHash = decodeURIComponent(hash);
  const currentLang = localStorage.getItem("grammar_abbr_language") || "da";
  const targetFolder = currentLang === "en" ? "html-data-en" : "html-data";
  const htmlFileName = `${targetFolder}/${decodedHash}.html`;

  try {
    const res = await fetch(`${htmlFileName}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Không tìm thấy file: ${htmlFileName}`);

    let htmlContent = await res.text();
    htmlContent = formatStackedAbbreviations(htmlContent);

    // =========================================================================
    // MAGIC DOM PARSER: TỰ ĐỘNG BIẾN <table> CŨ SANG TOOLTIP HTML MỚI
    // =========================================================================
    // =========================================================================
    // MAGIC DOM PARSER: TỰ ĐỘNG BIẾN <table> CŨ SANG TOOLTIP HTML MỚI
    // =========================================================================
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const tables = doc.querySelectorAll("table.parallel-translations");

    tables.forEach((table) => {
      const rows = table.querySelectorAll("tr"); // Lấy TẤT CẢ các dòng
      const block = document.createElement("div");
      block.className = "pt-block";

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td, th"); // Bắt cả thẻ th (header) và td
        if (cells.length >= 3) {
          // HÀM QUAN TRỌNG: Dọn sạch thẻ <p> do Markdown tự sinh ra để không làm vỡ DOM
          // HÀM QUAN TRỌNG: Dọn sạch thẻ <p> do Markdown tự sinh ra để không làm vỡ DOM
          const cleanHTML = (html) => html.replace(/<\/?p[^>]*>/g, "").trim();

          const original = cleanHTML(cells[0].innerHTML);
          const trans1 = cleanHTML(cells[1].innerHTML);
          const trans2 = cleanHTML(cells[2].innerHTML);

          // Bỏ qua nếu dòng trống hoàn toàn
          if (!original && !trans1 && !trans2) return;
          // ==========================================================
          // ==========================================================
          // MAGIC DOM 2.0: TẠO 1 BẢNG TỪ VỰNG DUY NHẤT (DẠNG LIST HORIZONTAL)
          // ==========================================================
          const buildVocabTable = (htmlString) => {
            const temp = document.createElement("div");
            temp.innerHTML = htmlString;

            const stacks = temp.querySelectorAll(".grammar-stack");

            // Nếu câu không có ngữ pháp nào được highlight, trả về văn bản gốc
            if (stacks.length === 0) {
              return `<span class="pt-item-text" style="font-size: 0.95rem; font-weight: 600;">${htmlString}</span>`;
            }

            // BƯỚC 1: Cấu trúc dữ liệu theo đúng định dạng label tiếng Việt để hiển thị đồng bộ
            const grammarMapping = [
              { id: "(nguyên mẫu)", class: "highlight-verb-inf", label: "nguyên mẫu", order: 1, isVerb: true },
              { id: "(hiện tại)", class: "highlight-verb-pres", label: "hiện tại", order: 2, isVerb: true },
              { id: "(động từ quá khứ)", class: "highlight-verb-past", label: "quá khứ", order: 3, isVerb: true },
              { id: "(hiện tại hoàn thành)", class: "highlight-verb-perf", label: "hoàn thành", order: 4, isVerb: true },
              { id: "(quá khứ hoàn thành)", class: "highlight-verb-pastperf", label: "qk hoàn thành", order: 5, isVerb: true },
              { id: "(mệnh lệnh)", class: "highlight-verb-imp", label: "mệnh lệnh", order: 6, isVerb: true },
              { id: "(đại từ)", class: "highlight-pron", label: "đại từ", order: 7, isVerb: false },
              { id: "(liên từ)", class: "highlight-conj", label: "liên từ", order: 8, isVerb: false },
              { id: "(giới từ)", class: "highlight-prep", label: "giới từ", order: 9, isVerb: false },
              { id: "(t-từ)", class: "highlight-t-word", label: "t-từ", order: 10, isVerb: false },
              { id: "(danh từ)", class: "highlight-sub", label: "danh từ", order: 11, isVerb: false },
              { id: "(tính từ)", class: "highlight-adj", label: "tính từ", order: 12, isVerb: false },
              { id: "(trạng từ)", class: "highlight-adv", label: "trạng từ", order: 13, isVerb: false },
              { id: "(trạng từ trung tâm)", class: "highlight-central-adv", label: "trạng từ TT", order: 14, isVerb: false },
              
              // Map English abbr in case users switch to English
              { id: "(noun)", class: "highlight-sub", label: "danh từ", order: 11, isVerb: false },
              { id: "(adj)", class: "highlight-adj", label: "tính từ", order: 12, isVerb: false },
              { id: "(adv)", class: "highlight-adv", label: "trạng từ", order: 13, isVerb: false },
              { id: "(prep)", class: "highlight-prep", label: "giới từ", order: 9, isVerb: false },
              { id: "(conj)", class: "highlight-conj", label: "liên từ", order: 8, isVerb: false },
              { id: "(infinitive)", class: "highlight-verb-inf", label: "nguyên mẫu", order: 1, isVerb: true },
              { id: "(present verb)", class: "highlight-verb-pres", label: "hiện tại", order: 2, isVerb: true },
              { id: "(past verb)", class: "highlight-verb-past", label: "quá khứ", order: 3, isVerb: true },
              { id: "(present perf)", class: "highlight-verb-perf", label: "hoàn thành", order: 4, isVerb: true },
              { id: "(past perf)", class: "highlight-verb-pastperf", label: "qk hoàn thành", order: 5, isVerb: true },
              { id: "(imperative)", class: "highlight-verb-imp", label: "mệnh lệnh", order: 6, isVerb: true },
              { id: "(central adv)", class: "highlight-central-adv", label: "trạng từ TT", order: 14, isVerb: false },
              { id: "(pronoun)", class: "highlight-pron", label: "đại từ", order: 7, isVerb: false },
              { id: "(t-word)", class: "highlight-t-word", label: "t-từ", order: 10, isVerb: false },
            ];

            const wordsByType = {};
            const typeInfoMap = {};

            // BƯỚC 2: Phân tích ngữ pháp từ chuỗi HTML
            stacks.forEach((stack) => {
              const wordEl = stack.querySelector(
                '[class^="highlight-"]:not(.word-abbr)',
              );
              const abbrEl = stack.querySelector(".word-abbr");

              if (wordEl && abbrEl) {
                const abbrText = abbrEl.textContent.trim().toLowerCase();
                const rawWordText = wordEl.textContent.trim();
                
                // Tìm thông tin mapping dựa trên từ viết tắt
                const mapping = grammarMapping.find(m => m.id === abbrText);
                
                if (mapping) {
                   const className = mapping.class;
                   if (!wordsByType[className]) {
                     wordsByType[className] = new Set();
                     typeInfoMap[className] = mapping;
                   }
                   wordsByType[className].add(rawWordText);
                }
              }
            });

            // BƯỚC 3: Xây dựng HTML dạng List Horizontal
            const buildHorizontalList = (types, title) => {
              // Lọc và sắp xếp các loại từ có dữ liệu
              const validTypes = types
                .filter(className => wordsByType[className] && wordsByType[className].size > 0)
                .sort((a, b) => typeInfoMap[a].order - typeInfoMap[b].order);

              if (validTypes.length === 0) return "";

              let listHTML = `<div style="display: flex; flex-direction: column; gap: 8px;">`;

              validTypes.forEach((className, index) => {
                if (index > 0) {
                  listHTML += `<div style="height: 1px; background-color: var(--color-border); opacity: 0.6; border-radius: 1px;"></div>`;
                }
                
                const info = typeInfoMap[className];
                const wordsArray = Array.from(wordsByType[className]);
                
                const wordsString = wordsArray.map((word, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return `
                    <span style="display: inline-block; color: var(--color-text-body); font-weight: 500; margin-right: 6px;">
                      ${word}${!isLast ? '<span style="color: var(--color-border);">,</span>' : ''}
                    </span>
                  `.trim();
                }).join('');

                listHTML += `
                  <div style="line-height: 1.6;">
                    <span class="${className}" style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; border: 1px solid currentColor; margin-right: 6px; vertical-align: middle;">
                      ${info.label}
                    </span>
                    <span style="font-size: 0.9rem;">
                      ${wordsString}
                    </span>
                  </div>
                `;
              });

              listHTML += `</div>`; 

              return `
                <div style="margin-bottom: 12px;">
                  ${title ? `<div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${title}</div>` : ""}
                  ${listHTML}
                </div>
              `;
            };

            // BƯỚC 4: LỌC BỎ CÁC CLASS BỊ TRÙNG LẶP (DUPLICATES) BẰNG SET
            const verbTypes = [...new Set(grammarMapping.filter(m => m.isVerb).map(m => m.class))];
            const otherTypes = [...new Set(grammarMapping.filter(m => !m.isVerb).map(m => m.class))];

            const verbHTML = buildHorizontalList(verbTypes, ""); // Bỏ tiêu đề để tiết kiệm diện tích Tooltip
            const otherHTML = buildHorizontalList(otherTypes, "");

            return `
              <div class="tooltip-grammar-list" style="padding-top: 4px;">
                ${otherHTML}
                ${verbHTML}
              </div>
            `;
          };

          // ==========================================================
          // [NÂNG CẤP]: CHỌN NGUỒN TẠO BẢNG TỪ VỰNG & HIỂN THỊ DỰA TRÊN NGÔN NGỮ
          // Nếu đang ở chế độ Tiếng Anh ("en"), lấy câu thứ 2 (trans1)
          // Ngược lại, lấy câu gốc (original - Tiếng Đan Mạch)
          const activeSentence = currentLang === "en" ? trans1 : original;
          const vocabTableHTML = buildVocabTable(activeSentence);
          // ==========================================================

          const trigger = document.createElement("span");
          trigger.className = "pt-trigger";
          trigger.setAttribute("tabindex", "0");

          // Thay thế ${original} thành ${activeSentence} ở thẻ pt-trigger-text
          trigger.innerHTML = `
            <span class="pt-trigger-text">${activeSentence}</span>
            <span class="pt-tooltip">

              <span class="pt-item pt-item--original">
                <span class="pt-item-text" style="font-size: 1rem; font-weight: 600;">${original}</span>
              </span>
              <span class="pt-separator"></span>

              <br>

             <span class="pt-item pt-item--primary">
                <span class="pt-item-text">${trans1}</span>
              </span>
              <span class="pt-separator"></span>
              
              <br>

              <span class="pt-item pt-item--secondary">
                <span class="pt-item-text">${trans2}</span>
              </span>
              <span class="pt-arrow"></span>

              <br>

              <span class="pt-item pt-item--original" style="margin-bottom: 4px;">
                ${vocabTableHTML}
              </span>
              <span class="pt-separator"></span>
              
            </span>
          `;

          block.appendChild(trigger);
          block.appendChild(document.createTextNode(" ")); // Khoảng trắng giữa các câu
        }
      });
      // Thay thế bảng cũ bằng khối Tooltip mới
      table.parentNode.replaceChild(block, table);
    });

    htmlContent = doc.body.innerHTML;
    // =========================================================================
    // =========================================================================

    elements.contentDiv.innerHTML = `<div class="markdown-rendered">${htmlContent}</div>`;

    // (Giữ nguyên toàn bộ phần code bên dưới của bạn...)

    // Quét Audio
    contentAudioButtons = Array.from(
      elements.contentDiv.querySelectorAll(".content-play-btn"),
    );
    const hasAudio = contentAudioButtons.length > 0;

    if (elements.floatingDock) elements.floatingDock.classList.remove("hidden");
    document.body.classList.toggle("no-audio-mode", !hasAudio);

    if (gp.container) gp.container.classList.remove("hidden");

    // Reset Player
    if (hasAudio) {
      gp.audio.pause();
      currentPlayingButton = null;
      gp.titleEl.textContent = "Sẵn sàng";
      updatePlayPauseIcons(true);
      if (!isContentDivListenerAttached) {
        elements.contentDiv.addEventListener("click", handleContentDivClick);
        isContentDivListenerAttached = true;
      }
    } else {
      if (gp.audio) {
        gp.audio.pause();
        gp.audio.src = "";
      }
      currentPlayingButton = null;
      if (gp.titleEl) gp.titleEl.textContent = "Không có audio";
    }

    // UI Updates
    populatePlaylistModal();
    addPageToHistory(decodedHash);
    generateToc();
    updatePlaylistActiveState();

    window.dispatchEvent(new CustomEvent("content-rendered"));
    restoreReadingPosition();
  } catch (error) {
    console.error("Lỗi tải nội dung:", error);
    elements.contentDiv.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
        <p>Hjemmesiden kunne ikke indlæses: ${decodedHash}</p>
        <button onclick="window.location.hash='#Categories'; location.reload();" class="mt-4 text-[var(--color-text-link)] hover:underline">Tilbage til hjemmesiden</button>
      </div>`;
  } finally {
    hideLoading();
  }
}

// ============================================================
// EVENT HANDLER
// ============================================================

function handleContentDivClick(event) {
  const button = event.target.closest(".content-play-btn");
  if (button) {
    playAudioFromButton(button);
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  togglePlaylistModal,
  navigatePlaylistWithKeyboard,
  playSelectedPlaylistItem,
  updatePlaylistActiveState,
  playAudioFromButton,
};
