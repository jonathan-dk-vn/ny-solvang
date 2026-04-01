**Prompt Định dạng và Dịch Thuật File Markdown Chuẩn Hóa (Tiếng Anh sang Tiếng Việt)**

**Mục tiêu:**
Thực hiện hai nhiệm vụ chính trên file Markdown đầu vào (văn bản gốc chủ yếu bằng tiếng Anh):
1.  **Định dạng lại:** Chuyển đổi file Markdown thành một cấu trúc rõ ràng, nhất quán, tối ưu hóa để hiển thị đẹp nhất khi được xử lý bởi hệ thống của người dùng (bao gồm `marked.js`, `contentLoader.js`, `textProcessor.js`, và `style.css`).
2.  **Dịch thuật:** Xác định các "câu gốc" (là văn bản tiếng Anh không nằm trong ngoặc đơn) trong nội dung và dịch chúng sang tiếng Việt. **Quan trọng: Bản dịch tiếng Việt phải là văn bản thuần túy, không chứa bất kỳ ký tự định dạng Markdown nào.**

Điều quan trọng nhất là đảm bảo mỗi đơn vị thông tin (câu gốc tiếng Anh, bản dịch tiếng Việt) được hiển thị trên một hàng riêng biệt như một đoạn văn bản độc lập và tuân thủ tất cả các quy tắc định dạng được chỉ định.

**Ngữ cảnh hệ thống (Không thay đổi):**
* Nội dung Markdown sẽ được render thành HTML.
* Thẻ `<p>` (đoạn văn) trong HTML kết xuất sẽ có `font-weight: bold;` theo `style.css`.
* Văn bản trong dấu ngoặc đơn `()` (ngoại trừ các bản dịch tiếng Việt được tạo theo quy tắc dưới đây) sẽ được `textProcessor.js` tự động bọc trong thẻ `<span>` với class `parenthesized-text` (có nền và padding riêng).
* Trình phát audio sẽ được tự động thêm vào đầu mỗi section bởi `contentLoader.js`.
* Bảng sẽ được xử lý để thêm thuộc tính `data-label` cho responsive design.

**File Markdown Đầu Vào:**
Một file `.md` có văn bản gốc chủ yếu bằng tiếng Anh, có thể chưa được định dạng nhất quán. Một số câu gốc có thể chưa có bản dịch tiếng Việt, hoặc có nhưng không theo chuẩn.

**File Markdown Đầu Ra (Yêu cầu):**
Một file `.md` đã được định dạng lại và bổ sung/chuẩn hóa dịch thuật sang tiếng Việt. File đầu ra chỉ chứa nội dung Markdown đã xử lý. Không thêm bất kỳ giải thích hay lời thoại nào.

**Quy Tắc Dịch Thuật:**

1.  **Xác định "Câu Gốc":**
    * Là từng câu một bằng tiếng Anh, không nằm trong dấu ngoặc đơn trong file Markdown gốc.
    * Bạn cần phải dịch từng câu gốc một. Nếu là một đoạn văn tiếng Anh, hãy tách đoạn văn thành những câu riêng lẻ (thường được phân cách bởi dấu chấm câu như ".", "?", "!", v.v.) và xử lý mỗi câu như một "câu gốc".

