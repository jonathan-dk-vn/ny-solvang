**Prompt for Formatting and Translating Markdown File (Vietnamese to English)**

**Objective:**  
Perform two main tasks on the input Markdown file (original content primarily in Vietnamese):  
1. **Reformat:** Transform the Markdown file into a clear, consistent structure optimized for rendering by the user's system (including `marked.js`, `contentLoader.js`, `textProcessor.js`, and `style.css`).  
2. **Translate:** Identify "original sentences" (Vietnamese text not within parentheses) in the content and translate them into English. **Critical: The English translation must be plain text, containing no Markdown formatting.**

The most important requirement is to ensure each information unit (original Vietnamese sentence, English translation) is displayed on a separate line as an independent text block and adheres to all specified formatting rules.

**System Context (Unchanged):**  
* The Markdown content will be rendered into HTML.  
* HTML `<p>` (paragraph) tags in the output will have `font-weight: bold;` per `style.css`.  
* Text within parentheses `()` (except for English translations created per the rules below) will be automatically wrapped by `textProcessor.js` in a `<span>` tag with the class `parenthesized-text` (with distinct background and padding).  
* An audio player will be automatically added at the start of each section by `contentLoader.js`.  
* Tables will be processed to include a `data-label` attribute for responsive design.

**Input Markdown File:**  
A `.md` file with content primarily in Vietnamese, potentially with inconsistent formatting. Some original sentences may lack English translations or have translations that do not meet the standard.

**Output Markdown File (Requirements):**  
A `.md` file that has been reformatted and supplemented/standardized with English translations. The output file contains only the processed Markdown content. Do not include any explanations or additional commentary.

**Translation Rules:**

1. **Identify "Original Sentence":**  
   * An original sentence is a single sentence in Vietnamese, not within parentheses in the original Markdown file.  
   * Translate each original sentence individually. If a Vietnamese paragraph contains multiple sentences (typically separated by punctuation such as ".", "?", "!", etc.), split the paragraph into individual sentences and treat each as an "original sentence."

