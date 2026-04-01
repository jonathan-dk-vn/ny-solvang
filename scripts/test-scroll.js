import puppeteer from 'puppeteer';

// --- CẤU HÌNH DESKTOP ---
// URL bài học cần test
const TARGET_URL = 'http://localhost:5173/#1%20Dansk/1%20Grammatik/Grammatik%20i%20brug/1%20Ng%E1%BB%AF%20ph%C3%A1p%20ti%E1%BA%BFng%20%C4%90an%20M%E1%BA%A1ch%20m%E1%BB%A5c%20l%E1%BB%A5c%20v%C3%A0%20n%E1%BB%99i%20dung'; 

// [CHANGE 1] Cấu hình độ phân giải Máy tính (Full HD)
const VIEWPORT = { width: 1920, height: 1080 }; 

// Thời gian chờ để UI render và Observer bắt kịp
const SCROLL_DELAY = 1000; 

(async () => {
  console.log('🚀 Đang khởi động Bot kiểm thử (Giao diện Desktop)...');
  
  const browser = await puppeteer.launch({
    headless: false, // Bật trình duyệt để bạn quan sát
    defaultViewport: null, // Để trình duyệt tự fill theo window size
    // [CHANGE 2] Mở cửa sổ trình duyệt to
    args: ['--start-maximized', '--window-size=1920,1080'] 
  });

  const page = await browser.newPage();
  
  // Set kích thước viewport nội bộ
  await page.setViewport(VIEWPORT);

  try {
    console.log(`🌐 Truy cập bài học...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });

    // 1. CHỜ NỘI DUNG LOAD
    try {
        await page.waitForSelector('.markdown-rendered h1', { timeout: 10000 });
        // Chờ Breadcrumb xuất hiện (trên Desktop thanh này vẫn tồn tại nhưng style khác)
        await page.waitForSelector('#active-heading-text', { timeout: 5000 });
    } catch (e) {
        console.error("🔥 LỖI: Không tìm thấy nội dung bài học.");
        throw new Error("Page content not loaded");
    }

    // 2. KIỂM TRA TIÊU ĐỀ
    const firstHeading = await page.$eval('.markdown-rendered h1', el => el.textContent.trim());
    console.log(`📄 Đang test: "${firstHeading}"`);

    // 3. QUÉT DANH SÁCH HEADING
    const headings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.markdown-rendered h1, .markdown-rendered h2, .markdown-rendered h3, .markdown-rendered h4'));
      return elements.map((el) => ({
        id: el.id,
        text: el.textContent.trim(),
        tag: el.tagName
      }));
    });

    console.log(`📊 Tìm thấy ${headings.length} headings cần test.`);
    console.log('---------------------------------------------------------------');

    let passCount = 0;
    let failCount = 0;

    // 4. CHẠY TEST TỪNG MỤC
    for (const heading of headings) {
      if (!heading.id) continue;

      // A. Cuộn thông minh (Smart Scroll)
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          // [LOGIC GIỮ NGUYÊN] Vẫn cuộn vào vùng 18% màn hình 
          // (Dù màn hình to hơn nhưng tỷ lệ % cho Observer rootMargin vẫn thế)
          const targetY = rect.top + scrollTop - (window.innerHeight * 0.18);
          
          window.scrollTo({ top: targetY, behavior: 'auto' });
        }
      }, heading.id);

      // B. Đợi Observer bắt sự kiện
      await new Promise(r => setTimeout(r, SCROLL_DELAY));

      // C. Lấy kết quả thực tế
      const actualBreadcrumb = await page.$eval('#active-heading-text', el => el.innerText);

      // D. So sánh
      const cleanHeading = heading.text.replace(/\s+/g, ' ').toLowerCase();
      const cleanActual = actualBreadcrumb.replace(/\s+/g, ' ').toLowerCase();
      
      const isMatch = cleanActual.includes(cleanHeading);

      if (isMatch) {
        console.log(`✅ [PASS] "${heading.text}"`);
        passCount++;
      } else {
        console.error(`❌ [FAIL] "${heading.text}"`);
        console.error(`   👉 Mong đợi chứa: "${heading.text}"`);
        console.error(`   👉 Thực tế:       "${actualBreadcrumb}"`);
        failCount++;
      }
    }

    console.log('---------------------------------------------------------------');
    console.log(`🏁 KẾT QUẢ: PASS ${passCount} / FAIL ${failCount}`);
    console.log(`📈 Tỷ lệ thành công: ${((passCount / headings.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('🔥 Lỗi Script:', error.message);
  } finally {
    // Đợi 5s rồi đóng
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
})();