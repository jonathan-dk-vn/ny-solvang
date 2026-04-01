/**
 * parallel-translations-tooltip.js
 * ─────────────────────────────────────────────────────────────────────────
 * Controller tương tác cho component Parallel Translations Tooltip.
 * Tích hợp Overlay (Focus Mode) làm mờ nội dung phía sau.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  /* ── Constants ─────────────────────────────────────────────────────── */
  const EDGE_MARGIN = 10;
  const ATTR_ROLE = "button";
  const ATTR_POPUP = "tooltip";

  /* ── State ──────────────────────────────────────────────────────────── */
  let activeTrigger = null;
  let overlayEl = null; // Biến lưu trữ màng phủ

  /* ────────────────────────────────────────────────────────────────────
     detectOverflow (ĐÃ NÂNG CẤP: Thụt lề trái để không che button)
  ──────────────────────────────────────────────────────────────────── */
function detectOverflow(trigger) {
    const tooltip = trigger.querySelector(".pt-tooltip");
    const btn = trigger.querySelector(".pt-btn");
    if (!tooltip || !btn) return;

    const container = trigger.closest(".markdown-content") || document.body;
    const containerRect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    const contentLeft = containerRect.left + paddingLeft;
    const triggerRect = trigger.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const GAP_LEFT = 50;
    
    // 1. TÍNH TOÁN CHIỀU NGANG AN TOÀN
    let tooltipAbsoluteLeft = contentLeft + GAP_LEFT;
    let adjustedWidth = window.innerWidth - 20 - tooltipAbsoluteLeft;
    
    // Nếu màn hình quá hẹp khiến Tooltip nhỏ hơn 200px
    if (adjustedWidth < 200) {
      adjustedWidth = 200; // Ép về 200px
      // Dịch cạnh trái lùi lại để đảm bảo cạnh phải vẫn cách mép màn hình 20px
      tooltipAbsoluteLeft = window.innerWidth - 20 - adjustedWidth; 
      // Không cho phép cạnh trái tràn ra ngoài mép trái màn hình
      if (tooltipAbsoluteLeft < 10) tooltipAbsoluteLeft = 10; 
    }

    const leftOffset = tooltipAbsoluteLeft - triggerRect.left;

    // 2. ÉP WIDTH ĐỂ ĐO CHIỀU CAO THỰC TẾ
    const savedVisibility = tooltip.style.visibility;
    const savedOpacity = tooltip.style.opacity;
    const savedDisplay = tooltip.style.display;

    tooltip.style.cssText +=
      ";visibility:hidden!important;opacity:0!important;display:block!important;" +
      "transition:none!important;pointer-events:none!important;" +
      `width: ${adjustedWidth}px!important;`; 

    const tooltipRect = tooltip.getBoundingClientRect();

    // 3. TÍNH TOÁN CHIỀU DỌC AN TOÀN
    let actualHeight = tooltipRect.height;
    const maxAllowedHeight = window.innerHeight - 40; // Trừ đi 20px padding trên/dưới
    
    // Nếu nội dung quá dài, ta chỉ lấy chiều cao tối đa cho phép
    if (actualHeight > maxAllowedHeight) {
      actualHeight = maxAllowedHeight;
    }

    // Căn giữa dựa trên actualHeight (đã được giới hạn)
    const targetViewportY = (window.innerHeight - actualHeight) / 2;
    const topOffset = targetViewportY - triggerRect.top;

    // Dọn dẹp
    tooltip.style.visibility = savedVisibility;
    tooltip.style.opacity = savedOpacity;
    tooltip.style.display = savedDisplay;
    tooltip.style.removeProperty("visibility");
    tooltip.style.removeProperty("opacity");
    tooltip.style.removeProperty("display");
    tooltip.style.removeProperty("transition");
    tooltip.style.removeProperty("pointer-events");
    tooltip.style.removeProperty("width");

    // 4. MŨI TÊN (Tuỳ chọn: nếu bạn giữ lại mũi tên)
    const btnCenterAbsolute = btnRect.left + btnRect.width / 2;
    let arrowLeft = btnCenterAbsolute - tooltipAbsoluteLeft;
    if (arrowLeft < 15) arrowLeft = 15;
    if (arrowLeft > adjustedWidth - 15) arrowLeft = adjustedWidth - 15;

    // 5. TRUYỀN BIẾN
    trigger.style.setProperty("--pt-dyn-width", `${adjustedWidth}px`);
    trigger.style.setProperty("--pt-dyn-left", `${leftOffset}px`);
    trigger.style.setProperty("--pt-dyn-top", `${topOffset}px`); 
    trigger.style.setProperty("--pt-dyn-arrow-left", `${arrowLeft}px`);
    
    trigger.classList.remove("pt-flip", "pt-nudge-left", "pt-nudge-right");
  }

  /* ────────────────────────────────────────────────────────────────────
     BẬT / TẮT TOOLTIP & LỚP PHỦ
  ──────────────────────────────────────────────────────────────────── */
  function openTooltip(trigger) {
    if (activeTrigger && activeTrigger !== trigger) {
      closeTooltip(activeTrigger);
    }
    detectOverflow(trigger);
    trigger.classList.add("pt-active", "pt-hovered"); // Thêm class nâng z-index
    trigger.setAttribute("aria-expanded", "true");

    document.body.classList.add("pt-overlay-active"); // Hiển thị lớp phủ
    activeTrigger = trigger;
  }

  function closeTooltip(trigger) {
    trigger.classList.remove("pt-active", "pt-hovered");
    trigger.setAttribute("aria-expanded", "false");

    document.body.classList.remove("pt-overlay-active"); // Tắt lớp phủ
    if (activeTrigger === trigger) activeTrigger = null;
  }

  function isPointerCoarse() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  /* ────────────────────────────────────────────────────────────────────
     GẮN SỰ KIỆN CHO BUTTON (THAY VÌ TOÀN BỘ TEXT)
  ──────────────────────────────────────────────────────────────────── */
  function initTrigger(trigger) {
    if (trigger.dataset.ptInit) return;
    trigger.dataset.ptInit = "1";

    // 1. Tự động sinh ra nút Button nếu chưa có
    let btn = trigger.querySelector(".pt-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.className = "pt-btn";
      // Icon dịch thuật / thông tin (bạn có thể thay bằng icon tuỳ ý)
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
      trigger.insertBefore(btn, trigger.firstChild); // Chèn vào trước text
    }

    // 2. Chuyển ARIA và Focus từ văn bản sang Button
    trigger.removeAttribute("tabindex");
    trigger.removeAttribute("role");

    btn.setAttribute("tabindex", "0");
    btn.setAttribute("role", ATTR_ROLE);
    btn.setAttribute("aria-haspopup", ATTR_POPUP);
    btn.setAttribute("aria-expanded", "false");

    const tooltip = trigger.querySelector(".pt-tooltip");
    let hideTimeout;

    // Hàm mở an toàn
    const show = () => {
      clearTimeout(hideTimeout);
      if (!isPointerCoarse()) {
        detectOverflow(trigger);
        trigger.classList.add("pt-hovered");
        document.body.classList.add("pt-overlay-active");
      }
    };

    // Hàm đóng có độ trễ (để người dùng kịp di chuột từ button sang tooltip)
    const hide = () => {
      hideTimeout = setTimeout(() => {
        if (!isPointerCoarse()) {
          trigger.classList.remove("pt-hovered");
          if (!activeTrigger)
            document.body.classList.remove("pt-overlay-active");
        }
      }, 150); // Cho phép trễ 150ms để di chuột
    };

    /* ── Desktop: Chỉ bắt sự kiện chuột trên BUTTON và TOOLTIP ── */
    btn.addEventListener("mouseenter", show);
    btn.addEventListener("mouseleave", hide);

    if (tooltip) {
      tooltip.addEventListener("mouseenter", show);
      tooltip.addEventListener("mouseleave", hide);
    }

    /* ── Mobile: Chạm vào BUTTON để Toggle ── */
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Ngăn click lan ra ngoài document
      if (!isPointerCoarse()) return;
      if (trigger.classList.contains("pt-active")) {
        closeTooltip(trigger);
      } else {
        openTooltip(trigger);
      }
    });

    /* ── Bàn phím: Enter/Space ── */
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (trigger.classList.contains("pt-active")) {
          closeTooltip(trigger);
        } else {
          openTooltip(trigger);
          if (!isPointerCoarse()) {
            trigger.classList.add("pt-hovered");
            document.body.classList.add("pt-overlay-active");
          }
        }
      }
      if (e.key === "Escape") {
        closeTooltip(trigger);
        btn.blur();
      }
    });

    /* ── Bàn phím: Focus ── */
    btn.addEventListener("focusin", show);
    btn.addEventListener("focusout", (e) => {
      if (!trigger.contains(e.relatedTarget)) {
        if (!isPointerCoarse()) {
          trigger.classList.remove("pt-active", "pt-hovered");
          btn.setAttribute("aria-expanded", "false");
          if (activeTrigger === trigger) activeTrigger = null;
          document.body.classList.remove("pt-overlay-active");
        }
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────────
     KHỞI TẠO DOM VÀ OVERLAY GLOBAL
  ──────────────────────────────────────────────────────────────────── */
  function init() {
    // 1. Tự động sinh ra 1 thẻ Div màng phủ (Overlay) nếu chưa có
    if (!document.getElementById("pt-global-overlay")) {
      overlayEl = document.createElement("div");
      overlayEl.id = "pt-global-overlay";
      document.body.appendChild(overlayEl);

      // Cho phép bấm ra ngoài màng phủ để đóng Tooltip an toàn
      overlayEl.addEventListener("click", () => {
        if (activeTrigger) closeTooltip(activeTrigger);
        document.body.classList.remove("pt-overlay-active");
        document
          .querySelectorAll(".pt-hovered")
          .forEach((el) => el.classList.remove("pt-hovered"));
      });
    }

    // 2. Gắn sự kiện cho các Tooltip
    document.querySelectorAll(".pt-trigger").forEach(initTrigger);
  }

  /* ────────────────────────────────────────────────────────────────────
     Sự kiện Global
  ──────────────────────────────────────────────────────────────────── */

  // Click ra ngoài khoảng trống (Nếu không dính vào Overlay)
  document.addEventListener("click", (e) => {
    if (
      activeTrigger &&
      !activeTrigger.contains(e.target) &&
      e.target.id !== "pt-global-overlay"
    ) {
      closeTooltip(activeTrigger);
    }
  });

  const reposition = () => {
    if (activeTrigger) detectOverflow(activeTrigger);
  };
  window.addEventListener("resize", reposition, { passive: true });
  window.addEventListener("scroll", reposition, {
    passive: true,
    capture: true,
  });

  /* ── Mutation Observer (Lazy loading) ── */
  const observer = new MutationObserver((mutations) => {
    let hasNewTriggers = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          node.classList?.contains("pt-trigger") ||
          node.querySelector?.(".pt-trigger")
        ) {
          hasNewTriggers = true;
          break;
        }
      }
      if (hasNewTriggers) break;
    }
    if (hasNewTriggers) init();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  /* ── Bootstrap ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("content-rendered", () => {
    setTimeout(() => {
      init();
    }, 50);
  });
})();
