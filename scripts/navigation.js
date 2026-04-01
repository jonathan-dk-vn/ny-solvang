/**
 * scripts/navigation.js
 * IMPLEMENTATION: Lazy Rendering & Smart Deep Linking
 */
import { elements } from "./domElements.js";
import { restructuredNavData } from "./navigationData.generated.js";
import { toggleModal } from "./util/modal.js";
import debugLog from "./util/debug.js";

// --- State Quản lý Navigation ---
let navigationItems = []; // Danh sách các thẻ <a> để điều hướng bằng bàn phím
let currentPageHash = "";
const navModalState = { isAnimating: false };

const chevronIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
  </svg>
`;

// =============================================================================
// 1. HELPERS: Breadcrumb & Title
// =============================================================================

export function cleanHashForTitle(hash) {
  if (!hash) return "";
  try {
    let decoded = decodeURIComponent(hash);
    decoded = decoded
      .replace(/\+/g, " ")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const smallWords = new Set([
      "og",
      "i",
      "på",
      "til",
      "af",
      "med",
      "for",
      "and",
      "the",
      "of",
      "in",
      "on",
      "at",
      "to",
      "with",
      "ved",
      "om",
      "en",
      "et",
    ]);

    return decoded
      .split(" ")
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0 || !smallWords.has(lower)) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return lower;
      })
      .join(" ");
  } catch (error) {
    return hash.replace(/[-_]/g, " ");
  }
}

function findPathInData(nodes, targetHash, currentPath = []) {
  const decodedTarget = decodeURIComponent(targetHash);

  for (const node of nodes) {
    if (node.type === "link") {
      if (node.href === `#${decodedTarget}` || node.href === targetHash) {
        return [...currentPath, node];
      }
    } else if (node.categories || node.children) {
      const children = node.categories || node.children;
      const parentNode = { ...node, isContainer: true };

      const foundPath = findPathInData(children, targetHash, [
        ...currentPath,
        parentNode,
      ]);
      if (foundPath) return foundPath;
    }
  }
  return null;
}

