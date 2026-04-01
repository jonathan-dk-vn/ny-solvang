import puppeteer from 'puppeteer';

// --- CẤU HÌNH ---
const TARGET_URL = 'http://localhost:5173/#1%20Dansk/1%20Grammatik/Grammatik%20i%20brug/1%20Ng%E1%BB%AF%20ph%C3%A1p%20ti%E1%BA%BFng%20%C4%90an%20M%E1%BA%A1ch%20m%E1%BB%A5c%20l%E1%BB%A5c%20v%C3%A0%20n%E1%BB%99i%20dung'; 
const VIEWPORT = { width: 1920, height: 1080 }; 

(async () => {
  console.clear();
  console.log('🎮 CHẾ ĐỘ TEST THỦ CÔNG (MANUAL MODE)');
  console.log('---------------------------------------------------');
  console.log('👉 Trình duyệt sẽ mở lên.');
  console.log('👉 BẠN hãy tự cuộn chuột tự do.');
  console.log('👉 Terminal này sẽ in ra Breadcrumb ngay khi nó thay đổi.');
  console.log('---------------------------------------------------');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'] // Mở full màn hình để bạn dễ test
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });

    // 1. Chờ UI load xong
    try {
        await page.waitForSelector('.markdown-rendered h1', { timeout: 10000 });
        await page.waitForSelector('#active-heading-text', { timeout: 5000 });
        console.log('✅ Trang web đã sẵn sàng! Mời bạn cuộn chuột...');
        console.log('---------------------------------------------------');
    } catch (e) {
        console.error("🔥 Lỗi: Không tìm thấy nội dung bài học.");
        return;
    }

    // 2. Cầu nối (Bridge) để Browser gửi log về Terminal
    // Hàm này được gọi từ bên trong trình duyệt
    await page.exposeFunction('logToTerminal', (text, timestamp) => {
        const time = new Date(timestamp).toLocaleTimeString();
        // In ra Terminal với màu sắc cho dễ nhìn
        console.log(`[${time}] 📍 Active: \x1b[36m"${text}"\x1b[0m`);
    });

    // 3. Tiêm code theo dõi (Observer) vào trình duyệt
    await page.evaluate(() => {
        const targetNode = document.getElementById('active-heading-text');
        
        if (!targetNode) return;

        // Gửi trạng thái ban đầu
        window.logToTerminal(targetNode.innerText, Date.now());

        // Tạo MutationObserver để bắt mọi thay đổi text
        const observer = new MutationObserver((mutationsList) => {
            for(const mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const newText = targetNode.innerText;
                    // Gọi hàm NodeJS đã expose ở bước 2
                    window.logToTerminal(newText, Date.now());
                }
            }
        });

        // Bắt đầu theo dõi
        observer.observe(targetNode, { 
            attributes: false, 
            childList: true, 
            subtree: true,
            characterData: true
        });
        
        // Thêm một cái style border đỏ vào element để bạn dễ nhìn trên màn hình
        targetNode.parentElement.style.border = "2px solid red";
        targetNode.parentElement.style.position = "relative";
    });

    // 4. Giữ Script chạy mãi mãi cho đến khi bạn đóng trình duyệt
    await new Promise(() => {}); // Infinite promise

  } catch (error) {
    console.error('❌ Browser đã đóng hoặc có lỗi:', error.message);
  } finally {
    await browser.close();
  }
})();