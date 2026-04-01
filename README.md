# Dự án Học Tiếng Đan Mạch và Tiếng Anh (Dansk-English)

Đây là một dự án web được thiết kế để hỗ trợ việc học tiếng Đan Mạch (Dansk) và tiếng Anh (English) thông qua một giao diện tập trung, có cấu trúc và dễ sử dụng. Dự án tổng hợp và hiển thị các tài liệu học tập từ nhiều nguồn khác nhau, giúp người dùng dễ dàng truy cập, tìm kiếm và luyện tập.

## Triết lý Thiết kế

Dự án được xây dựng dựa trên các nguyên tắc sau:

- **Tập trung vào Nội dung:** Giao diện được thiết kế tối giản để người dùng tập trung hoàn toàn vào nội dung bài học mà không bị phân tâm.
- **Hiệu năng Cao:** Sử dụng vanilla JavaScript (ES Modules) và các API gốc của trình duyệt để đảm bảo thời gian tải nhanh và trải nghiệm người dùng mượt mà.
- **Kiến trúc Module hóa:** Mã nguồn được chia thành các module nhỏ, mỗi module đảm nhiệm một chức năng cụ thể, giúp việc bảo trì và mở rộng trở nên dễ dàng.
- **Quản lý Trạng thái qua URL:** Trạng thái của ứng dụng (bài học nào đang được xem) được quản lý hoàn toàn qua URL hash (`#`). Điều này cho phép người dùng đánh dấu (bookmark) các bài học và chia sẻ liên kết một cách dễ dàng.

## Luồng Hoạt động Chi tiết

Khi người dùng tương tác với trang web, một chuỗi các sự kiện và xử lý sẽ diễn ra:

1.  **Khởi tạo:** Khi trang được tải, `main.js` sẽ được thực thi. Nó đóng vai trò là "nhạc trưởng", khởi tạo các module cần thiết.
2.  **Xây dựng Menu Điều hướng:** `navigation.js` đọc cấu trúc khóa học từ `navigationData.js` và tự động tạo ra menu điều hướng (sidebar), cho phép người dùng thấy toàn bộ cấu trúc của các tài liệu học.
3.  **Tương tác của Người dùng:** Người dùng nhấp vào một liên kết bài học trên menu. Hành động này sẽ thay đổi giá trị hash trong URL (ví dụ: `.../index.html#bog-dansk/bog-puls-1-1`).
4.  **Phát hiện Thay đổi:** Trình duyệt phát ra sự kiện `hashchange`, và `main.js` sẽ bắt được sự kiện này.
5.  **Tải Nội dung:** `contentLoader.js` được kích hoạt. Nó hiển thị một chỉ báo tải (spinner) thông qua `loading.js`, sau đó phân tích hash để xác định đường dẫn đến file Markdown tương ứng trong thư mục `public/gold-data/`.
6.  **Fetch và Render:** `contentLoader.js` sử dụng `fetch` API để tải nội dung file Markdown. Sau khi tải xong, nó chuyển đổi văn bản Markdown thành HTML và đưa vào vùng nội dung chính của trang.
7.  **Xử lý Hậu kỳ (Post-processing):**
    *   `toc.js` quét nội dung HTML vừa được render, tìm các thẻ tiêu đề (`<h2>`, `<h3>`, v.v.) và tạo ra một mục lục (Table of Contents) tương ứng cho bài học đó.
    *   `audioUtils.js` tìm kiếm các phần tử liên quan đến audio và gắn các trình điều khiển (play/pause) vào chúng.
    *   `textProcessor.js` thực hiện các biến đổi cuối cùng trên văn bản nếu cần.
8.  **Hoàn tất:** Chỉ báo tải (spinner) được ẩn đi. Nội dung bài học, mục lục và các điều khiển audio đã sẵn sàng để người dùng tương tác.

## Phân tích Kỹ thuật các File JavaScript (`scripts/`)

Kiến trúc của dự án dựa trên sự phối hợp của các module JavaScript sau:

- **`main.js` (Entry Point):**
  - Là file khởi đầu của ứng dụng.
  - Import và khởi tạo các module khác.
  - Thiết lập listener trung tâm cho sự kiện `window.addEventListener('hashchange', ...)`. Khi URL hash thay đổi, nó sẽ gọi `contentLoader` để tải nội dung mới. Đây là cơ chế cốt lõi của Single-Page Application (SPA) này.

- **`navigationData.js` (Dữ liệu Điều hướng):**
  - Không chứa logic, chỉ đơn thuần export một cấu trúc dữ liệu (thường là một mảng các object) định nghĩa toàn bộ hệ thống menu, bao gồm các cấp độ, sách, và từng bài học.

