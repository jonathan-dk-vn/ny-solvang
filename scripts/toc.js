/**
 * scripts/toc.js
 * IMPLEMENTATION: Render TOC theo cấu trúc Cây (Tree) với tối ưu hóa DOM (Batch Rendering)
 */

import { elements } from "./domElements.js";
import { toggleModal } from "./util/modal.js";
import {
  extractHeadings,
  createHeadingTree,
  buildHierarchyPath,
} from "./util/headingUtils.js";

// --- State ---
let currentActiveHeading = null;
let headingElements = [];
let headingDataList = [];
let intersectionObserver = null;
const tocModalState = { isAnimating: false };

// Hàm mới: Chỉ cập nhật class active cho 1 mục cụ thể (không reset các mục khác)
function toggleHeadingActiveState(headingElement, isActive) {
  if (!elements.tocModalList) return;

  const link = elements.tocModalList.querySelector(
    `a[data-target-id="${headingElement.id}"]`,
  );

  if (link) {
    if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  }
}

function updateBreadcrumbState() {
  const firstActiveLink = elements.tocModalList?.querySelector("a.active");

  if (firstActiveLink) {
    const targetId = firstActiveLink.dataset.targetId;
    
    // [FIX] Chỉ tìm trong mảng heading đang hiển thị (bỏ qua view bị ẩn)
    const activeHeadingEl = headingElements.find(el => el.id === targetId);

    if (activeHeadingEl && currentActiveHeading !== activeHeadingEl) {
      currentActiveHeading = activeHeadingEl;
      updateBottomNavWithBreadcrumb(currentActiveHeading);

      if (!elements.tocModal.classList.contains("hidden")) {
        scrollToActiveItemInModal(firstActiveLink);
      }
    }
  }
}


// Hàm tìm heading đang active bằng mảng DOM thật, không dùng getElementById
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
// 1. LOGIC HIỂN THỊ CÂY (TỐI ƯU HÓA DOM)
// =============================================================================

function renderTreeHtml(nodes) {
  if (!nodes || nodes.length === 0) return null;

  // [TỐI ƯU] Tạo UL container trong bộ nhớ (chưa gắn vào DOM thật)
  const ul = document.createElement("ul");
  ul.className = "toc-level";

  // [TỐI ƯU] Sử dụng DocumentFragment để gom các thẻ LI trước khi append vào UL
  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    const li = document.createElement("li");

    // Tạo link
    const a = document.createElement("a");
    a.href = `#${node.id}`;
    // Class theo level (h1, h2, h3...) khớp với CSS
    a.className = `toc-link h${node.level}`;
    a.textContent = node.text;
    a.dataset.targetId = node.id;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      handleTocLinkClick(node.id);
    });

    li.appendChild(a);

    // Đệ quy cho children
    if (node.children && node.children.length > 0) {
      const childUl = renderTreeHtml(node.children);
      // Chỉ append nếu đệ quy trả về element hợp lệ
      if (childUl) {
        li.appendChild(childUl);
      }
    }

    fragment.appendChild(li);
  });

  // Gắn fragment vào UL (Thao tác này rất nhẹ vì UL chưa nằm trong Document)
  ul.appendChild(fragment);

  return ul;
}

// Tìm hàm này trong scripts/toc.js
function handleTocLinkClick(targetId) {
  if (window.innerWidth < 1024) {
    toggleTocModal();
  }

  // [FIX] Tìm phần tử trong mảng heading đang hiển thị, tránh dùng document.getElementById
  const targetElement = headingElements.find(el => el.id === targetId);
  
  if (targetElement) {
    const headerOffset = 160;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });

    setActiveHeading(targetElement, true);
  }
}

// =============================================================================
// 2. LOGIC BREADCRUMB
// =============================================================================

