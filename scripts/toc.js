/**
 * scripts/toc.js
 * IMPLEMENTATION: Render TOC theo cấu trúc Cây (Tree) với hỗ trợ MULTIPLE ACTIVE.
 * Tối ưu hóa DOM bằng DocumentFragment.
 */

import { elements } from "./domElements.js";
import { toggleModal } from "./util/modal.js";
import {
  extractHeadings,
  createHeadingTree,
  buildHierarchyPath,
} from "./util/headingUtils.js";

// --- State ---
let currentActiveHeading = null; // Dùng để lưu heading trên cùng (phục vụ breadcrumb)
let headingElements = [];
let headingDataList = [];
let intersectionObserver = null;
const tocModalState = { isAnimating: false };

// =============================================================================
// 1. LOGIC TRẠNG THÁI ACTIVE TỪNG MỤC (MULTI-ACTIVE)
// =============================================================================

/**
 * Bật/tắt class 'active' cho một heading cụ thể trong TOC
 * KHÔNG ảnh hưởng đến các heading khác (Hỗ trợ Multiple Active)
 */
function toggleHeadingActiveState(headingElement, isActive) {
  if (!elements.tocModalList || !headingElement) return;

  const link = elements.tocModalList.querySelector(
    `a[data-target-id="${headingElement.id}"]`
  );

  if (link) {
    if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  }
}

/**
 * Cập nhật Breadcrumb dựa trên thẻ đang active ĐẦU TIÊN (trên cùng) trong TOC
 */
function updateBreadcrumbState() {
  // Lấy ra tất cả các link đang active
  const activeLinks = elements.tocModalList?.querySelectorAll("a.active");
  
  // Ưu tiên link đầu tiên (nằm trên cùng của màn hình hiện tại)
  const firstActiveLink = activeLinks && activeLinks.length > 0 ? activeLinks[0] : null;

  if (firstActiveLink) {
    const targetId = firstActiveLink.dataset.targetId;
    const activeHeadingEl = headingElements.find((el) => el.id === targetId);

    // Nếu heading này khác với heading đang hiển thị ở breadcrumb thì cập nhật
    if (activeHeadingEl && currentActiveHeading !== activeHeadingEl) {
      currentActiveHeading = activeHeadingEl;
      updateBottomNavWithBreadcrumb(currentActiveHeading);
    }
  }
}

/**
 * Tìm heading đang nằm trên cùng của màn hình (Dùng cho lần load đầu tiên)
 */
function findCurrentActiveHeading() {
  if (!headingElements || headingElements.length === 0) return null;
  
  let active = headingElements[0];
  for (const el of headingElements) {
    const rect = el.getBoundingClientRect();
    // 180px là vùng bù trừ an toàn cho chiều cao của Header/Menu bên trên
    if (rect.top <= 180) {
      active = el;
    } else {
      break; // Tối ưu: Dừng vòng lặp khi gặp heading ở tuốt bên dưới
    }
  }
  return active;
}

// =============================================================================
// 2. KHỞI TẠO OBSERVER (BẮT SỰ KIỆN CUỘN TRANG)
// =============================================================================

function setupIntersectionObserver() {
  const options = {
    root: null,
    // Thu hẹp vùng theo dõi một chút (bỏ qua 5% trên và dưới) để kích hoạt chính xác hơn
    rootMargin: "-5% 0px -5% 0px", 
    threshold: 0, 
  };

  intersectionObserver = new IntersectionObserver((entries) => {
    let hasChanges = false;

    entries.forEach((entry) => {
      // 1. Thêm hoặc xóa class active ĐỘC LẬP cho từng entry
      toggleHeadingActiveState(entry.target, entry.isIntersecting);
      hasChanges = true;
    });

    // 2. Nếu có sự thay đổi trên TOC, tính toán lại Breadcrumb
    if (hasChanges) {
      updateBreadcrumbState();
    }
  }, options);

  headingElements.forEach((heading) => intersectionObserver.observe(heading));
}