- **`navigation.js` (Xây dựng Giao diện Điều hướng):**
  - Sử dụng dữ liệu từ `navigationData.js` để tự động tạo ra cây menu HTML trong sidebar.
  - Tạo các thẻ `<a>` với các giá trị `href` trỏ đến hash tương ứng với mỗi bài học.

- **`contentLoader.js` (Trình tải Nội dung):**
  - Chức năng quan trọng nhất của ứng dụng.
  - Lắng nghe sự kiện `hashchange`.
  - Phân tích hash để xây dựng đường dẫn file Markdown (ví dụ: `#path/to/file` -> `public/gold-data/path/to/file.md`).
  - Gọi `loading.show()` trước khi fetch và `loading.hide()` sau khi render xong.
  - Sử dụng `fetch()` để lấy nội dung file, sau đó chuyển đổi Markdown sang HTML và cập nhật DOM.

- **`toc.js` (Mục lục Tự động):**
  - Được gọi sau khi nội dung mới được render.
  - Quét DOM trong vùng nội dung để tìm các thẻ tiêu đề (`h2`, `h3`, ...).
  - Dựa trên các tiêu đề tìm được, nó tạo ra một danh sách liên kết `<ul>` và hiển thị trong khu vực mục lục, giúp người dùng điều hướng nhanh trong một bài học dài.

- **`audioUtils.js` (Tiện ích Âm thanh):**
  - Quét nội dung được render để tìm các thẻ hoặc cú pháp đặc biệt dành cho audio.
  - Tự động gắn các trình điều khiển (nút play/pause) và logic xử lý sự kiện cho các file âm thanh được nhúng trong bài học.

- **`domElements.js` (Tham chiếu DOM):**
  - Một module tiện ích đơn giản, export các biến chứa tham chiếu đến các phần tử DOM quan trọng (ví dụ: `contentArea`, `tocContainer`, `navigationMenu`).
  - Giúp tránh việc lặp lại `document.getElementById()` và quản lý các phần tử DOM ở một nơi duy nhất.

- **`textProcessor.js` (Bộ xử lý Văn bản):**
  - Thực hiện các tác vụ xử lý bổ sung trên HTML sau khi đã được render. Ví dụ: tìm các từ vựng đặc biệt và bọc chúng trong thẻ `<span>` để thêm tooltip, hoặc định dạng lại các khối code.

- **`loading.js` (Quản lý Trạng thái Tải):**
  - Cung cấp hai hàm đơn giản: `show()` và `hide()` để điều khiển việc hiển thị hoặc ẩn một phần tử HTML (spinner/loading indicator), thông báo cho người dùng rằng nội dung đang được tải.

- **`textAreaManager.js` (Quản lý Vùng nhập liệu):**
  - Quản lý các phần tử `<textarea>`, có thể được dùng cho các bài tập thực hành.
  - Có thể bao gồm logic để lưu trữ nội dung người dùng nhập vào `localStorage`, giúp họ không mất bài làm khi tải lại trang.

- **`build-html.js` (Script Build-time):**
  - Đây là một script Node.js, được chạy trong môi trường phát triển (không chạy trên trình duyệt).
  - Chức năng của nó có thể là tự động quét thư mục `public/gold-data` để tạo ra file `navigationData.js`, giúp tự động cập nhật menu khi có bài học mới được thêm vào.

## Cài đặt và Chạy dự án

Để chạy dự án này trên máy tính của bạn, hãy làm theo các bước sau:

1.  **Clone repository về máy:**
    ```bash
    git clone https://github.com/your-username/dansk-english.git
    cd dansk-english
    ```

2.  **Cài đặt các dependencies:**
    ```bash
    npm install
    ```

3.  **Chạy development server:**
    Lệnh này sẽ khởi động một server local và tự động mở trang web trên trình duyệt của bạn.
    ```bash
    npm run dev
    ```

## Đóng góp

Chúng tôi luôn hoan nghênh các đóng góp để cải thiện dự án. Nếu bạn có ý tưởng hoặc muốn sửa lỗi, vui lòng thực hiện theo quy trình sau:

1.  **Fork** dự án.
2.  Tạo một **branch** mới cho tính năng của bạn (`git checkout -b feature/AmazingFeature`).
3.  **Commit** các thay đổi của bạn (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** lên branch (`git push origin feature/AmazingFeature`).
5.  Mở một **Pull Request**.

## Bản quyền

Thông tin bản quyền sẽ được cập nhật trong tương lai.