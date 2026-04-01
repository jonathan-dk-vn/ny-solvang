(() => {
    // ===== CẤU HÌNH =====
    const TARGET_LANG = "vi";
    const SOURCE_LANG_DANISH = "da";
    const SELECTOR_TEXT = '[data-tid="closed-caption-text"]';
    const MARK_ATTR = "data-vi-translated";
    const DEBOUNCE_DELAY = 50; // Chờ 50ms để gom các câu lại trước khi dịch

    const CACHE = new Map();
    const DANISH_HINT_WORDS = [
        "og", "ikke", "så", "der", "det", "jeg", "du", "han", "hun",
        "vi", "I", "de", "er", "har", "skal", "minutter", "time", "på", "vand", "kost", "oversigt"
    ];
    // Tối ưu: Tạo sẵn Regex một lần duy nhất
    const DANISH_HINT_REGEX = new RegExp(`\\b(${DANISH_HINT_WORDS.join('|')})\\b`, "i");

    // ===== HÀM TIỆN ÍCH =====
    function isLikelyDanish(s) {
        if (!s) return false;
        // Kiểm tra ký tự đặc trưng của Đan Mạch (rất nhanh)
        if (/[æøåÆØÅ]/.test(s)) return true;
        // Kiểm tra các từ gợi ý (dùng Regex đã tạo sẵn)
        return DANISH_HINT_REGEX.test(s);
    }

    // ===== DỊCH THEO LÔ (BATCH TRANSLATION) =====
    async function translateBatch(texts) {
        if (!texts || texts.length === 0) return new Map();

        // Google Translate API hỗ trợ dịch nhiều câu bằng cách nối chúng với `\n`
        const query = texts.join('\n');
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(query)}`;
        
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error("Google API batch request failed");
            const data = await r.json();

            // Chỉ dịch nếu ngôn ngữ nguồn được xác định là Đan Mạch
            const detectedSourceLang = (data && data[2]) ? String(data[2]).toLowerCase() : "";
            if (detectedSourceLang !== SOURCE_LANG_DANISH && !isLikelyDanish(query)) {
                console.log("[DA→VI] Skipped batch, detected language:", detectedSourceLang);
                return new Map();
            }

            const translations = data[0].map(segment => segment[0]);
            const results = new Map();
            for (let i = 0; i < texts.length; i++) {
                if (translations[i]) {
                    results.set(texts[i], translations[i]);
                }
            }
            return results;
        } catch (e) {
            console.warn("[DA→VI] Batch translation failed:", e);
            // Có thể thêm fallback dịch từng câu ở đây nếu cần
            return new Map();
        }
    }

    // ===== HÀNG ĐỢI & XỬ LÝ DEBOUNCED =====
    const queue = [];
    let debounceTimeout = null;

    function enqueue(el) {
        if (!el || !(el instanceof HTMLElement)) return;
        const text = el.innerText?.trim();
        if (!text) return;

        // Tránh đưa vào hàng đợi những câu đã xử lý hoặc đang chờ
        const lastProcessed = el.getAttribute(MARK_ATTR);
        if (lastProcessed === text || queue.some(item => item.el === el && item.text === text)) {
            return;
        }
        
        queue.push({ el, text });
        
        // Đặt lại bộ đếm thời gian chờ (debounce)
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(processQueue, DEBOUNCE_DELAY);
    }

    async function processQueue() {
        if (queue.length === 0) return;

        // Lấy hết các mục trong hàng đợi và xóa hàng đợi
        const itemsToProcess = [...queue];
        queue.length = 0;

        // Lọc ra những câu chưa có trong cache
        const textsToTranslate = [...new Set(
            itemsToProcess
                .map(item => item.text)
                .filter(text => !CACHE.has(text) && !/^[\d\s:.,+-]+$/.test(text))
        )];

        // Gửi yêu cầu dịch theo lô
        const translatedResults = await translateBatch(textsToTranslate);

        // Cập nhật cache với kết quả mới
        for (const [original, translated] of translatedResults.entries()) {
            CACHE.set(original, translated);
        }

        // Cập nhật DOM
        itemsToProcess.forEach(({ el, text }) => {
            const translatedText = CACHE.get(text);
            if (translatedText) {
                updateDOM(el, text, translatedText);
            }
        });
    }
    
    function updateDOM(el, originalText, translatedText) {
        if (el.getAttribute(MARK_ATTR) === originalText) return; // Đã hiển thị bản dịch này rồi
        
        let holder = el.parentElement?.querySelector(":scope > .vi-sub");
        if (!holder) {
            holder = document.createElement("div");
            holder.className = "vi-sub";
            Object.assign(holder.style, {
                opacity: "0.95",
                marginTop: "2px",
                lineHeight: "1.25",
                fontSize: "0.92em",
                whiteSpace: "pre-wrap",
                userSelect: "text",
                color: "#dcdcdc" // Thêm màu cho dễ đọc trên nền tối
            });
            el.parentElement?.appendChild(holder);
        }
        holder.textContent = `[VI] ${translatedText}`;
        el.setAttribute(MARK_ATTR, originalText);
        console.log("%c[DA→VI]", "color:#1a7f37;font-weight:bold", translatedText, "| [DA]", originalText);
    }

    // ===== THEO DÕI DOM REALTIME =====
    function initialScan(root = document) {
        root.querySelectorAll(SELECTOR_TEXT).forEach(enqueue);
    }

    const observer = new MutationObserver(muts => {
        for (const m of muts) {
            if (m.type === "childList") {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        if (node.matches?.(SELECTOR_TEXT)) enqueue(node);
                        node.querySelectorAll?.(SELECTOR_TEXT).forEach(enqueue);
                    }
                });
            } else if (m.type === "characterData") {
                const el = m.target.parentElement?.closest?.(SELECTOR_TEXT);
                if (el) enqueue(el);
            }
        }
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true
    });

    initialScan();

    // ===== API DỪNG =====
    window.stopDaViLiveTranslate = () => {
        observer.disconnect();
        clearTimeout(debounceTimeout);
        document.querySelectorAll(".vi-sub").forEach(n => n.remove());
        console.log("[DA→VI] Stopped & cleaned.");
    };

    console.log(
        "%c✅ Dịch realtime Đan Mạch → Việt (DA→VI) đã được TỐI ƯU HÓA.\n• Dừng: stopDaViLiveTranslate()",
        "color:#1a7f37;font-weight:bold"
    );
})();