function createBreadcrumb() {
  const breadcrumb = document.createElement("div");
  breadcrumb.className = "nav-breadcrumb";
  const currentHash = window.location.hash.slice(1);

  if (currentHash) {
    try {
      const decodedHash = decodeURIComponent(currentHash);
      const formattedPath = decodedHash.replace(/\//g, " > ");
      breadcrumb.innerHTML = `<span>${formattedPath}</span>`;
      breadcrumb.title = formattedPath;
    } catch (e) {
      breadcrumb.innerHTML = `<span>${currentHash}</span>`;
    }
  } else {
    breadcrumb.innerHTML = `<span>Home</span>`;
  }
  return breadcrumb;
}

function updateBreadcrumb() {
  const container = document.getElementById("nav-breadcrumb-container-modal");
  if (!container) {
    const fallback = document.getElementById("nav-breadcrumb-container");
    if (!fallback) return;
    fallback.innerHTML = "";
    fallback.appendChild(createBreadcrumb());
    return;
  }
  const newBreadcrumb = createBreadcrumb();
  container.innerHTML = "";
  container.appendChild(newBreadcrumb);
}

// =============================================================================
// 2. CORE: Lazy Rendering Logic
// =============================================================================

function refreshNavigationItems() {
  if (elements.navModalPlaceholder) {
    navigationItems = Array.from(
      elements.navModalPlaceholder.querySelectorAll(".nav-link"),
    );
    navigationItems.forEach((item, index) => (item.dataset.navIndex = index));
  }
}

function loadCategoryChildren(
  container,
  childrenData,
  closeMobileModalCallback,
) {
  if (container.dataset.loaded === "true") return;

  const fragment = document.createDocumentFragment();
  childrenData.forEach((child) => {
    fragment.appendChild(renderNavNode(child, closeMobileModalCallback));
  });

  container.appendChild(fragment);
  container.dataset.loaded = "true";
  refreshNavigationItems();
}

function renderNavNode(node, closeMobileModalCallback) {
  const li = document.createElement("li");

  if (node.type === "link") {
    li.className = "flex items-center justify-between";

    const aLink = document.createElement("a");
    aLink.href = node.href;
    aLink.textContent = node.text;
    aLink.className = "nav-link flex-grow";

    aLink.addEventListener("click", () => {
      if (window.location.hash !== node.href) {
        window.location.hash = node.href;
      }
      if (closeMobileModalCallback) setTimeout(closeMobileModalCallback, 150);
    });

    li.appendChild(aLink);
  } else if (node.type === "category" || node.categories) {
    li.dataset.type = "category";
    li.dataset.title = node.title;

    const h3 = document.createElement("h3");
    h3.className =
      node.type === "category" ? "nav-category-header" : "nav-module-header";

    const iconSpan = document.createElement("span");
    iconSpan.className = "category-toggle-icon";
    iconSpan.innerHTML = chevronIconSVG;

    const textSpan = document.createElement("span");
    textSpan.textContent = node.title;

    h3.appendChild(iconSpan);
    h3.appendChild(textSpan);
    li.appendChild(h3);

    const gridContainer = document.createElement("div");
    gridContainer.className = "nav-accordion-container";
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateRows = "0fr";
    gridContainer.style.overflow = "hidden";

    const contentWrapper = document.createElement("div");
    contentWrapper.style.minHeight = "0";

    const contentUl = document.createElement("ul");
    contentUl.className = "pl-2 mt-1 space-y-1";
    contentUl.dataset.loaded = "false";

    const childrenData = node.children || node.categories || [];

    contentWrapper.appendChild(contentUl);
    gridContainer.appendChild(contentWrapper);
    li.appendChild(gridContainer);

    h3.addEventListener("click", (event) => {
      event.stopPropagation();

      if (contentUl.dataset.loaded === "false") {
        loadCategoryChildren(contentUl, childrenData, closeMobileModalCallback);
      }

      const isOpening = gridContainer.style.gridTemplateRows === "0fr";
      smartCollapseSiblings(h3);

      requestAnimationFrame(() => {
        gridContainer.style.gridTemplateRows = isOpening ? "1fr" : "0fr";
        gridContainer.classList.toggle("expanded", isOpening);
        iconSpan.style.transform = isOpening ? "rotate(90deg)" : "rotate(0deg)";
        iconSpan.classList.toggle("expanded", isOpening);
      });
    });

    li._forceExpand = () => {
      if (contentUl.dataset.loaded === "false") {
        loadCategoryChildren(contentUl, childrenData, closeMobileModalCallback);
      }
      gridContainer.style.gridTemplateRows = "1fr";
      gridContainer.classList.add("expanded");
      iconSpan.style.transform = "rotate(90deg)";
      iconSpan.classList.add("expanded");
    };
  }

  return li;
}

function smartCollapseSiblings(clickedHeader) {
  const parentLi = clickedHeader.parentElement;
  const containerUl = parentLi.parentElement;

  if (!containerUl) return;

  const siblings = Array.from(containerUl.children).filter(
    (child) => child !== parentLi && child.dataset.type === "category",
  );

  siblings.forEach((sibling) => {
    const siblingContainer = sibling.querySelector(".nav-accordion-container");
    const siblingIcon = sibling.querySelector(".category-toggle-icon");

    if (siblingContainer && siblingContainer.classList.contains("expanded")) {
      siblingContainer.style.gridTemplateRows = "0fr";
      siblingContainer.classList.remove("expanded");
      if (siblingIcon) {
        siblingIcon.style.transform = "rotate(0deg)";
        siblingIcon.classList.remove("expanded");
      }
    }
  });
}

function collapseAllNavItems(navContainer) {
  if (!navContainer) return;
  const allAccordions = navContainer.querySelectorAll(
    ".nav-accordion-container",
  );
  const allIcons = navContainer.querySelectorAll(".category-toggle-icon");

  allAccordions.forEach((c) => {
    c.style.gridTemplateRows = "0fr";
    c.classList.remove("expanded");
  });
  allIcons.forEach((i) => {
    i.style.transform = "rotate(0deg)";
    i.classList.remove("expanded");
  });
}

// =============================================================================
// 3. MAIN RENDER FUNCTION
// =============================================================================

function generateNavigationHTML(placeholderElement, closeMobileModalCallback) {
  if (!placeholderElement) return;

  placeholderElement.innerHTML = "";
  navigationItems = [];

  const navElement = document.createElement("nav");
  const mainUl = document.createElement("ul");
  mainUl.className = "space-y-1";

  restructuredNavData.forEach((module) => {
    const liModule = renderNavNode(
      {
        type: "category",
        title: module.title,
        children: module.categories,
      },
      closeMobileModalCallback,
    );

    const header = liModule.querySelector("h3");
    if (header) header.className = "nav-module-header";

    mainUl.appendChild(liModule);
  });

  navElement.appendChild(mainUl);
  placeholderElement.appendChild(navElement);

  setTimeout(() => {
    expandToActiveHash(placeholderElement);
  }, 50);
}

// =============================================================================
// 4. DEEP LINKING & HIGHLIGHT (SMART)
// =============================================================================

function expandToActiveHash(navContainer) {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  let pathNodes = null;
  for (const module of restructuredNavData) {
    const path = findPathInData([module], hash, []);
    if (path) {
      pathNodes = path;
      break;
    }
  }

  if (!pathNodes) return;

  let currentContext = navContainer;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const nodeData = pathNodes[i];
    const allLis = Array.from(
      currentContext.querySelectorAll(`li[data-type='category']`),
    );
    const targetLi = allLis.find((li) => li.dataset.title === nodeData.title);

    if (targetLi) {
      if (targetLi._forceExpand) {
        targetLi._forceExpand();
      }
      const nextContainer = targetLi.querySelector(
        ".nav-accordion-container ul",
      );
      if (nextContainer) {
        currentContext = nextContainer;
      }
    } else {
      break;
    }
  }

  setTimeout(() => {
    highlightCurrentPage(navContainer, false);
  }, 50);
}

