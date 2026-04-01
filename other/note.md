Tuyệt! Mình thêm alias thứ 3 **`nuke-local`** (reset + clean xoá thật **nhưng không push**). Dưới đây là trọn bộ 3 alias để bạn cài một lần:

### Cài đặt (chạy tất cả lệnh này 1 lần)

```bash
# 1) Xem trước: reset + clean dry-run
git config --global alias.nuke-dry '!f() {
  if [ -z "$1" ]; then
    echo "Usage: git nuke-dry <commit>"; exit 1;
  fi
  COMMIT="$1"
  echo ">> git reset --hard $COMMIT"
  git reset --hard "$COMMIT"
  echo ">> git clean -ndx"
  git clean -ndx
}; f'

# 2) Local: reset + clean xoá thật (không push)
git config --global alias.nuke-local '!f() {
  if [ -z "$1" ]; then
    echo "Usage: git nuke-local <commit>"; exit 1;
  fi
  COMMIT="$1"
  echo ">> git reset --hard $COMMIT"
  git reset --hard "$COMMIT"
  echo ">> git clean -fdx"
  git clean -fdx
}; f'

# 3) Remote: reset + clean xoá thật + push --force-with-lease
git config --global alias.nuke-go '!f() {
  if [ -z "$1" ]; then
    echo "Usage: git nuke-go <commit>"; exit 1;
  fi
  COMMIT="$1"
  echo ">> git reset --hard $COMMIT"
  git reset --hard "$COMMIT"
  echo ">> git clean -fdx"
  git clean -fdx
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo ">> git push --force-with-lease origin $BRANCH"
  git push --force-with-lease origin "$BRANCH"
}; f'
```

### Cách dùng

```bash
git nuke-dry  <commit_hash>   # reset + xem trước sẽ xoá gì
git nuke-local <commit_hash>  # reset + xoá thật (không push)
git nuke-go   <commit_hash>   # reset + xoá thật + đẩy remote
```

### Lưu ý an toàn

* Các lệnh này **xoá toàn bộ file untracked & ignored** (`-fdx`). Sao lưu trước nếu cần.
* `nuke-go` dùng `--force-with-lease` (an toàn hơn `--force`). Đảm bảo bạn đang ở đúng branch.
* Muốn đổi remote/branch, sửa dòng `origin`/`$BRANCH` trong alias `nuke-go`.

Bạn muốn mình thêm biến thể có **prompt xác nhận** trước khi clean/push không? Mình có thể thêm `--yes` để bỏ qua hỏi lại.


Bạn muốn setup lệnh **`git acp`** (alias cho `git add . && git commit -m "msg" && git push`) đúng không?
Mình hướng dẫn bạn cách làm nhé:

---

### 1. Tạo alias trong Git

Bạn có thể thêm alias trực tiếp vào Git config:

```bash
git config --global alias.acp '!f() { git add . && git commit -m "$1" && git push; }; f'
```

Cách dùng:

```bash
git acp "commit message của bạn"
```

---

### 2. Tạo alias trong shell (bash/zsh)

Nếu muốn ngắn gọn hơn, thêm vào file `~/.bashrc` hoặc `~/.zshrc`:

```bash
alias gacp='git add . && git commit -m'
```

Rồi reload:

```bash
source ~/.bashrc   # hoặc ~/.zshrc
```

Dùng như sau:

```bash
gacp "commit message" && git push
```

---

### 3. Dùng script

Tạo file `git-acp.sh`:

```bash
#!/bin/bash
git add .
git commit -m "$1"
git push
```

Cấp quyền chạy:

```bash
chmod +x git-acp.sh
```

Rồi gọi:

```bash
./git-acp.sh "commit message"
```

---

👉 Cách tiện nhất là **alias trong Git** (cách 1), vì nó dùng được ở mọi repo.

Bạn có muốn mình viết luôn alias `git acp` sao cho chỉ cần chạy `git acp "msg"` là đủ, không cần thêm `push` riêng không?

---

DATA_FOLDER=silver-data npm run build

DATA_FOLDER=farm-data npm run build

---

think:Để hướng dẫn bạn chi tiết từng bước thực hiện **Cách 1 (Sử dụng biến môi trường)** cho 2 folder `gold-data` và `silver-data`, tôi cần xem nội dung của hai file script quan trọng là `scripts/generate-navigation.js` và `scripts/build-html.js`. Điều này giúp tôi chỉ cho bạn chính xác dòng code nào cần sửa để hệ thống nhận diện folder dữ liệu động.

Tôi sẽ lấy nội dung của hai file này ngay bây giờ.
Chào bạn, đây là hướng dẫn từng bước để triển khai **Cách 1 (Sử dụng Biến Môi Trường)**. Cách này giúp bạn giữ nguyên code logic, chỉ thay đổi nguồn dữ liệu đầu vào dựa trên cấu hình.

Mục tiêu:

1. Giữ nguyên frontend.
2. Script sẽ tự động lấy dữ liệu từ `gold-data` hoặc `silver-data` tùy theo biến môi trường `DATA_FOLDER`.
3. Kết quả build (Navigation và HTML) sẽ luôn được xuất ra đúng chỗ để trang web hoạt động bình thường.

Sau đây là các bước thực hiện:

### Bước 1: Chuẩn bị dữ liệu

