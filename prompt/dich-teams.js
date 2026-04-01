(() => {
  const TARGET_LANGS = ["vi", "en"];
  const SOURCE_LANG = "da"; // ép cứng Đan Mạch
  const SELECTOR_TEXT = '[data-tid="closed-caption-text"]';
  const MARK_ATTR = { vi: "data-vi-translated", en: "data-en-translated" };
  const MAX_CONCURRENCY = Math.min(8, navigator.hardwareConcurrency || 4);

  // ===== STYLE DÙNG CHUNG =====
  if (!document.getElementById("live-translate-style")) {
    const st = document.createElement("style");
    st.id = "live-translate-style";
    st.textContent = `
      .sub-vi, .sub-en {
        font-style: normal;
        color: #000;
        margin-top: 3px;
        line-height: 1.25;
        font-size: .95em;
        white-space: pre-wrap;
        user-select: text;
      }
    `;
    document.head.appendChild(st);
  }

  // ===== CACHE =====
  const CACHE = new Map();        // text -> {vi,en}
  const IN_FLIGHT = new Map();    // `${lang}:${text}` -> Promise
  const WAITERS = new Map();      // text -> Set<HTMLElement>
  const HOLDER_CACHE = new WeakMap();
  const LAST_TEXT = new WeakMap();

  // Chuẩn hoá để tăng cache hit
  const normalizeText = (s) => s.replace(/\s+/g, " ").replace(/\s+([,.:;!?])/g, "$1").trim();

  // ===== POOL CONCURRENCY =====
  const pool = (() => {
    let running = 0;
    const q = [];
    const runNext = () => {
      if (running >= MAX_CONCURRENCY || !q.length) return;
      running++;
      const { fn, res, rej } = q.shift();
      Promise.resolve().then(fn).then(res, rej).finally(() => {
        running--; runNext();
      });
    };
    return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); runNext(); });
  })();

  // ===== DỊCH 1 CÂU =====
  function translateOne(text, lang) {
    const key = `${lang}:${text}`;
    if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key);

    const cached = CACHE.get(text);
    if (cached?.[lang]) return Promise.resolve(cached[lang]);

    const p = pool(async () => {
      const url = new URL("https://translate.googleapis.com/translate_a/single");
      url.searchParams.set("client", "gtx");
      url.searchParams.set("sl", SOURCE_LANG); // luôn DA
      url.searchParams.set("tl", lang);
      url.searchParams.set("dt", "t");
      url.searchParams.set("q", text);

      const r = await fetch(url);
      if (!r.ok) return "";
      const data = await r.json();
      const translated = Array.isArray(data?.[0]) ? data[0].map(seg => seg?.[0] ?? "").join("") : "";

      if (!CACHE.has(text)) CACHE.set(text, {});
      CACHE.get(text)[lang] = translated;
      notifyWaiters(text, lang, translated);
      return translated;
    }).finally(() => IN_FLIGHT.delete(key));

    IN_FLIGHT.set(key, p);
    return p;
  }

  // ===== DOM =====
  function getHolders(el) {
    let h = HOLDER_CACHE.get(el);
    if (h) return h;
    HOLDER_CACHE.set(el, (h = {}));
    return h;
  }
  function ensureHolder(el, lang) {
    const h = getHolders(el);
    if (h[lang] && h[lang].isConnected) return h[lang];
    const parent = el.parentElement; if (!parent) return null;
    const node = document.createElement("div");
    node.className = `sub-${lang}`;
    parent.appendChild(node);
    h[lang] = node;
    return node;
  }
  function updateDOM(el, text, translated, lang) {
    const mark = MARK_ATTR[lang];
    if (el.getAttribute(mark) === text) return;
    const holder = ensureHolder(el, lang);
    if (!holder) return;
    holder.textContent = `[${lang.toUpperCase()}] ${translated}`;
    el.setAttribute(mark, text);
  }
  function notifyWaiters(text, lang, translated) {
    const set = WAITERS.get(text);
    if (!set) return;
    for (const el of set) {
      if (!el.isConnected) { set.delete(el); continue; }
      if (translated) updateDOM(el, text, translated, lang);
    }
    const got = CACHE.get(text) || {};
    if (got.vi && got.en) WAITERS.delete(text);
  }

  // ===== HÀNG ĐỢI =====
  const queue = [];
  let scheduled = false;
  const scheduleProcess = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; processQueue(); });
  };
  function enqueue(el) {
    const raw = el.textContent || "";
    let text = normalizeText(raw);
    if (!text || /^[\d\s:.,+-]+$/.test(text)) return;
    if (LAST_TEXT.get(el) === text) return;
    LAST_TEXT.set(el, text);
    if (!WAITERS.has(text)) WAITERS.set(text, new Set());
    WAITERS.get(text).add(el);
    queue.push(text);
    scheduleProcess();
  }
  function processQueue() {
    if (!queue.length) return;
    const unique = [...new Set(queue.splice(0))];
    for (const text of unique) {
      const cached = CACHE.get(text);
      if (cached) for (const lang of TARGET_LANGS) if (cached[lang]) notifyWaiters(text, lang, cached[lang]);
      for (const lang of TARGET_LANGS) translateOne(text, lang);
    }
  }

  // ===== THEO DÕI DOM =====
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const el = n;
          if (el.matches?.(SELECTOR_TEXT)) enqueue(el);
          el.querySelectorAll?.(SELECTOR_TEXT).forEach(enqueue);
        }
      } else if (m.type === "characterData") {
        const host = m.target.parentElement?.closest?.(SELECTOR_TEXT);
        if (host) enqueue(host);
      }
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  document.querySelectorAll(SELECTOR_TEXT).forEach(enqueue);

  // ===== STOP API =====
  window.stopLiveTranslate = () => {
    obs.disconnect();
    document.querySelectorAll(".sub-vi,.sub-en").forEach(n => n.remove());
  };
})();
