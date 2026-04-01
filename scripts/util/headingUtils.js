// scripts/util/headingUtils.js

/**
 * Quét DOM để lấy danh sách phẳng (Flat List)
 * Giữ nguyên logic quét tuyến tính vì đây là bước thu thập dữ liệu thô.
 */
export function extractHeadings(containerElement, options = {}) {
  const config = {
    selectors: 'h1, h2, h3, h4, h5, h6', 
    idPrefix: 'toc-heading-',    
    ...options
  };

  if (!containerElement) return [];

  const nodes = containerElement.querySelectorAll(config.selectors);

  return Array.from(nodes).map((node, index) => {
    if (!node.id) {
      node.id = `${config.idPrefix}${index}`;
    }

    const level = parseInt(node.tagName.substring(1), 10);

    return {
      element: node,
      id: node.id,
      text: node.textContent.trim().replace(/\s+/g, ' '),
      level: level,
      index: index,
      children: [] // Chuẩn bị sẵn mảng con cho thuật toán Tree
    };
  });
}

/**
 * [THUẬT TOÁN VS CODE OUTLINE]
 * Chuyển đổi danh sách phẳng thành Cây phân cấp (Nested Tree)
 * Sử dụng thuật toán Ngăn xếp (Stack) để xử lý cha-con.
 */
export function createHeadingTree(flatHeadings) {
  if (!flatHeadings || flatHeadings.length === 0) return [];

  // Tạo một node gốc ảo (Root) để chứa tất cả heading cấp cao nhất
  const root = { level: 0, children: [] };
  
  // Stack luôn bắt đầu với Root
  // Stack dùng để theo dõi "Cha hiện tại" của cấp độ đang xét
  const stack = [root];

  flatHeadings.forEach(heading => {
    // Logic cốt lõi:
    // Tìm trong stack, loại bỏ các node có level >= level của heading hiện tại
    // Điều này có nghĩa là node hiện tại không thể là con của chúng.
    // Ví dụ: Đang ở H3 (stack top), gặp H2 -> H3 bị pop ra, H2 mới sẽ là con của H1 (đang nằm dưới H3 trong stack).
    while (stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    // Node ở đỉnh stack bây giờ chính là CHA TRỰC TIẾP của heading hiện tại
    // (Dù có nhảy cóc từ H1 -> H3, thì H1 vẫn sẽ nằm ở đỉnh stack)
    const parent = stack[stack.length - 1];
    
    // Thêm heading vào danh sách con của cha
    parent.children.push(heading);

    // Đẩy heading hiện tại vào stack, vì nó có thể là cha của các heading tiếp theo
    stack.push(heading);
  });

  return root.children; // Trả về danh sách cấp 1 (đã chứa lồng nhau bên trong)
}

/**
 * Thuật toán Backtracking (Breadcrumb) - Giữ nguyên
 */
export function buildHierarchyPath(currentHeadingObj, allHeadingsList) {
  if (!currentHeadingObj) return [];
  const path = [];
  path.unshift(currentHeadingObj.text);
  
  let currentLevel = currentHeadingObj.level;
  const currentIndex = currentHeadingObj.index;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevHeading = allHeadingsList[i];
    if (prevHeading.level < currentLevel) {
      path.unshift(prevHeading.text);
      currentLevel = prevHeading.level;
      if (currentLevel === 1) break;
    }
  }
  return path;
}