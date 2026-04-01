**Prompt Định dạng và Dịch Thuật File Markdown Chuẩn Hóa**

**Mục tiêu:**  
Thực hiện hai nhiệm vụ chính trên file Markdown đầu vào:  
1. **Định dạng lại:** Chuyển đổi file Markdown thành một cấu trúc rõ ràng, nhất quán, tối ưu hóa để hiển thị đẹp nhất khi được xử lý bởi hệ thống của người dùng (bao gồm `marked.js`, `contentLoader.js`, `textProcessor.js`, và `style.css`).  
2. **Dịch thuật:** Xác định các "câu gốc" (câu được viết bằng tiếng Đan Mạch và không nằm trong ngoặc đơn) trong nội dung và dịch chúng sang tiếng Ukraine, đảm bảo bản dịch chính xác, tự nhiên và phù hợp với ngữ cảnh.

Điều quan trọng nhất là đảm bảo mỗi đơn vị thông tin (câu gốc, bản dịch tiếng Ukraine) được hiển thị trên một hàng riêng biệt như một đoạn văn bản độc lập, tuân thủ tất cả các quy tắc định dạng được chỉ định, để đảm bảo khả năng tương thích với hệ thống render và giao diện người dùng.

**Ngữ cảnh hệ thống:**  
* Nội dung Markdown sẽ được render thành HTML bởi `marked.js`.  
* Thẻ `<p>` (đoạn văn) trong HTML kết xuất sẽ có `font-weight: bold;` theo `style.css`.  
* Văn bản trong dấu ngoặc đơn `()` sẽ được `textProcessor.js` tự động bọc trong thẻ `<span>` với class `parenthesized-text` (có nền và padding riêng).  
* Trình phát audio sẽ được tự động thêm vào đầu mỗi section bởi `contentLoader.js`.  
* Bảng sẽ được xử lý để thêm thuộc tính `data-label` cho responsive design.  

**File Markdown Đầu Vào:**  
Một file `.md` có thể chưa được định dạng nhất quán, chứa các câu bằng tiếng Đan Mạch, có hoặc không có bản dịch tiếng Ukraine, hoặc bản dịch hiện có không tuân thủ định dạng chuẩn. Nội dung có thể bao gồm tiêu đề, đoạn văn, danh sách, trích dẫn, bảng, liên kết, hình ảnh, hoặc mã nguồn.

**File Markdown Đầu Ra (Yêu cầu):**  
Một file `.md` đã được định dạng lại và bổ sung/chuẩn hóa dịch thuật. File đầu ra chỉ chứa nội dung Markdown đã xử lý, không bao gồm bất kỳ giải thích, lời thoại, hoặc bình luận nào ngoài nội dung cần thiết.

**Quy Tắc Dịch Thuật:**  

1. **Xác định "Câu Gốc":**  
   * "Câu gốc" là các câu hoàn chỉnh bằng tiếng Đan Mạch, không nằm trong dấu ngoặc đơn, và không phải là tiêu đề, mã nguồn, hoặc URL.  
   * Nếu một đoạn văn chứa nhiều câu, tách thành các câu riêng lẻ dựa trên dấu chấm câu (`.`, `?`, `!`), đảm bảo mỗi câu được xử lý độc lập.  
   * Ví dụ: `Dette er en sætning. Dette er en anden.` sẽ được tách thành hai câu gốc riêng biệt.

2. **Thực Hiện Dịch Thuật:**  
   * Dịch mỗi "câu gốc" sang tiếng Ukraine, đảm bảo bản dịch chính xác, tự nhiên, và giữ nguyên ý nghĩa cũng như ngữ điệu của câu gốc.  
   * Sử dụng ngôn ngữ Ukraine tiêu chuẩn, phù hợp với ngữ cảnh học thuật hoặc giao tiếp trang trọng, trừ khi câu gốc có phong cách cụ thể (ví dụ: thân mật, kỹ thuật).  

3. **Định Dạng Kết Quả Dịch Thuật:**  
   * Sau mỗi câu gốc, trình bày bản dịch tiếng Ukraine trong dấu ngoặc đơn: `(Ukrainian translation.)`.  
   * **QUAN TRỌNG:** Mỗi phần (câu gốc, bản dịch tiếng Ukraine) phải được ngăn cách bằng **một dòng trống hoàn toàn** trong file Markdown để đảm bảo mỗi phần hiển thị trên một hàng riêng biệt và nhận kiểu của thẻ `<p>` trong HTML.  
   * Ví dụ cấu trúc chuẩn:  
     ```markdown
     Dette er den originale sætning.

     (Це оригінальне речення.)
     ```  

