import puppeteer from 'puppeteer';

// --- CẤU HÌNH ---
const TARGET_URL = 'http://localhost:5173/#1%20Dansk/1%20Grammatik/Grammatik%20i%20brug/1%20Ng%E1%BB%AF%20ph%C3%A1p%20ti%E1%BA%BFng%20%C4%90an%20M%E1%BA%A1ch%20m%E1%BB%A5c%20l%E1%BB%A5c%20v%C3%A0%20n%E1%BB%99i%20dung'; 
const VIEWPORT = { width: 1920, height: 1080 }; 

// Thời gian "đọc" sau khi cuộn tới nơi (giả lập người dùng dừng lại xem)
const READING_PAUSE = 1500; 

(async () => {
  console.log('🚀 Khởi động Bot: Chế độ cuộn người dùng (Human-like Scrolling)...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });

    // 1. Chờ nội dung
    try {
        await page.waitForSelector('.markdown-rendered h1', { timeout: 10000 });
        await page.waitForSelector('#active-heading-text', { timeout: 5000 });
    } catch (e) {
        throw new Error("Page content not loaded");
    }

    const firstHeading = await page.$eval('.markdown-rendered h1', el => el.textContent.trim());
    console.log(`📄 Bài học: "${firstHeading}"`);

    // 2. Lấy danh sách Heading
    const headings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.markdown-rendered h1, .markdown-rendered h2, .markdown-rendered h3, .markdown-rendered h4'));
      return elements.map((el) => ({
        id: el.id,
        text: el.textContent.trim(),
        tag: el.tagName
      }));
    });

    console.log(`📊 Tìm thấy ${headings.length} headings.`);
    console.log('---------------------------------------------------------------');

    let passCount = 0;
    let failCount = 0;

    // 3. VÒNG LẶP TEST
    for (const heading of headings) {
      if (!heading.id) continue;

      console.log(`🖱️  Đang lướt tới: "${heading.text}"...`);

      // --- [CORE LOGIC] HUMAN SCROLL ---
      await page.evaluate(async (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        // Tính toán đích đến (Vùng 18% màn hình)
        const rect = el.getBoundingClientRect();
        const currentScroll = window.pageYOffset;
        const targetY = rect.top + currentScroll - (window.innerHeight * 0.18);

        // Hàm giả lập cuộn người dùng
        await new Promise((resolve) => {
          const startY = window.pageYOffset;
          const distance = targetY - startY;
          const startTime = performance.now();
          
          // Thời gian cuộn phụ thuộc vào khoảng cách (xa thì cuộn lâu hơn)
          // Tối thiểu 500ms, tối đa 2000ms
          const duration = Math.min(2000, Math.max(500, Math.abs(distance) * 0.5));

          function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Hàm Easing (Ease Out Cubic): Bắt đầu nhanh, kết thúc từ từ
            // Công thức: 1 - pow(1 - progress, 3)
            const ease = 1 - Math.pow(1 - progress, 3);

            const nextY = startY + (distance * ease);

            // Thêm độ rung nhẹ (Jitter) để giống tay người không hoàn hảo (±2px)
            const jitter = (Math.random() - 0.5) * 4; 
            
            window.scrollTo(0, nextY + jitter);

            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              // Đảm bảo cuộn chính xác điểm cuối khi xong
              window.scrollTo(0, targetY);
              resolve();
            }
          }

          window.requestAnimationFrame(step);
        });

      }, heading.id);

      // --- KẾT THÚC HUMAN SCROLL ---

      // B. Giả lập thời gian mắt người dùng dừng lại để đọc tiêu đề (Reading Pause)
      await new Promise(r => setTimeout(r, READING_PAUSE));

      // C. Kiểm tra kết quả
      const actualBreadcrumb = await page.$eval('#active-heading-text', el => el.innerText);

      const cleanHeading = heading.text.replace(/\s+/g, ' ').toLowerCase();
      const cleanActual = actualBreadcrumb.replace(/\s+/g, ' ').toLowerCase();
      
      if (cleanActual.includes(cleanHeading)) {
        // In ngắn gọn để đỡ rối mắt vì log cuộn nhiều
        // process.stdout.write('.'); // Hoặc in dấu chấm nếu muốn gọn
        passCount++;
      } else {
        console.error(`\n❌ [FAIL] "${heading.text}"`);
        console.error(`   👉 Thấy: "${actualBreadcrumb}"`);
        failCount++;
      }
    }

    console.log('\n---------------------------------------------------------------');
    console.log(`🏁 KẾT QUẢ: PASS ${passCount} / FAIL ${failCount}`);
    console.log(`📈 Tỷ lệ: ${((passCount / headings.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('🔥 Lỗi:', error);
  } finally {
    await browser.close();
  }
})();