1. Trong thư mục dự án của bạn (trên máy tính), hãy vào folder `public/`.
2. Bạn đã có sẵn folder `gold-data`.
3. Tạo thêm một folder mới ngang hàng tên là `silver-data`.
4. Copy nội dung file `.md` bạn muốn hiển thị cho trang web thứ 2 vào trong `silver-data`.

Cấu trúc thư mục sẽ trông như thế này:

```text
my-project/
├── public/
│   ├── gold-data/      <-- Dữ liệu web 1
│   ├── silver-data/    <-- Dữ liệu web 2
│   ├── html-data/      <-- (Folder này do script tự tạo, đừng sửa)
...

```

---

### Bước 2: Sửa file `scripts/generate-navigation.js`

Bạn cần sửa file này để nó nhận biết folder nào cần quét.

* Mở file `scripts/generate-navigation.js`.
* Tìm đến phần **Configuration** (khoảng dòng 10).
* Thay thế đoạn khai báo `markdownDir` cũ bằng đoạn code mới hỗ trợ biến môi trường.

**Code cũ:**

```javascript
const markdownDir = path.join(__dirname, '..', 'public', 'gold-data');

```

**Code MỚI (Thay thế bằng đoạn này):**

```javascript
// Lấy tên folder từ biến môi trường, nếu không có thì mặc định là 'gold-data'
const dataFolder = process.env.DATA_FOLDER || 'gold-data';
console.log(`[GEN-NAV] 📂 Đang sử dụng nguồn dữ liệu: public/${dataFolder}`);

const markdownDir = path.join(__dirname, '..', 'public', dataFolder);

```

---

### Bước 3: Sửa file `scripts/build-html.js`

Tương tự, file này cần biết phải build file HTML từ nguồn nào.

* Mở file `scripts/build-html.js`.
* Tìm đến phần **CẤU HÌNH ĐƯỜNG DẪN** (khoảng dòng 11).
* Thay thế khai báo `markdownDir` cũ.

**Code cũ:**

```javascript
const markdownDir = path.join(__dirname, "..", "public", "gold-data");

```

**Code MỚI (Thay thế bằng đoạn này):**

```javascript
// Lấy tên folder từ biến môi trường, nếu không có thì mặc định là 'gold-data'
const dataFolder = process.env.DATA_FOLDER || 'gold-data';
console.log(`[BUILD-HTML] 📂 Đang sử dụng nguồn dữ liệu: public/${dataFolder}`);

const markdownDir = path.join(__dirname, "..", "public", dataFolder);

```

> **Lưu ý:** Chúng ta **giữ nguyên** `outputDir` là `html-data`. Lý do là Frontend (`main.js`) luôn tìm file HTML trong folder `html-data`. Script build sẽ chịu trách nhiệm lấy nội dung từ `silver-data` và đổ vào `html-data` để Frontend không bị lỗi.

---

### Bước 4: Kiểm tra thử trên máy tính (Local)

Trước khi đẩy lên Github, bạn hãy test thử xem code có chạy đúng không.

**Để chạy phiên bản Gold (Mặc định):**

```bash
npm run build
# Hoặc: npm run dev

```

-> Bạn sẽ thấy log: `📂 Đang sử dụng nguồn dữ liệu: public/gold-data`

**Để chạy phiên bản Silver (Giả lập):**
Trên terminal (Mac/Linux/Git Bash):

```bash
DATA_FOLDER=silver-data npm run build

```

Trên Windows (CMD):

```cmd
set DATA_FOLDER=silver-data&& npm run build

```

Trên Windows (PowerShell):

```powershell
$env:DATA_FOLDER="silver-data"; npm run build

```

-> Bạn sẽ thấy log: `📂 Đang sử dụng nguồn dữ liệu: public/silver-data`

Nếu cả 2 lệnh đều chạy mượt và sinh ra file trong `public/html-data` thì code đã chuẩn.

---

### Bước 5: Đẩy code lên Github và Cấu hình Vercel

Sau khi commit và push code lên Github (nhánh `main` hoặc nhánh bạn đang dùng), hãy làm như sau trên Vercel:

**1. Đối với Project hiện tại (Dành cho Gold Data):**

* Vào Dashboard của Project trên Vercel -> **Settings** -> **Environment Variables**.
* Thêm biến:
* **Key:** `DATA_FOLDER`
* **Value:** `gold-data`


* Bấm Save.
* Qua tab **Deployments**, bấm vào nút 3 chấm ở lần deploy mới nhất -> **Redeploy** để áp dụng biến môi trường.

**2. Tạo Project mới (Dành cho Silver Data):**

* Về trang chủ Vercel -> **Add New...** -> **Project**.
* Chọn **cùng một Repository Github** của dự án này.
* Đặt tên Project khác (ví dụ: `my-danish-app-silver`).
* Trong phần cấu hình **Environment Variables** (trước khi bấm Deploy):
* **Key:** `DATA_FOLDER`
* **Value:** `silver-data`


* Bấm **Deploy**.

### Kết quả

* **Link 1 (Gold Project):** Vercel sẽ đọc biến `gold-data` -> Build nội dung từ folder `public/gold-data`.
* **Link 2 (Silver Project):** Vercel sẽ đọc biến `silver-data` -> Build nội dung từ folder `public/silver-data`.

Cả hai web dùng chung 1 source code, nhưng hiển thị nội dung khác nhau hoàn toàn.