// =============================================================================
// 3. LOGIC BREADCRUMB UI (MARQUEE & TEXT)
// =============================================================================

function getHeadingBreadcrumb(activeHeadingElement) {
  if (!activeHeadingElement || headingDataList.length === 0) return "";
  const currentHeadingObj = headingDataList.find(
    (item) => item.element === activeHeadingElement
  );
  if (!currentHeadingObj) return "";
  return buildHierarchyPath(currentHeadingObj, headingDataList).join(" › ");
}

function updateBottomNavWithBreadcrumb(activeHeading) {
  const wrapper = document.getElementById("active-heading-display");
  if (!wrapper) return;

  let span = document.getElementById("active-heading-text");
  if (!span) {
    span = wrapper.querySelector("span");
    if (!span) return;
  }

  const breadcrumbText = getHeadingBreadcrumb(activeHeading);

  if (span.textContent !== breadcrumbText) {
    // Reset animations
    span.classList.remove("marquee-active");
    span.style.removeProperty("--marquee-distance");
    span.style.removeProperty("--marquee-duration");

    span.classList.remove("text-changing");
    void span.offsetWidth; // Trigger reflow
    span.classList.add("text-changing");

    span.textContent = breadcrumbText || "";

    // Tính toán độ dài để chạy Marquee (chữ chạy ngang) nếu text quá dài
    requestAnimationFrame(() => {
      const containerWidth = wrapper.clientWidth;
      const textWidth = span.scrollWidth;

      if (textWidth > containerWidth) {
        const distance = textWidth - containerWidth + 30;
        const duration = Math.max(distance / 30, 5);

        span.style.setProperty("--marquee-distance", `${distance}px`);
        span.style.setProperty("--marquee-duration", `${duration}s`);

        span.classList.add("marquee-active");
      }
    });
  }
}

// =============================================================================
// 4. LOGIC HIỂN THỊ CÂY HTML (TOC)
// =============================================================================

function renderTreeHtml(nodes) {
  if (!nodes || nodes.length === 0) return null;

  // Sử dụng DocumentFragment để tăng tốc độ render DOM
  const ul = document.createElement("ul");
  ul.className = "toc-level";
  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.href = `#${node.id}`;
    a.className = `toc-link h${node.level}`;
    a.textContent = node.text;
    a.dataset.targetId = node.id;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      handleTocLinkClick(node.id);
    });

    li.appendChild(a);

    if (node.children && node.children.length > 0) {
      const childUl = renderTreeHtml(node.children);
      if (childUl) {
        li.appendChild(childUl);
      }
    }

    fragment.appendChild(li);
  });

  ul.appendChild(fragment);
  return ul;
}

function handleTocLinkClick(targetId) {
  // Đóng modal TOC nếu đang ở mobile
  if (window.innerWidth < 1024) {
    toggleTocModal();
  }

  const targetElement = headingElements.find((el) => el.id === targetId);
  
  if (targetElement) {
    const headerOffset = 160;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    // Cuộn trang mượt mà
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });

    // Ép bật active tạm thời để phản hồi UI ngay lập tức (trước khi observer kịp chạy)
    toggleHeadingActiveState(targetElement, true);
    updateBreadcrumbState();
  }
}