4. **Xử Lý Bản Dịch Hiện Có:**  
   * Nếu file đầu vào đã có bản dịch tiếng Ukraine (thường trong ngoặc đơn ngay sau câu gốc), kiểm tra tính chính xác và định dạng:  
     * Nếu bản dịch đúng và tuân thủ định dạng (trong ngoặc đơn, trên dòng riêng biệt), giữ nguyên.  
     * Nếu bản dịch sai hoặc không tự nhiên, sửa lại cho chính xác và tự nhiên hơn.  
     * Nếu thiếu bản dịch tiếng Ukraine, bổ sung bản dịch đúng định dạng.  
     * Nếu bản dịch hiện có không tuân thủ định dạng chuẩn (ví dụ: cùng dòng với câu gốc hoặc bản dịch khác), tách ra thành dòng riêng biệt theo quy tắc ở mục 3.  

5. **Xử Lý Nội Dung Không Phải Câu Gốc:**  
   * Văn bản trong ngoặc đơn không phải bản dịch (ví dụ: ghi chú, giải thích) được giữ nguyên, không dịch, và đặt trên dòng riêng nếu cần để tuân thủ nguyên tắc "một câu trên một hàng".  
   * Các thành phần như tiêu đề, mã nguồn, URL, hoặc tiêu đề cột bảng mang tính danh mục/kỹ thuật không được dịch.

**Quy Tắc Định Dạng Chi Tiết (Áp dụng cho TOÀN BỘ nội dung, bao gồm cả các bản dịch mới tạo):**  

1. **Nguyên Tắc Cốt Lõi: "Một Câu/Đơn Vị Thông Tin Trên Một Hàng HTML Riêng Biệt"**  
   * Mỗi câu gốc và bản dịch tiếng Ukraine phải được đặt trên một dòng riêng, cách nhau bằng một dòng trống để render thành các thẻ `<p>` riêng biệt.  
   * Áp dụng cho tất cả các đoạn văn bản, bao gồm câu gốc và bản dịch.

2. **Tiêu Đề (Headings):**  
   * Sử dụng cú pháp Markdown tiêu chuẩn: `# H1`, `## H2`, `### H3`, v.v.  
   * Để một dòng trống trước và sau mỗi tiêu đề.  
   * **Không dịch tiêu đề.**

3. **Đoạn Văn Bản (Paragraphs):**  
   * Mỗi câu gốc và bản dịch tiếng Ukraine là một đoạn văn riêng, cách nhau bằng một dòng trống.  
   * Không thụt đầu dòng cho đoạn văn.

4. **Văn Bản Trong Dấu Ngoặc Đơn `()` (Không phải bản dịch):**  
   * Nếu văn bản trong ngoặc đơn không phải bản dịch tiếng Ukraine của câu gốc ngay trước nó, giữ nguyên và coi như ghi chú độc lập.  
   * Đặt trên dòng riêng nếu cần để tuân thủ nguyên tắc "một câu trên một hàng".  

5. **Danh Sách (Lists):**  
   * **Câu gốc** trong mỗi mục danh sách cần được dịch sang tiếng Ukraine.  
   * Cấu trúc ví dụ cho một mục danh sách:  
     ```markdown
     * Et listepunkt.

       (Пункт списку.)
     ```  
   * Mỗi mục danh sách (`<li>`) bắt đầu trên một dòng mới. Bản dịch tiếng Ukraine được thụt lề phù hợp (thường 2 khoảng trắng) để liên kết với mục danh sách.  
   * Để một dòng trống trước danh sách đầu tiên và sau danh sách cuối cùng.

6. **Trích Dẫn (Blockquotes):**  
   * **Câu gốc** trong trích dẫn cần được dịch sang tiếng Ukraine.  
   * Mỗi dòng (câu gốc, bản dịch tiếng Ukraine) trong trích dẫn bắt đầu bằng `> `.  
   * Sử dụng một dòng trống chỉ chứa `> ` (hoặc dòng trống hoàn toàn rồi tiếp tục với `> `) để ngăn cách giữa các câu/bản dịch trong khối trích dẫn.  
   * Ví dụ:  
     ```markdown
     > Dette er det originale citat.

     > (Це оригінальна цитата.)
     ```

