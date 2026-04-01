
**Prompt Định dạng và Dịch Thuật File Markdown Chuẩn Hóa**

**Mục tiêu:**
Thực hiện hai nhiệm vụ chính trên file Markdown đầu vào:
1.  **Định dạng lại:** Chuyển đổi file Markdown thành một cấu trúc rõ ràng, nhất quán, tối ưu hóa để hiển thị đẹp nhất khi được xử lý bởi hệ thống của người dùng (bao gồm `marked.js`, `contentLoader.js`, `textProcessor.js`, và `style.css`).
2.  **Dịch thuật:** Xác định các "câu gốc" (Câu được viết bằng tiếng Việt hoặc ngôn ngữ chính không phải tiếng Anh/Đan Mạch và không nằm trong ngoặc đơn) trong nội dung và dịch chúng sang tiếng Anh và tiếng Đan Mạch.

Điều quan trọng nhất là đảm bảo mỗi đơn vị thông tin (câu gốc, bản dịch tiếng Anh, bản dịch tiếng Đan Mạch) được hiển thị trên một hàng riêng biệt như một đoạn văn bản độc lập và tuân thủ tất cả các quy tắc định dạng được chỉ định.

**Ngữ cảnh hệ thống (Không thay đổi):**
* Nội dung Markdown sẽ được render thành HTML.
* Thẻ `<p>` (đoạn văn) trong HTML kết xuất sẽ có `font-weight: bold;` theo `style.css`.
* Văn bản trong dấu ngoặc đơn `()` sẽ được `textProcessor.js` tự động bọc trong thẻ `<span>` với class `parenthesized-text` (có nền và padding riêng).
* Trình phát audio sẽ được tự động thêm vào đầu mỗi section bởi `contentLoader.js`.
* Bảng sẽ được xử lý để thêm thuộc tính `data-label` cho responsive design.

**File Markdown Đầu Vào:**
Một file `.md` có thể chưa được định dạng nhất quán. Một số câu gốc có thể chưa có bản dịch tiếng Anh hoặc tiếng Việt, hoặc có nhưng không theo chuẩn.

**File Markdown Đầu Ra (Yêu cầu):**
Một file `.md` đã được định dạng lại và bổ sung/chuẩn hóa dịch thuật. File đầu ra chỉ chứa nội dung Markdown đã xử lý. Không thêm bất kỳ giải thích hay lời thoại nào.

**Quy Tắc Dịch Thuật:**

1.  **Xác định "Câu Gốc":**
    * Là từng câu một. Bạn cần phải dịch từng câu gốc một. Nếu là 1 đoạn văn. Tách đoạn văn thành những câu riêng lẻ, được xuống dòng sau mỗi dấu chấm câu như ".", "?", "!",...

2.  **Thực Hiện Dịch Thuật:**
    * Dịch mỗi "câu gốc" đã xác định sang **tiếng Anh**.
    * Dịch mỗi "câu gốc" đã xác định sang **tiếng Đan Mạch**.

3.  **Định Dạng Kết Quả Dịch Thuật:**
    * Sau mỗi câu gốc, trình bày bản dịch tiếng Anh, tiếp theo là bản dịch tiếng Việt.
    * Bản dịch tiếng Anh phải được đặt trong dấu ngoặc đơn: `(English translation.)`
    * Bản dịch tiếng Đan Mạch phải được đặt trong dấu ngoặc đơn: `(Danish translation.)`
    * **QUAN TRỌNG:** Mỗi phần (Câu gốc, Bản dịch tiếng Anh, Bản dịch tiếng Việt) phải được ngăn cách nhau bằng **một dòng trống hoàn toàn** trong file Markdown để đảm bảo mỗi phần hiển thị trên một hàng riêng và nhận kiểu của thẻ `<p>`.
    * Ví dụ cấu trúc chuẩn:
        ```markdown
        Đây là câu gốc cần dịch.

        (This is the English translation of the original sentence.)

        (Dette er en dansk oversættelse af den originale sætning.)
        ```

4.  **Xử Lý Bản Dịch Hiện Có:**
    * Nếu file Markdown đầu vào đã có sẵn bản dịch tiếng Anh hoặc/và tiếng Đan Mạch cho một câu gốc (thường nằm trong dấu ngoặc đơn ngay sau câu gốc), hãy:
        * **Kiểm tra và đảm bảo** chúng tuân thủ đúng định dạng yêu cầu (trong ngoặc đơn, mỗi bản dịch trên một dòng riêng cách nhau bằng dòng trống).
        * Nếu một trong hai bản dịch (Anh hoặc Đan Mạch) bị thiếu, hãy **bổ sung bản dịch còn thiếu**.
        * Nếu cả hai đã có và đúng định dạng, giữ nguyên nhưng đảm bảo chúng tuân thủ quy tắc dòng trống.
        * Nếu cấu trúc hiện tại khác (ví dụ: `Câu gốc (English) (Danish)` trên cùng một dòng), hãy **tách chúng ra** theo định dạng chuẩn ở mục 3.