2. **Perform Translation:**  
   * Translate each identified "original sentence" (Vietnamese) into **English**.  
   * **Core Requirement:** The English translation must be **plain text**. It must not contain any Markdown formatting characters (e.g., no `*`, `_`, `` ` ``, `**`, `[]()`, `#`, `- ` for lists, etc.). If the original Vietnamese sentence contains Markdown formatting, this formatting must NOT be carried over to the English translation.

3. **Format Translation Output:**  
   * After each original Vietnamese sentence, provide the English translation.  
   * The English translation must be enclosed in parentheses: `(Plain English translation.)`  
   * **Critical:** Each part (original Vietnamese sentence, English translation) must be separated by **a completely blank line** in the Markdown file to ensure each part appears on a separate line and receives the `<p>` tag styling.  
   * Example of correct structure:  
     ```markdown
     Đây là câu tiếng Việt gốc, có thể chứa *Markdown*.

     (This is the plain English translation of the original sentence without markdown)
     ```

4. **Handle Existing English Translations:**  
   * If the input Markdown file already contains an English translation for an original sentence (typically within parentheses immediately following the original Vietnamese sentence), then:  
     * **Verify and ensure** it complies with the required format (in parentheses, plain text, and on a separate line from the original sentence with a blank line in between).  
     * If the existing translation contains Markdown, **remove the Markdown**.  
     * If the structure is incorrect (e.g., `Vietnamese sentence (English translation)` on the same line), **separate them** per the standard format in rule 3.  
   * If the input file contains Vietnamese translations (e.g., from a previous process), these should be ignored or removed, as Vietnamese is now the original language.

**Detailed Formatting Rules (Apply to ALL content, including newly created translations):**

1. **Core Principle: "One Sentence/Information Unit per HTML Line"**  
   * As detailed in Translation Rule 3, this applies to all text segments, including original Vietnamese sentences and their English translations.

2. **Headings (H1-H6):**  
   * Use standard Markdown syntax: `# H1`, `## H2`, `### H3`, etc.  
   * Include a blank line before and after each heading.  
   * **Do not translate headings.**

3. **Paragraphs:**  
   * Adhere to the "Core Principle" for each original Vietnamese sentence and its English translation.  
   * Do not indent the first line.

4. **Text in Parentheses `()` (Not newly created English translations):**  
   * If text within parentheses in the original Vietnamese file is not an English translation of the immediately preceding Vietnamese sentence (e.g., a note in Vietnamese within parentheses), treat it as an independent note and **retain its original Markdown formatting (if any)**. Apply the "one sentence per line" rule if it needs to stand alone.  
   * Example: `Câu tiếng Việt gốc (đây là ghi chú tiếng Việt trong ngoặc).` will be preserved if "đây là ghi chú tiếng Việt trong ngoặc" is not a translation.

5. **Lists:**  
   * **Original Vietnamese sentences** in each list item must be translated into English (plain text) per the translation rules.  
   * Example structure for a list item:  
     ```markdown
     1. Nội dung *tiếng Việt* gốc của mục danh sách.

        (Plain English translation of the list item content)
     ```  
   * Each list item (`<li>`) starts on a new line. The English translation of the same item is indented appropriately under the original Vietnamese sentence.  
   * Include a blank line before the first list and after the last list.

6. **Blockquotes:**  
   * **Original Vietnamese sentences** in blockquotes must be translated into English (plain text) per the translation rules.  
   * Original Vietnamese sentences in blockquotes retain their original Markdown. The English translation line contains only plain text.  
   * Each line (original Vietnamese sentence, English translation) in a blockquote must start with `> `.  
   * Use a blank line containing only `> ` (or a completely blank line followed by a `> ` line) to separate the original sentence and its translation within the blockquote.  
   * Example:  
     ```markdown
     > Đây là câu trích dẫn *gốc* tiếng Việt.
     >
     > (This is the plain English translation of the quoted sentence)
     ```

7. **Emphasis:** `**bold**`, `*italic*` in the original Vietnamese text. Retain in the Vietnamese part. **Do not include in the English translation.**  
8. **Inline Code:** `` `code` `` in the original Vietnamese text. Retain in the Vietnamese part. **Do not include in the English translation. Do not translate code content.**  
9. **Code Blocks:** ``` ```. Retain unchanged. **Do not translate code block content.**  
10. **Horizontal Rules:** `---`. Retain unchanged.  
11. **Links:** `[text](URL)`.  
    * For `text` (link display text) in Vietnamese: Retain the original `text` and link formatting in the Vietnamese part. If the `text` is a complete "original sentence" requiring translation, translate it into English (plain text) and place the translation per the general rule (in parentheses, separate line). However, typically, link `text` is a phrase or noun, not a complete sentence, so do not translate it unless specifically required case-by-case. By default, retain the link `text`.  
    * **Do not translate URLs.**  
12. **Images:** `![alt text](URL)`.  
    * For `alt text` (alternative text) in Vietnamese: If the `alt text` is a complete "original sentence," translate it into English (plain text) and place the translation per the general rule (in parentheses, separate line, below the image line). Retain the original `alt text` in the `![]()` syntax.  
    * **Do not translate URLs.**  
13. **Tables:** Retain the Markdown table structure. Translate Vietnamese text in cells into English (plain text) if they are "original sentences." Vietnamese column headers (if categorical/technical) are not translated. For each cell containing an original Vietnamese sentence, include its English translation (plain text, in parentheses) immediately below the Vietnamese content in the same cell, or follow the separate-line structure if feasible in the Markdown table (this may be challenging, so consider table rendering carefully). If a separate line within a cell is not possible, place the translation immediately after in the same cell: `Nội dung ô tiếng Việt (Plain English translation content)`. *Prioritize one sentence/unit per line if the Markdown renderer supports line breaks within table cells.*  

14. **Escaping Characters:** Use `\` as needed in the Vietnamese text. English translations are plain text and typically do not require escaping.  

15. **Whitespace and Consistency:**  
    * Avoid trailing whitespace at the end of lines.  
    * Use consistent indentation for list items and their translations.  
    * Ensure the Markdown source is clean and readable.

**Things to AVOID:**  
* Using direct HTML tags (e.g., `<br>`).  
* Altering the semantic content of the original Vietnamese text beyond translating it into English.  
* **Inserting any Markdown formatting into the English translation content.**  
* Translating elements specified as non-translatable (headings, code, URLs, certain `alt text` or `link text`).  

**Example Conversion (Including Vietnamese-to-English Translation):**

* **Possible Input (Vietnamese):**  
  ```markdown
  ## Phần Quan Trọng

  Đây là câu tiếng Việt *đầu tiên*. Câu này cũng có `mã nội tuyến`.  
  Một câu khác để dịch (đây chỉ là ghi chú tiếng Việt).  

  - Một mục danh sách được *nhấn mạnh*.  
  - Nhấn [vào đây](file.html) để biết thêm.  
  ```

* **Desired Formatted and Translated Output:**  
  ```markdown
  ## Phần Quan Trọng

  Đây là câu tiếng Việt *đầu tiên*.

  (This is the first Vietnamese sentence)

  Câu này cũng có `mã nội tuyến`.

  (This sentence also has inline code)

  Một câu khác để dịch (đây chỉ là ghi chú tiếng Việt).

  (Another sentence for translation)

  - Một mục danh sách được *nhấn mạnh*.

    (A list item that is emphasized)

  - Nhấn [vào đây](file.html) để biết thêm.

    (Click here for more)
  ```