2.  **Thực Hiện Dịch Thuật:**
    * Dịch mỗi "câu gốc" (tiếng Anh) đã xác định sang **tiếng Việt**.
    * **YÊU CẦU CỐT LÕI:** Bản dịch tiếng Việt phải là **văn bản thuần túy (plain text)**. Tuyệt đối không được chứa bất kỳ ký tự hay cú pháp định dạng Markdown nào (ví dụ: không dùng `*`, `_`, `` ` ``, `**`, `[]()`, `#`, `- ` cho danh sách trong bản dịch, v.v.). Nếu câu gốc tiếng Anh có chứa định dạng Markdown, định dạng đó KHÔNG được chuyển sang bản dịch tiếng Việt.

3.  **Định Dạng Kết Quả Dịch Thuật:**
    * Sau mỗi câu gốc tiếng Anh, trình bày bản dịch tiếng Việt.
    * Bản dịch tiếng Việt phải được đặt trong dấu ngoặc đơn: `(Bản dịch tiếng Việt thuần túy.)`
    * **QUAN TRỌNG:** Mỗi phần (Câu gốc tiếng Anh, Bản dịch tiếng Việt) phải được ngăn cách nhau bằng **một dòng trống hoàn toàn** trong file Markdown để đảm bảo mỗi phần hiển thị trên một hàng riêng và nhận kiểu của thẻ `<p>`.
    * Ví dụ cấu trúc chuẩn:
        ```markdown
        This is the original English sentence, which might contain *Markdown*.

        (Đây là bản dịch tiếng Việt thuần túy của câu gốc không chứa markdown)
        ```

4.  **Xử Lý Bản Dịch Tiếng Việt Hiện Có:**
    * Nếu file Markdown đầu vào đã có sẵn bản dịch tiếng Việt cho một câu gốc (thường nằm trong dấu ngoặc đơn ngay sau câu gốc), hãy:
        * **Kiểm tra và đảm bảo** nó tuân thủ đúng định dạng yêu cầu (trong ngoặc đơn, là văn bản thuần túy, và trên một dòng riêng cách câu gốc bằng dòng trống).
        * Nếu bản dịch hiện có chứa Markdown, hãy **loại bỏ Markdown** đó.
        * Nếu cấu trúc hiện tại khác (ví dụ: `English sentence (Bản dịch Việt)` trên cùng một dòng), hãy **tách chúng ra** theo định dạng chuẩn ở mục 3.
    * Nếu file đầu vào có chứa bản dịch tiếng Anh (ví dụ từ một quy trình cũ), chúng nên được loại bỏ hoặc bỏ qua, vì tiếng Anh giờ là ngôn ngữ gốc.

**Quy Tắc Định Dạng Chi Tiết (Áp dụng cho TOÀN BỘ nội dung, bao gồm cả các bản dịch mới tạo):**

1.  **Nguyên Tắc Cốt Lõi: "Một Câu/Đơn Vị Thông Tin Trên Một Hàng HTML Riêng Biệt"**
    * Đã được mô tả chi tiết trong Quy Tắc Dịch Thuật mục 3. Áp dụng cho tất cả các đoạn văn bản, bao gồm câu gốc tiếng Anh và bản dịch tiếng Việt của nó.

2.  **Tiêu Đề (Headings H1-H6):**
    * Sử dụng cú pháp Markdown tiêu chuẩn: `# H1`, `## H2`, `### H3`, v.v.
    * Để một dòng trống trước và sau mỗi tiêu đề.
    * **Không dịch tiêu đề.**

3.  **Đoạn Văn Bản (Paragraphs):**
    * Tuân thủ "Nguyên Tắc Cốt Lõi" cho mỗi câu gốc tiếng Anh và bản dịch tiếng Việt của nó.
    * Không thụt đầu dòng.

4.  **Văn Bản Trong Dấu Ngoặc Đơn `()` (Không phải bản dịch tiếng Việt mới được tạo):**
    * Nếu văn bản trong dấu ngoặc đơn trong file gốc tiếng Anh không phải là bản dịch tiếng Việt của câu gốc tiếng Anh ngay trước nó (ví dụ: một ghi chú bằng tiếng Anh trong ngoặc đơn), hãy coi nó như một ghi chú độc lập và **giữ nguyên định dạng Markdown gốc của nó (nếu có)**. Áp dụng quy tắc "một câu trên một hàng" nếu nó cần đứng riêng.
    * Ví dụ: `Original English sentence (this is an English note in parentheses).` sẽ được giữ nguyên nếu "this is an English note in parentheses" không phải là bản dịch.

5.  **Danh Sách (Lists):**
    * **Câu gốc tiếng Anh** trong mỗi mục danh sách cần được dịch sang tiếng Việt (thuần túy) theo quy tắc dịch thuật.
    * Cấu trúc ví dụ cho một mục danh sách:
        ```markdown
        1.  Original *English* content of the list item.

            (Bản dịch tiếng Việt thuần túy của nội dung mục danh sách)
        ```
    * Mỗi mục danh sách (`<li>`) trên một dòng mới. Bản dịch tiếng Việt của cùng một mục được thụt lề phù hợp dưới câu gốc tiếng Anh của mục đó.
    * Để một dòng trống trước danh sách đầu tiên và sau danh sách cuối cùng.

6.  **Trích Dẫn (Blockquotes):**
    * **Câu gốc tiếng Anh** trong trích dẫn cần được dịch sang tiếng Việt (thuần túy) theo quy tắc dịch thuật.
    * Câu gốc tiếng Anh trong trích dẫn giữ nguyên Markdown gốc. Dòng bản dịch tiếng Việt chỉ chứa text thuần.
    * Mỗi dòng (câu gốc tiếng Anh, dịch Việt) trong trích dẫn phải bắt đầu bằng `> `.
    * Sử dụng một dòng trống chỉ chứa `> ` (hoặc hoàn toàn trống rồi dòng tiếp theo lại `> `) để ngăn cách giữa câu gốc và bản dịch của nó bên trong khối trích dẫn.
    * Ví dụ:
        ```markdown
        > This is the *original* English quote.
        >
        > (Đây là bản dịch tiếng Việt thuần túy của câu trích dẫn)
        ```

7.  **Nhấn Mạnh (Emphasis):** `**bold**`, `*italic*` trong văn bản gốc tiếng Anh. Giữ nguyên trong phần tiếng Anh. **Không đưa vào bản dịch tiếng Việt.**
8.  **Mã Nội Tuyến (Inline Code):** `` `code` `` trong văn bản gốc tiếng Anh. Giữ nguyên trong phần tiếng Anh. **Không đưa vào bản dịch tiếng Việt. Không dịch nội dung mã.**
9.  **Khối Mã Nguồn (Code Blocks):** ``` ```. Giữ nguyên. **Không dịch nội dung khối mã.**
10. **Đường Kẻ Ngang (Horizontal Rules):** `---`. Giữ nguyên.
11. **Liên Kết (Links):** `[text](URL)`.
    * Đối với `text` (văn bản hiển thị của liên kết) bằng tiếng Anh: Giữ nguyên `text` và định dạng liên kết trong phần tiếng Anh. Nếu `text` là một "câu gốc" hoàn chỉnh cần dịch, hãy dịch nó sang tiếng Việt (thuần túy) và đặt bản dịch này theo quy tắc chung (trong ngoặc đơn, dòng riêng). Tuy nhiên, thông thường `text` của link không phải là một câu hoàn chỉnh, nếu nó là một cụm từ hoặc danh từ, không cần dịch trừ khi có yêu cầu đặc biệt cho từng trường hợp. Mặc định là giữ nguyên `text` của link.
    * **Không dịch URL.**
12. **Hình Ảnh (Images):** `![alt text](URL)`.
    * Đối với `alt text` (văn bản thay thế) bằng tiếng Anh: Nếu `alt text` là một "câu gốc" hoàn chỉnh, hãy dịch nó sang tiếng Việt (thuần túy) và đặt bản dịch này theo quy tắc (trong ngoặc đơn, dòng riêng, bên dưới dòng chứa image). Giữ nguyên `alt text` gốc trong cú pháp `![]()`.
    * **Không dịch URL.**
13. **Bảng (Tables):** Giữ nguyên cấu trúc Markdown của bảng. Dịch nội dung văn bản tiếng Anh trong các ô sang tiếng Việt (thuần túy) nếu chúng là "câu gốc". Tiêu đề cột tiếng Anh (nếu mang tính danh mục/kỹ thuật) thì không dịch. Mỗi ô chứa câu gốc tiếng Anh sẽ có bản dịch tiếng Việt (thuần túy, trong ngoặc đơn) ngay bên dưới nội dung tiếng Anh trong cùng ô đó, hoặc tuân theo cấu trúc dòng riêng nếu khả thi trong Markdown table (điều này có thể khó, cần xem xét kỹ định dạng bảng). Nếu không thể đặt dòng riêng trong ô, thì đặt bản dịch ngay sau trong cùng ô: `English Cell Content (Nội dung tiếng Việt thuần túy)`. *Ưu tiên định dạng một câu/đơn vị trên một dòng nếu trình render Markdown hỗ trợ ngắt dòng trong ô bảng.*

14. **Ký Tự Thoát (Escaping Characters):** Sử dụng `\` khi cần trong phần văn bản tiếng Anh. Bản dịch tiếng Việt là thuần túy nên thường không cần.

15. **Whitespace và Tính nhất quán:**
    * Tránh các khoảng trắng thừa ở cuối dòng.
    * Sử dụng thụt lề nhất quán cho các mục danh sách và bản dịch của chúng.
    * Mã nguồn Markdown phải sạch sẽ, dễ đọc.

**Những điều cần TRÁNH:**
* Sử dụng thẻ HTML trực tiếp (như `<br>`).
* Xóa hoặc thay đổi nội dung ngữ nghĩa của văn bản gốc tiếng Anh ngoài việc dịch thuật sang tiếng Việt.
* **Chèn bất kỳ loại Markdown nào vào trong nội dung bản dịch tiếng Việt.**
* Dịch các yếu tố đã được chỉ định là không dịch (tiêu đề, code, URL, một số loại `alt text` hoặc `link text` nhất định).

**Ví dụ Chuyển Đổi (Bao gồm Dịch thuật Anh sang Việt thuần túy):**

* **Đầu vào có thể có (tiếng Anh):**
    ```markdown
    ## An Important Section

    This is the *first* English sentence. This `sentence` also has inline code.
    Another sentence for translation (this is just an English note).

    - A list item that is *emphasized*.
    - Click [here](file.html) for more.
    ```

* **Đầu ra đã định dạng và dịch (mong muốn):**
    ```markdown
    ## An Important Section

    This is the *first* English sentence.

    (Đây là câu tiếng Anh đầu tiên)

    This `sentence` also has inline code.

    (Câu này cũng có mã nội tuyến)

    Another sentence for translation (this is just an English note).

    (Một câu khác để dịch thuật)

    - A list item that is *emphasized*.

      (Một mục danh sách được nhấn mạnh)

    - Click [here](file.html) for more.

      (Nhấn vào đây để biết thêm)
    ```