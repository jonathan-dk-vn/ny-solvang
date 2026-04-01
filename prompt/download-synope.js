/**
 * Hàm này sẽ tìm và tải xuống tất cả các file mp3 từ trang web.
 */
function downloadAllAudioFiles() {
    // 1. Xác định tên miền gốc của trang web chứa file âm thanh.
    // Dựa trên thông tin network bạn cung cấp, đó là "https://www.synope.dk".
    const baseUrl = 'https://www.synope.dk';

    // 2. Lấy tất cả các thẻ <source> có đuôi là ".mp3".
    const audioSources = document.querySelectorAll('audio source[src$=".mp3"]');

    // 3. Đặt thời gian chờ giữa các lần tải (tính bằng mili giây).
    // 2000ms = 2 giây. Điều này giúp tránh việc trình duyệt chặn tải hàng loạt.
    const delayBetweenDownloads = 2000;

    console.log(`Đã tìm thấy ${audioSources.length} tệp âm thanh. Bắt đầu tải xuống...`);

    // 4. Lặp qua từng tệp âm thanh và lên lịch tải xuống.
    audioSources.forEach((source, index) => {
        // Lấy đường dẫn tương đối, ví dụ: "/mp3/sam/01.mp3"
        const relativePath = source.getAttribute('src');

        // Tạo URL đầy đủ để tải, ví dụ: "https://www.synope.dk/mp3/sam/01.mp3"
        const fullUrl = baseUrl + relativePath;

        // Tách tên tệp từ URL, ví dụ: "01.mp3"
        const filename = relativePath.split('/').pop();

        // Sử dụng setTimeout để tạo độ trễ giữa các lần tải.
        setTimeout(() => {
            console.log(`Đang tải tệp: ${filename}`);

            // Tạo một thẻ <a> ẩn trong bộ nhớ
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = filename; // Thuộc tính này yêu cầu trình duyệt tải xuống tệp

            // Thêm thẻ <a> vào trang, nhấp vào nó, sau đó xóa đi
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        }, index * delayBetweenDownloads); // Mỗi lần lặp, độ trễ sẽ tăng lên
    });
}

// Gọi hàm để bắt đầu quá trình tải
downloadAllAudioFiles();

//  Lưu ý: Đoạn mã này nên được chạy trong bảng điều khiển (console) của trình duyệt khi bạn đang ở trên trang web chứa các tệp âm thanh.

//  Nếu bạn muốn tải xuống tất cả các tệp âm thanh từ một trang web khác, hãy thay đổi biến `baseUrl` và bộ chọn trong `querySelectorAll` cho phù hợp.

//  Hãy chắc chắn rằng bạn có quyền tải xuống các tệp từ trang web đó để tránh vi phạm bản quyền hoặc điều khoản dịch vụ.

//  Ngoài ra, một số trình duyệt có thể chặn tải xuống hàng loạt vì lý do bảo mật. Nếu gặp vấn đề, hãy thử điều chỉnh thời gian chờ hoặc tải từng tệp một cách thủ công.