function scrollToActiveItemInModal(activeLink) {
  if (activeLink && elements.tocModalList) {
    activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// =============================================================================
// 5. KHỞI TẠO & DỌN DẸP
// =============================================================================

export function generateToc() {
  const tocListContainer = elements.tocModalList;
  const tocToggleBtn = elements.tocToggleBtn;
  
  const previousActiveId = currentActiveHeading ? currentActiveHeading.id : null;

  const isReadingMode = document.body.classList.contains("reading-mode-active");
  const activeSelector = isReadingMode ? "#raw-content-view" : "#rich-content-view";
  let contentContainer = elements.contentDiv.querySelector(activeSelector);

  if (!contentContainer) {
    contentContainer = elements.contentDiv.querySelector(".markdown-rendered");
  }

  if (tocListContainer) tocListContainer.innerHTML = "";
  headingElements = [];
  headingDataList = [];
  currentActiveHeading = null;
  cleanupToc(); 

  if (!contentContainer || !tocListContainer) {
    if (tocToggleBtn) tocToggleBtn.classList.add("hidden");
    return false;
  }

  headingDataList = extractHeadings(contentContainer, {
    selectors: "h1, h2, h3, h4, h5, h6",
  });
  headingElements = headingDataList.map((item) => item.element);

  if (headingElements.length === 0) {
    if (tocToggleBtn) tocToggleBtn.classList.add("hidden");
    tocListContainer.innerHTML = "<div class='text-center text-[var(--color-text-muted)] py-4'>No headings found</div>";
    updateBottomNavWithBreadcrumb(null);
    return false;
  }

  if (tocToggleBtn) tocToggleBtn.classList.remove("hidden");

  const headingTree = createHeadingTree(headingDataList);
  const treeHtml = renderTreeHtml(headingTree);

  if (treeHtml) {
    tocListContainer.appendChild(treeHtml);
  }

  // Bắt đầu quan sát cuộn trang
  setupIntersectionObserver();

  // Xử lý trạng thái ban đầu sau khi DOM render xong
  setTimeout(() => {
    let targetHeading = null;

    if (previousActiveId) {
      targetHeading = headingElements.find(h => h.id === previousActiveId);
    }
    
    if (!targetHeading) {
      targetHeading = findCurrentActiveHeading();
    }

    if (targetHeading) {
      toggleHeadingActiveState(targetHeading, true);
      updateBreadcrumbState();
      
      // Cuộn thanh TOC đến mục đang active
      const activeLink = elements.tocModalList?.querySelector(`a[data-target-id="${targetHeading.id}"]`);
      scrollToActiveItemInModal(activeLink);
    }
  }, 150);

  return true;
}

export function toggleTocModal() {
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return;
  }

  if (!elements.tocModal) return;
  const wasHidden = toggleModal(elements.tocModal, tocModalState);

  if (wasHidden) {
    const container = elements.tocModalList;
    if (container) {
      container.style.opacity = "0";
      container.style.transform = "translateY(10px)";

      requestAnimationFrame(() => {
        container.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";

        setTimeout(() => {
          const activeLink = elements.tocModalList?.querySelector("a.active");
          scrollToActiveItemInModal(activeLink);
        }, 100);
      });
    }
  }
}

function handleResizeState() {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

  if (isDesktop) {
    if (elements.tocModal) {
      elements.tocModal.classList.remove("hidden");
    }
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
  } else {
    if (elements.tocModal) {
      elements.tocModal.classList.add("hidden");
    }
  }
}

export function cleanupToc() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
}

export function initializeToc() {
  if (elements.tocToggleBtn)
    elements.tocToggleBtn.addEventListener("click", toggleTocModal);
  if (elements.tocModalCloseBtn)
    elements.tocModalCloseBtn.addEventListener("click", toggleTocModal);

  if (elements.tocModal) {
    elements.tocModal.addEventListener("click", (e) => {
      if (e.target === elements.tocModal) {
        toggleTocModal();
      }
    });
  }

  const mediaQuery = window.matchMedia("(min-width: 1024px)");
  try {
    mediaQuery.addEventListener("change", handleResizeState);
  } catch (e) {
    mediaQuery.addListener(handleResizeState);
  }

  handleResizeState();
  window.addEventListener("beforeunload", cleanupToc);

  document.addEventListener("keydown", (e) => {
    if (window.innerWidth >= 1024) return;

    if (e.key === "Escape" && !elements.tocModal.classList.contains("hidden")) {
      toggleTocModal();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      if (window.innerWidth < 1024) {
        toggleTocModal();
      }
    }
  });
}