7. **Nhấn Mạnh (Emphasis):**  
   * Giữ nguyên cú pháp Markdown: `**đậm**`, `*nghiêng*`.  

8. **Mã Nội Tuyến (Inline Code):**  
   * Giữ nguyên cú pháp `` `code` ``. **Không dịch.**

9. **Khối Mã Nguồn (Code Blocks):**  
   * Giữ nguyên cú pháp ``` ```. **Không dịch.**

10. **Đường Kẻ Ngang (Horizontal Rules):**  
    * Giữ nguyên `---`.

11. **Liên Kết (Links):**  
    * Giữ nguyên cú pháp `[text](URL)`. Chỉ dịch `text` nếu nó là một "câu gốc". **Không dịch URL.**

12. **Hình Ảnh (Images):**  
    * Giữ nguyên cú pháp `![alt text](URL)`. Chỉ dịch `alt text` nếu nó là một "câu gốc". **Không dịch URL.**

13. **Bảng (Tables):**  
    * Giữ nguyên cấu trúc Markdown của bảng.  
    * Dịch nội dung văn bản trong các ô (trừ tiêu đề cột mang tính danh mục/kỹ thuật) nếu chúng là "câu gốc".  
    * Đảm bảo căn chỉnh bảng nhất quán (sử dụng `|` và `-` đúng cách).

14. **Ký Tự Thoát (Escaping Characters):**  
    * Sử dụng `\` để thoát các ký tự đặc biệt của Markdown khi cần (ví dụ: `*`, `#`, `|`).  

15. **Whitespace và Tính Nhất Quán:**  
    * Tránh khoảng trắng thừa ở cuối dòng.  
    * Sử dụng thụt lề nhất quán (2 khoảng trắng cho danh sách con, bản dịch trong danh sách).  
    * Mã nguồn Markdown phải sạch sẽ, dễ đọc, và không có dòng trống dư thừa ngoài những dòng cần thiết theo quy tắc.

**Những điều cần TRÁNH:**  
* Sử dụng thẻ HTML trực tiếp (như `<br>`, `<p>`).  
* Thêm, xóa, hoặc thay đổi nội dung ngữ nghĩa của văn bản gốc ngoài việc dịch thuật sang tiếng Ukraine.  
* Dịch các yếu tố không được phép dịch (tiêu đề, mã nguồn, URL, tiêu đề cột bảng kỹ thuật).  
* Tạo các bản dịch không tự nhiên hoặc không phù hợp với ngữ cảnh.  
* Bỏ qua quy tắc dòng trống giữa câu gốc và bản dịch.

**Ví dụ Chuyển Đổi (Bao gồm Dịch thuật):**  

* **Đầu vào có thể có:**  
  ```markdown
  ## Et Afsnit
  Dette er den første sætning. Dette er den anden sætning. (Це друга пропозиція.)
  En tredje sætning uden oversættelse.
  * Et listepunkt.
  ```

* **Đầu ra đã định dạng và dịch (mong muốn):**  
  ```markdown
  ## Et Afsnit

  Dette er den første sætning.

  (Це перше речення.)

  Dette er den anden sætning.

  (Це друга пропозиція.)

  En tredje sætning uden oversættelse.

  (Третє речення без перекладу.)

  * Et listepunkt.

    (Пункт списку.)
  ```

**Quy trình xử lý:**  
Hãy xử lý file Markdown đầu vào theo các quy tắc trên, đảm bảo:  
* Tách và dịch từng câu gốc sang tiếng Ukraine.  
* Định dạng lại toàn bộ nội dung theo chuẩn Markdown.  
* Chỉ cung cấp nội dung Markdown đầu ra đã xử lý, không bao gồm giải thích hay bình luận.

**Lưu ý bổ sung:**  
* Nếu file đầu vào rỗng hoặc không được cung cấp, trả về một file Markdown trống.  
* Nếu gặp các câu gốc không rõ ràng hoặc khó dịch, sử dụng phán đoán tốt nhất để tạo bản dịch tự nhiên, phù hợp với ngữ cảnh.  
* Đảm bảo tính nhất quán trong cách sử dụng từ ngữ và cấu trúc câu trong bản dịch tiếng Ukraine.