function getHeadingBreadcrumb(activeHeadingElement) {
  if (!activeHeadingElement || headingDataList.length === 0) return "";
  const currentHeadingObj = headingDataList.find(
    (item) => item.element === activeHeadingElement,
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

    // Tính toán Marquee
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
// 3. LOGIC TRẠNG THÁI (ACTIVE STATE)
// =============================================================================

function setActiveHeading(targetHeadingElement, shouldScrollModal = false) {
  if (currentActiveHeading === targetHeadingElement) return;

  if (currentActiveHeading) {
    const oldLink = elements.tocModalList?.querySelector(
      `a[data-target-id="${currentActiveHeading.id}"]`,
    );
    if (oldLink) oldLink.classList.remove("active");
  }

  currentActiveHeading = targetHeadingElement;

  if (currentActiveHeading) {
    const newLink = elements.tocModalList?.querySelector(
      `a[data-target-id="${currentActiveHeading.id}"]`,
    );
    if (newLink) {
      newLink.classList.add("active");
      if (
        shouldScrollModal &&
        !elements.tocModal.classList.contains("hidden")
      ) {
        scrollToActiveItemInModal(newLink);
      }
    }
  }

  updateBottomNavWithBreadcrumb(currentActiveHeading);
}

function scrollToActiveItemInModal(activeLink) {
  if (activeLink && elements.tocModalList) {
    // Sử dụng scrollIntoView với block center để luôn giữ mục active ở giữa
    activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// =============================================================================
// 4. KHỞI TẠO & CLEANUP (MAIN)
// =============================================================================

export function generateToc() {
  const tocListContainer = elements.tocModalList;
  const tocToggleBtn = elements.tocToggleBtn;
  
  // [LƯU TRẠNG THÁI] Nhớ ID cũ đang đọc trước khi người dùng ấn nút chuyển view
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

  setupIntersectionObserver();

  // [PHỤC HỒI TRẠNG THÁI] Delay 100ms đợi CSS hiển thị layout chuẩn
  setTimeout(() => {
    let targetHeading = null;

    // 1. Thử phục hồi lại ID cũ đã lưu
    if (previousActiveId) {
      targetHeading = headingElements.find(h => h.id === previousActiveId);
    }
    
    // 2. Nếu không tìm thấy, quét xem màn hình hiện tại đang hiển thị vị trí nào
    if (!targetHeading) {
      targetHeading = findCurrentActiveHeading();
    }

    // 3. Gắn class active và cuộn modal tới đúng điểm
    if (targetHeading) {
      setActiveHeading(targetHeading, true);
    } else {
      setActiveHeading(headingElements[0], false);
    }
  }, 100);

  return true;
}

function setupIntersectionObserver() {
  const options = {
    root: null,
    rootMargin: "-10% 0px -80% 0px", 
    threshold: 0, 
  };

  intersectionObserver = new IntersectionObserver(() => {
    // [FIX] Thay vì set true/false rời rạc, ta bắt nó tính lại thẻ nào chuẩn nhất đang được đọc
    const activeHeading = findCurrentActiveHeading();
    if (activeHeading) {
      setActiveHeading(activeHeading, false);
    }
  }, options);

  headingElements.forEach((heading) => intersectionObserver.observe(heading));
}

export function toggleTocModal() {
  // [FIX] Nếu là Desktop, không cho phép Toggle ẩn/hiện (Vì Sidebar luôn cố định)
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return;
  }

  if (!elements.tocModal) return;
  const wasHidden = toggleModal(elements.tocModal, tocModalState);

  if (wasHidden) {
    const container = elements.tocModalList;
    if (container) {
      // Reset animation state
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
    // --- CHUYỂN TỪ MOBILE -> DESKTOP ---

    // 1. Xóa class 'hidden' để đảm bảo Sidebar luôn hiện về mặt logic
    // (Dù CSS đã ép hiện, nhưng làm sạch class giúp JS hoạt động đúng sau này)
    if (elements.tocModal) {
      elements.tocModal.classList.remove("hidden");
    }

    // 2. QUAN TRỌNG: Mở khóa cuộn trang (Body Scroll)
    // Nếu lúc nãy đang mở Modal, body bị set overflow: hidden. Giờ phải gỡ ra.
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open"); // Nếu bạn có dùng class này
  } else {
    // --- CHUYỂN TỪ DESKTOP -> MOBILE ---

    // Khi thu nhỏ màn hình, Sidebar nên tự động ẩn đi (thành Modal đóng)
    // để tránh việc nội dung TOC che lấp toàn bộ màn hình nhỏ.
    if (elements.tocModal) {
      elements.tocModal.classList.add("hidden");
    }
  }
}
// [TỐI ƯU] Hàm dọn dẹp bộ nhớ công khai
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
  // [MỚI] Thêm Listener lắng nghe thay đổi kích thước màn hình
  const mediaQuery = window.matchMedia("(min-width: 1024px)");

  // Lắng nghe sự thay đổi (Safari/Chrome support modern addEventListener)
  try {
    mediaQuery.addEventListener("change", handleResizeState);
  } catch (e) {
    // Fallback cho trình duyệt cũ
    mediaQuery.addListener(handleResizeState);
  }

  // Chạy 1 lần lúc khởi tạo để set đúng trạng thái ban đầu
  handleResizeState();

  // Tự động dọn dẹp khi reload/đóng tab
  window.addEventListener("beforeunload", cleanupToc);

  document.addEventListener("keydown", (e) => {
    // [FIX] Nếu màn hình là Desktop (>= 1024px), không làm gì cả khi nhấn ESC
    if (window.innerWidth >= 1024) return;

    if (e.key === "Escape" && !elements.tocModal.classList.contains("hidden")) {
      toggleTocModal();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      // [FIX] Tương tự, disable phím tắt Ctrl+T bật/tắt trên Desktop vì nó luôn hiện
      if (window.innerWidth < 1024) {
        toggleTocModal();
      }
    }
  });
}
