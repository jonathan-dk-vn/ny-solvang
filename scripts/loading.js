// scripts/loading.js
/**
 * @module loading
 * Quản lý màn hình loading cho đến khi trang được tải hoàn toàn.
 */

// Giữ tham chiếu đến lớp phủ để tránh truy vấn DOM nhiều lần
let loadingOverlay = null;

/**
 * Tạo và hiển thị lớp phủ loading.
 * Chèn overlay vào body và vô hiệu hóa cuộn trang.
 */
export function showLoading() {
  // Nếu lớp phủ đã tồn tại, không làm gì cả
  if (document.getElementById('loading-overlay')) {
    return;
  }

  // Tạo các phần tử HTML
  loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-overlay';

  const loader = document.createElement('div');
  loader.className = 'loader';

  // Gắn các phần tử vào nhau và vào body
  loadingOverlay.appendChild(loader);
  document.body.appendChild(loadingOverlay);
  
  // Vô hiệu hóa cuộn trang
  document.body.style.overflow = 'hidden';
}

/**
 * Ẩn và xóa lớp phủ loading.
 * Thêm class 'hidden' để kích hoạt hiệu ứng fade-out,
 * sau đó xóa khỏi DOM khi transition kết thúc.
 */
export function hideLoading() {
  if (!loadingOverlay) {
    // Nếu có trường hợp hàm được gọi nhưng overlay không tồn tại
    loadingOverlay = document.getElementById('loading-overlay');
  }

  if (loadingOverlay) {
    // Thêm class để bắt đầu transition trong CSS
    loadingOverlay.classList.add('hidden');

    // Khôi phục cuộn trang
    document.body.style.overflow = '';

    // Lắng nghe sự kiện transition kết thúc để xóa hẳn phần tử khỏi DOM
    loadingOverlay.addEventListener('transitionend', () => {
      if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
      loadingOverlay = null; // Dọn dẹp tham chiếu
    }, { once: true }); // Tự động xóa listener sau khi chạy một lần
  }
}