**Quy Tắc Định Dạng Chi Tiết (Áp dụng cho TOÀN BỘ nội dung, bao gồm cả các bản dịch mới tạo):**

1.  **Nguyên Tắc Cốt Lõi: "Một Câu/Đơn Vị Thông Tin Trên Một Hàng HTML Riêng Biệt"**
    * Đã được mô tả chi tiết trong Quy Tắc Dịch Thuật mục 3. Áp dụng cho tất cả các đoạn văn bản, bao gồm câu gốc và các bản dịch của nó.

2.  **Tiêu Đề (Headings H1-H6):**
    * Sử dụng cú pháp Markdown tiêu chuẩn: `# H1`, `## H2`, `### H3`, v.v.
    * Để một dòng trống trước và sau mỗi tiêu đề.
    * **Không dịch tiêu đề.**

3.  **Đoạn Văn Bản (Paragraphs):**
    * Tuân thủ "Nguyên Tắc Cốt Lõi" cho mỗi câu hoặc cụm từ (bao gồm các bản dịch).
    * Không thụt đầu dòng.

4.  **Văn Bản Trong Dấu Ngoặc Đơn `()` (Không phải bản dịch mới tạo):**
    * Nếu văn bản trong dấu ngoặc đơn trong file gốc không phải là bản dịch Anh/Việt của câu gốc ngay trước nó, hãy coi nó như một ghi chú độc lập và giữ nguyên. Áp dụng quy tắc "một câu trên một hàng" nếu nó cần đứng riêng.
    * Hệ thống sẽ tự động áp dụng kiểu `parenthesized-text` cho tất cả văn bản trong `()`.

5.  **Danh Sách (Lists):**
    * **Câu gốc** trong mỗi mục danh sách cần được dịch theo quy tắc dịch thuật.
    * Cấu trúc ví dụ cho một mục danh sách:
        ```markdown
        1.  Nội dung gốc của mục danh sách.

            (English translation of the list item's content.)

            (Dette er en dansk oversættelse af den originale sætning.)

        ```
    * Mỗi mục danh sách (`<li>`) trên một dòng mới. Các bản dịch và nội dung khác của cùng một mục được thụt lề phù hợp.
    * Để một dòng trống trước danh sách đầu tiên và sau danh sách cuối cùng.

6.  **Trích Dẫn (Blockquotes):**
    * **Câu gốc** trong trích dẫn cần được dịch theo quy tắc dịch thuật.
    * Mỗi dòng (câu gốc, dịch Anh, dịch Việt) trong trích dẫn phải bắt đầu bằng `> `.
    * Sử dụng một dòng trống chỉ chứa `> ` (hoặc hoàn toàn trống rồi dòng tiếp theo lại `> `) để ngăn cách giữa các câu/bản dịch này bên trong khối trích dẫn.
    * Ví dụ:
        ```markdown
        > Đây là câu trích dẫn gốc.
        >
        > (English translation of the quote.)
        >
        > (Dette er en dansk oversættelse af den originale sætning.)
        ```

7.  **Nhấn Mạnh (Emphasis):** `**đậm**`, `*nghiêng*`. Giữ nguyên.
8.  **Mã Nội Tuyến (Inline Code):** `` `code` ``. Giữ nguyên. **Không dịch.**
9.  **Khối Mã Nguồn (Code Blocks):** ``` ```. Giữ nguyên. **Không dịch.**
10. **Đường Kẻ Ngang (Horizontal Rules):** `---`. Giữ nguyên.
11. **Liên Kết (Links):** `[text](URL)`. Giữ nguyên văn bản hiển thị trừ khi nó rõ ràng là một "câu gốc" cần dịch. **Không dịch URL.**
12. **Hình Ảnh (Images):** `![alt text](URL)`. Dịch `alt text` nếu nó là một "câu gốc". **Không dịch URL.**
13. **Bảng (Tables):** Giữ nguyên cấu trúc Markdown. Dịch nội dung văn bản trong các ô (trừ tiêu đề cột nếu chúng mang tính danh mục/kỹ thuật) nếu chúng là "câu gốc".
14. **Ký Tự Thoát (Escaping Characters):** Sử dụng `\` khi cần.

15. **Whitespace và Tính nhất quán:**
    * Tránh các khoảng trắng thừa ở cuối dòng.
    * Sử dụng thụt lề nhất quán.
    * Mã nguồn Markdown phải sạch sẽ, dễ đọc.

**Những điều cần TRÁNH:**
* Sử dụng thẻ HTML trực tiếp (như `<br>`).
* Xóa hoặc thay đổi nội dung ngữ nghĩa của văn bản gốc ngoài việc dịch thuật.
* Dịch các yếu tố đã được chỉ định là không dịch (tiêu đề, code, URL).



Đây là file Markdown đầu vào: 
