# Cập nhật trợ lý AI chọn sản phẩm dùng Gemini Flash-Lite

## Chức năng đã bổ sung và hoàn thiện

- Tư vấn theo nhu cầu, ngân sách và danh mục, chỉ lấy sản phẩm đang mở bán và còn hàng trong database.
- Dùng Gemini API ở backend; mặc định gemini-3.5-flash-lite với thinking MINIMAL. Không tự dùng MINIMAL cho các model không hỗ trợ.
- Đề xuất tối đa 3 sản phẩm từ nhóm tối đa 16 ứng viên; giá/tồn kho/thông số hiển thị do backend xác minh, không lấy thông tin tự do do AI viết.
- Có xem chi tiết và thêm sản phẩm vào giỏ; tải lại giá và tình trạng hàng trước khi thêm.
- Gộp thành tối đa 1 request Gemini mỗi lượt, rút gọn dữ liệu, cache quyết định hợp lệ 90 giây. Đổi hội thoại/bộ lọc/model/catalog làm thay khóa cache; kiểm tra lại sản phẩm trước khi trả kết quả.
- Timeout API 18 giây, timeout phía frontend 27 giây và watchdog 30 giây để mở lại ô nhập, có bộ đếm thời gian. Không tự lặp request khi bị lỗi/quota.
- Hiển thị mã HTTP/mã trạng thái an toàn cho lỗi upstream chưa phân loại; không in key hoặc nguyên lỗi nhà cung cấp.
- Mỗi model/project vẫn chịu quota Gemini riêng; mặc định giới hạn ứng dụng 80 lần gọi/24h và 5 yêu cầu/phút/IP.

## File trong gói GitHub (12 file)

Gói này chứa toàn bộ phần AI cập nhật so với source bản thông báo đã giao, dùng được khi repository đã có bản thông báo hoặc AI cũ. Không chứa lại tất cả tính năng trước đó; dùng đúng nền source và so sánh nếu nhóm đã chỉnh cùng file. So với bản thông báo: thêm 6 file và sửa 6 file, không xóa file.

### File mới so với bản thông báo

- `app/Http/Controllers/Api/ProductAdvisorController.php`
- `app/Services/ProductAdvisor.php`
- `config/product_advisor.php`
- `resources/js/components/ProductAdvisor.jsx`
- `resources/js/components/ProductAdvisor.css`
- `tests/Feature/ProductAdvisorTest.php`

### File đã sửa so với bản thông báo

- `.env.example`
- `resources/js/app.jsx`
- `resources/js/services/api.js`
- `routes/api.php`
- `HUONG_DAN_CHAY.md`
- `UPDATE.md`

## Cấu hình chạy trên máy người dùng

Giữ nguyên database, Gmail và APP_KEY. Trong .env thật (không upload lên GitHub):

```dotenv
AI_ADVISOR_ENABLED=true
GEMINI_API_KEY="key_gemini_cua_ban"
GEMINI_MODEL=gemini-3.5-flash-lite
AI_ADVISOR_DAILY_CALL_LIMIT=80
```

```powershell
php artisan optimize:clear
```

Khởi động lại PHP và Vite/build giao diện. Không cần migration mới cho phần AI. Hướng dẫn từ đầu có trong HUONG_DAN_CHAY.md. Key chỉ đặt ở backend, không có biến VITE_GEMINI_API_KEY.

## Cách đưa lên GitHub

1. Giải nén electronics-store-gemini-github-update.zip.
2. Mở nhánh muốn cập nhật ở thư mục gốc repository → Add file → Upload files.
3. Kéo nội dung bên trong lên, giữ đúng app/, config/, resources/, routes/, tests/ và các file ở gốc. Không kéo cả thư mục bao bên ngoài hay upload nguyên ZIP.
4. Kiểm tra danh sách đúng 12 file. File .env.example chỉ là mẫu không có key; tuyệt đối không đưa .env thật lên.
5. Commit với nội dung dưới đây.

### Tiêu đề commit

```text
feat: thêm trợ lý chọn sản phẩm bằng Gemini Flash-Lite
```

### Mô tả commit

```text
- Tư vấn theo nhu cầu, ngân sách và sản phẩm còn hàng trong database.
- Dùng Gemini Flash-Lite, hỗ trợ xem chi tiết và thêm vào giỏ.
- Tối ưu một lần gọi API, cache 90 giây và xử lý timeout.
- Kiểm tra id, giá, tồn kho và thông số trước khi hiển thị.
- Bổ sung cấu hình mẫu, kiểm thử và hướng dẫn chạy.
```

## Kiểm tra

- 131 bài backend, 958 assertions: đạt; phần request Gemini dùng HTTP mock.
- 8 nhóm React/jsdom và build giao diện: đạt; còn cảnh báo Tailwind/bundle có sẵn.
- Người dùng đã kiểm tra yêu cầu sinh JSON nhỏ với Flash-Lite thành công, HTTP 200/STOP, 1,263 giây. Đây không phải benchmark tư vấn đầy đủ; không cam kết mọi lượt có cùng độ trễ.

Không đóng gói .env, key thật, vendor, node_modules, build, log hoặc các script chẩn đoán cục bộ. Không có thao tác upload/commit nào được thực hiện tự động.