function highlightCurrentPage(navContainer, shouldExpand = true) {
  if (!navContainer) return;
  const hash = window.location.hash.slice(1);

  navContainer
    .querySelectorAll(".nav-link.current-page")
    .forEach((l) => l.classList.remove("current-page"));

  if (hash) {
    const link = navContainer.querySelector(`a[href="#${CSS.escape(hash)}"]`);
    if (link) {
      link.classList.add("current-page");

      if (shouldExpand) {
        let parent = link.parentElement;
        while (parent && parent !== navContainer) {
          if (parent.classList.contains("nav-accordion-container")) {
            parent.style.gridTemplateRows = "1fr";
            parent.classList.add("expanded");
            const li = parent.parentElement;
            const icon = li?.querySelector(".category-toggle-icon");
            if (icon) {
              icon.style.transform = "rotate(90deg)";
              icon.classList.add("expanded");
            }
          }
          parent = parent.parentElement;
        }
      }

      setTimeout(() => {
        scrollToLinkInModal(link, navContainer);
      }, 300);
    }
  }
}

function scrollToLinkInModal(linkElement, container) {
  const scrollParent = elements.navModalPlaceholder;
  if (!scrollParent || !linkElement) return;

  const linkRect = linkElement.getBoundingClientRect();
  const parentRect = scrollParent.getBoundingClientRect();
  const relativeTop = linkElement.offsetTop - scrollParent.offsetTop;

  scrollParent.scrollTo({
    top: relativeTop - parentRect.height / 2 + linkRect.height / 2,
    behavior: "smooth",
  });
}

// =============================================================================
// 5. INTERACTION: Keyboard & Modal
// =============================================================================

function navigateNavigationWithKeyboard(direction) {
  const visibleLinks = navigationItems.filter(
    (link) => link.offsetParent !== null,
  );

  if (visibleLinks.length === 0) return;

  let currentIndex = visibleLinks.findIndex((link) =>
    link.classList.contains("keyboard-selected"),
  );
  if (currentIndex === -1) currentIndex = direction > 0 ? -1 : 0;

  const nextIndex =
    (currentIndex + direction + visibleLinks.length) % visibleLinks.length;

  visibleLinks.forEach((l) => l.classList.remove("keyboard-selected"));

  const selected = visibleLinks[nextIndex];
  if (selected) {
    selected.classList.add("keyboard-selected");
    selected.focus();
    selected.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function toggleNavModal() {
  if (!elements.navModal) return;
  const isHidden = elements.navModal.classList.contains("hidden");

  if (isHidden) {
    if (elements.navModalPlaceholder) {
      expandToActiveHash(elements.navModalPlaceholder);
    }
  } else {
    navigationItems.forEach((l) => l.classList.remove("keyboard-selected"));
  }

  toggleModal(elements.navModal, navModalState);
}

function updateNavLabel() {
  const navTextEl = document.querySelector("#nav-label-container .nav-text");
  if (!navTextEl) return;

  const hash = window.location.hash.slice(1);
  const baseLabel = "Categories > ";

  if (!hash) {
    navTextEl.textContent = baseLabel;
    return;
  }

  try {
    const decodedHash = decodeURIComponent(hash);
    const formattedPath = decodedHash.replace(/\//g, " > ");
    navTextEl.textContent = baseLabel + formattedPath;
  } catch (e) {
    console.warn("Error parsing hash for nav label:", e);
    navTextEl.textContent = baseLabel;
  }
}

// =============================================================================
// 6. INITIALIZATION
// =============================================================================

export function initializeNavigation() {
  if (elements.navModalPlaceholder) {
    generateNavigationHTML(elements.navModalPlaceholder, toggleNavModal);
  }

  elements.navToggle?.addEventListener("click", toggleNavModal);
  elements.navModalCloseBtn?.addEventListener("click", toggleNavModal);
  elements.navModal?.addEventListener("click", (e) => {
    if (e.target === elements.navModal) toggleNavModal();
  });

  if (elements.bottomNavBar) {
    elements.bottomNavBar.addEventListener("click", (e) => {
      e.preventDefault();
      toggleNavModal();
    });
  }

  window.addEventListener("hashchange", () => {
    updateBreadcrumb();
    updateNavLabel();

    if (
      elements.navModalPlaceholder &&
      !elements.navModal.classList.contains("hidden")
    ) {
      highlightCurrentPage(elements.navModalPlaceholder, false);
    }
  });

  window.addEventListener("content-rendered", updateBreadcrumb);
  updateBreadcrumb();
  updateNavLabel();

  document.addEventListener("keydown", (e) => {
    if (!elements.navModal?.classList.contains("hidden")) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          navigateNavigationWithKeyboard(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          navigateNavigationWithKeyboard(1);
          break;
        case "Enter":
          const selected = document.querySelector(
            ".nav-link.keyboard-selected",
          );
          if (selected) {
            e.preventDefault();
            selected.click();
          }
          break;
        case "Escape":
          toggleNavModal();
          break;
      }
    }
  });
}
