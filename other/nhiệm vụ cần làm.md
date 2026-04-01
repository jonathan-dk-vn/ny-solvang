Hành động ngay: Viết lại grammarLegend.js để xử lý String thay vì DOM Node, hoặc dùng TreeWalker thay vì querySelectorAll + forEach. Đây là nguyên nhân chính gây lag lúc load trang.

CRITICAL ISSUES (Vấn đề nghiêm trọng)
A. Layout Thrashing trong grammarLegend.js
Đây là vấn đề hiệu năng lớn nhất trong code hiện tại.

Vị trí: formatStackedAbbreviations() được gọi ngay sau khi render HTML.

Phân tích: Bạn đang dùng vòng lặp forEach để duyệt qua wordSpans. Trong mỗi vòng lặp, bạn thực hiện:

Read: wordSpan.nextElementSibling (Truy cập DOM).

Write: document.createElement, insertBefore, appendChild (Ghi DOM).

Read/Write: sibling.remove() (Thay đổi cấu trúc DOM).

Hậu quả: Trình duyệt bị ép phải tính toán lại Layout (Reflow) liên tục cho mỗi cặp từ tìm thấy. Nếu bài học có 100 từ được highlight, trình duyệt sẽ Reflow 100 lần trong 1 khung hình (frame), gây block Main Thread và khiến giao diện bị "đơ" khi chuyển trang.


Khắc phục Layout Thrashing (Ưu tiên cao nhất)
Thay vì sửa DOM sau khi đã render, hãy xử lý chuỗi HTML trước khi gán vào innerHTML. Chuỗi xử lý (String manipulation) nhanh hơn DOM manipulation hàng nghìn lần.

Sửa file contentLoader.js và grammarLegend.js: