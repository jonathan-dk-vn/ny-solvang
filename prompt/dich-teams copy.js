(() => {
  const TARGET_LANGS = ["en", "vi"];
  const SOURCE_LANG = "da";
  const SELECTOR = '[data-tid="closed-caption-text"]';
  const AUTHOR_SELECTOR = '[data-tid="author"]';

  /** ================== STYLE UI ================== */
  if (!document.getElementById("live-sub-style")) {
    const st = document.createElement("style");
    st.id = "live-sub-style";
    st.textContent = `
      .sub-table-wrap {
        position: fixed; 
        z-index: 9999; 
        left: 20px; 
        top: 50px;
        width: 900px; 
        height: 500px; 
        background: rgba(228, 241, 240, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px; 
        border: 1px solid rgba(89, 117, 85, 0.6); 
        display: flex; 
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        color: #1a1a1a;
      }
      .sub-toolbar {
        background: rgba(228, 241, 240, 0.7); 
        padding: 8px 15px; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        border-bottom: 1px solid rgba(89, 117, 85, 0.4); 
        cursor: move;
      }
      .btn-export {
        background: rgba(34, 197, 94, 0.9); 
        color: #ffffff; 
        border: none; 
        padding: 5px 15px;
        border-radius: 4px; 
        cursor: pointer; 
        font-size: 11px; 
        font-weight: bold;
        transition: all 0.2s ease;
      }
      .btn-export:hover {
        background: rgba(22, 163, 74, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .sub-table-container { 
        flex: 1; 
        overflow: auto; 
      }
      .sub-table { 
        width: 100%; 
        border-collapse: collapse; 
        table-layout: fixed; 
      }
      .sub-table th, .sub-table td {
        border: 1px solid rgba(89, 117, 85, 0.3); 
        padding: 12px; 
        text-align: left; 
        font-size: 13px;
        background: rgba(255, 255, 255, 0.4);
      }
      .sub-table th { 
        background: rgba(178, 217, 213, 0.7); 
        color: #2c3e50; 
        position: sticky; 
        top: 0;
        font-weight: bold;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      }
      .sub-table tr:hover td {
        background: rgba(250, 250, 250, 0.8);
      }
      .col-author { 
        color: #f97316; 
        width: 15%; 
        font-weight: bold; 
      }
      .col-da { 
        color: #0ea5e9; 
        width: 28%; 
        font-style: italic; 
      }
      .col-en { 
        color: #1a1a1a; 
        width: 28%; 
      }
      .col-vi { 
        color: #22c55e; 
        width: 29%; 
      }
    `;
    document.head.appendChild(st);
  }

  let STACK = [];
  let GLOBAL_WRAP = null;
  let LAST_ELEMENT_REF = null;
  let translateTimeout = null;

  function renderTable() {
    if (!GLOBAL_WRAP) {
      GLOBAL_WRAP = document.createElement("div");
      GLOBAL_WRAP.className = "sub-table-wrap";

      const toolbar = document.createElement("div");
      toolbar.className = "sub-toolbar";
      toolbar.textContent = "LIVE TRANSCRIPT (DA -> EN/VI)";

      const btn = document.createElement("button");
      btn.className = "btn-export";
      btn.textContent = "XUẤT FILE .MD";
      btn.onclick = exportToMarkdown;

      toolbar.appendChild(btn);
      GLOBAL_WRAP.appendChild(toolbar);

      const container = document.createElement("div");
      container.className = "sub-table-container";
      GLOBAL_WRAP.appendChild(container);
      document.body.appendChild(GLOBAL_WRAP);

      // Drag & Drop đơn giản
      toolbar.onmousedown = (e) => {
        let startX = e.clientX - GLOBAL_WRAP.offsetLeft;
        let startY = e.clientY - GLOBAL_WRAP.offsetTop;
        document.onmousemove = (ev) => {
          GLOBAL_WRAP.style.left = ev.clientX - startX + "px";
          GLOBAL_WRAP.style.top = ev.clientY - startY + "px";
        };
        document.onmouseup = () => (document.onmousemove = null);
      };
    }

    const container = GLOBAL_WRAP.querySelector(".sub-table-container");
    container.textContent = "";
    const table = document.createElement("table");
    table.className = "sub-table";

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    ["Người nói", "Gốc (DA)", "English", "Việt"].forEach((t) => {
      const th = document.createElement("th");
      th.textContent = t;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    STACK.forEach((item, idx) => {
      const tr = document.createElement("tr");
      [item.author, item.da, item.en || "...", item.vi || "..."].forEach(
        (text, i) => {
          const td = document.createElement("td");
          td.className =
            i === 0
              ? "col-author"
              : i === 1
                ? "col-da"
                : i === 2
                  ? "col-en"
                  : "col-vi";
          td.textContent = text;
          tr.appendChild(td);
        },
      );
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function exportToMarkdown() {
    const content = STACK.slice()
      .reverse()
      .map(
        (item) =>
          `**${item.author}:**\n\n${item.da}\n\n* (EN): ${item.en || "N/A"}\n* (VI): ${item.vi || "N/A"}\n\n---`,
      )
      .join("\n\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Teams_Transcript.md`;
    a.click();
  }

  async function handleNewSubtitle(text, el) {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText || cleanText.length < 2) return;

    const authorEl = el
      .closest(".fui-ChatMessageCompact__body")
      ?.querySelector(AUTHOR_SELECTOR);
    const authorName = authorEl ? authorEl.textContent.trim() : "Người nói";

    if (LAST_ELEMENT_REF === el && STACK.length > 0) {
      STACK[0].da = cleanText;
    } else {
      STACK.unshift({ author: authorName, da: cleanText, en: "", vi: "" });
      LAST_ELEMENT_REF = el;
    }

    renderTable();

    // Debounce: Chỉ dịch khi người dùng ngừng nói trong 400ms
    clearTimeout(translateTimeout);
    translateTimeout = setTimeout(async () => {
      const currentRow = STACK[0];
      const results = await Promise.all(
        TARGET_LANGS.map(async (lang) => {
          try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SOURCE_LANG}&tl=${lang}&dt=t&q=${encodeURIComponent(cleanText)}`;
            const res = await fetch(url);
            if (!res.ok) return "Lỗi dịch (Google Block)";
            const data = await res.json();
            return data?.[0]?.map((s) => s?.[0] ?? "").join("") || "";
          } catch (e) {
            return "Lỗi kết nối";
          }
        }),
      );

      if (currentRow.da === cleanText) {
        currentRow.en = results[0];
        currentRow.vi = results[1];
        renderTable();
      }
    }, 400);
  }

  const obs = new MutationObserver((ms) =>
    ms.forEach((m) => {
      if (m.type === "childList")
        m.addedNodes.forEach(
          (n) =>
            n.nodeType === 1 &&
            (n.matches?.(SELECTOR)
              ? handleNewSubtitle(n.textContent, n)
              : n
                  .querySelectorAll?.(SELECTOR)
                  .forEach((el) => handleNewSubtitle(el.textContent, el))),
        );
      else if (m.type === "characterData") {
        const el = m.target.parentElement?.closest?.(SELECTOR);
        if (el) handleNewSubtitle(el.textContent, el);
      }
    }),
  );

  obs.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  console.log("Transcript Table fixed for CSP and 500 errors.");
})();