**Vai trò:** Bạn là một Senior Frontend Engineer chuyên về tối ưu hóa hiệu suất (Web Performance Optimization) và kiến trúc ứng dụng JavaScript (Vanilla JS).

**Bối cảnh:**
Hiện tại, dự án đang gặp vấn đề nghiêm trọng về hiệu suất do file `scripts/build-html.js` thực hiện việc "hard-code" hàng nghìn thẻ `<span>` vào HTML tĩnh để highlight ngữ pháp. Điều này gây ra:

1. File HTML quá nặng (DOM Bloating).
2. Trình duyệt bị giật lag khi cuộn trang (Reflow/Repaint cost cao).
3. Quy trình Build chậm chạp.

**Nhiệm vụ:**
Hãy refactor lại toàn bộ quy trình highlight ngữ pháp. Chuyển từ **Build-time Rendering** sang **Runtime Rendering (Client-side)** sử dụng kỹ thuật "Lazy Hydration" hoặc "Virtualization" thông qua `IntersectionObserver`.

**Yêu cầu cụ thể từng bước:**

#### 1. Sửa đổi `scripts/build-html.js` (Server-side)

- **Mục tiêu:** Biến file này thành một trình tạo HTML thô nhẹ nhàng.
- **Hành động:**
- Xóa bỏ hoàn toàn hàm `loadWordData()`, `highlightWordsInHtml()`, và logic tạo `DYNAMIC_SEARCH_REGEX`.
- Xóa bỏ các dependencies không còn cần thiết cho file này (ví dụ: việc đọc các file JSON từ vựng).
- **Giữ nguyên:** Các logic xử lý Markdown cơ bản như: Audio button (`audiosrc:`), Images (`imgsrc:`), Parallel Translations, và Tables.
- Kết quả mong đợi: File HTML đầu ra chỉ chứa text thuần và các thẻ cấu trúc cơ bản (`p`, `h1`, `table`, `img`...), không còn chứa các thẻ `span` class `highlight-*`.

#### 2. Tạo mới `scripts/grammar-highlighter.js` (Client-side)

- **Mục tiêu:** Thực hiện highlight ngữ pháp ngay tại trình duyệt, nhưng chỉ highlight những gì người dùng đang nhìn thấy.
- **Logic cốt lõi:**
- **Data Fetching:** Viết hàm để fetch dữ liệu từ vựng (các file JSON trong thư mục `public/json`) một cách bất đồng bộ (`fetch`). Nên cache dữ liệu này vào biến toàn cục hoặc IndexedDB để không phải tải lại liên tục.
- **Regex Generation:** Chuyển logic tạo Regex từ `build-html.js` xuống client. Lưu ý: Chỉ tạo Regex **một lần** sau khi data đã load xong.
- **DOM Manipulation (Quan trọng):**
- Không được chạy highlight trên toàn bộ `#content` cùng một lúc (sẽ treo trình duyệt).
- Sử dụng **`IntersectionObserver`**: Chỉ khi một đoạn văn (`<p>`, `<td>`) đi vào viewport (màn hình hiển thị), mới tiến hành chạy Regex và thay thế `innerHTML` của đoạn văn đó.
- Khi đoạn văn ra khỏi màn hình, có thể cân nhắc giữ nguyên hoặc revert về text thô để giải phóng bộ nhớ (tùy chọn, ưu tiên giữ nguyên để trải nghiệm mượt mà khi cuộn lại).

- **Xử lý UI:** Đảm bảo sử dụng đúng các class CSS cũ (`highlight-sub`, `word-abbr`...) để giao diện không bị thay đổi.

#### 3. Cập nhật `scripts/main.js` hoặc `index.html`

- Import module `grammar-highlighter.js` mới tạo.
- Khởi chạy script này sau khi DOM đã load hoàn tất.

**Lưu ý quan trọng:**

- Dự án sử dụng Vanilla JS (ES Modules), không sử dụng React/Vue/Angular. Hãy viết code thuần tuân thủ tiêu chuẩn ES6+.
- Ưu tiên sử dụng `requestIdleCallback` nếu việc xử lý Regex quá nặng, để tránh chặn main thread.
- Đảm bảo xử lý trường hợp bất đồng bộ: HTML hiện ra trước -> Dữ liệu từ vựng load xong sau -> Mới bắt đầu highlight.

**Input Files:**
Sử dụng nội dung của các file `scripts/build-html.js`, `index.html` (đã cung cấp) làm cơ sở để chỉnh sửa.

