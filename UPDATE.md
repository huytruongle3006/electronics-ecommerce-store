# Cập nhật thông báo trong website

## Chức năng mới

- Chuông thông báo riêng theo tài khoản, số chưa đọc, danh sách phân trang 15 dòng, thời gian và trạng thái đã đọc.
- Admin cập nhật đơn: xác nhận, đang giao, hoàn tất, hủy → chủ đơn nhận thông báo.
- Admin xử lý đổi trả/hoàn tiền: duyệt, từ chối, nhận lại hàng, xác nhận đã hoàn tiền → chủ đơn nhận thông báo.
- Admin cấp/cập nhật phiếu bảo hành hoặc xử lý hồ sơ bảo hành → user liên quan nhận thông báo.
- Bấm thông báo mở chính xác đơn/phiếu bảo hành với kiểm tra quyền ở backend. Đánh dấu tất cả đã đọc không đánh dấu nhầm thông báo vừa đến sau lần tải.
- Kiểm tra cập nhật mỗi 20 giây khi tab hiển thị; tải lại khi trở lại cửa sổ hoặc mở chuông; có xử lý lỗi/thử lại.
- Lưu thông báo cùng transaction nghiệp vụ, không phát sinh nếu transaction thất bại. Cập nhật lặp cùng trạng thái không tạo trùng; bỏ phản hồi cũ sau khi đổi tài khoản.
- Không gửi lại lịch sử cũ, không có thông báo đẩy khi đóng website. Không yêu cầu WebSocket, SMTP hay queue worker cho chức năng này.

## Các file thay đổi

So với bản sổ địa chỉ đã sửa lỗi: thêm 7 file, sửa 12 file (gồm hướng dẫn và UPDATE.md), không xóa file nào. Gói update-only chỉ chứa các file bên dưới. Những chức năng đã làm trước vẫn có trong source đầy đủ.

### File mới

- `app/Http/Controllers/Api/NotificationController.php`
- `app/Models/StoreNotification.php`
- `app/Services/StoreNotifier.php`
- `database/migrations/2026_10_26_140000_create_store_notifications_table.php`
- `resources/js/components/NotificationBell.jsx`
- `resources/js/components/NotificationBell.css`
- `tests/Feature/StoreNotificationTest.php`

### File sửa

- `app/Http/Controllers/Api/AdminController.php`
- `app/Http/Controllers/Api/ReturnRequestController.php`
- `app/Http/Controllers/Api/WarrantyManagementController.php`
- `resources/js/app.jsx`
- `resources/js/components/Navbar.jsx`
- `resources/js/components/MyOrdersModal.jsx`
- `resources/js/components/WarrantyModal.jsx`
- `resources/js/services/api.js`
- `routes/api.php`
- `tests/Support/AccountTestCase.php`
- `HUONG_DAN_CHAY.md`
- `UPDATE.md`

## Áp dụng

Giải nén update-only vào dự án bản sổ địa chỉ, giữ đúng đường dẫn, giữ nguyên .env và database. Nếu code nhóm đã sửa cùng file, so sánh trước khi ghi đè.

```powershell
php artisan migrate --path=database/migrations/2026_10_26_140000_create_store_notifications_table.php
php artisan optimize:clear
```

Sau đó khởi động lại PHP và Vite hoặc build lại frontend. Hướng dẫn cài mới và cách test hai trình duyệt: HUONG_DAN_CHAY.md.

## Đưa lên GitHub

Giải nén gói update-only, vào gốc repository → Add file → Upload files, đưa nội dung bên trong lên, giữ đúng đường dẫn. Không upload nguyên ZIP, .env, vendor/, node_modules/, build, cache hoặc log.

Commit:

```text
feat: thêm thông báo cho user khi admin cập nhật đơn và hồ sơ
```

Mô tả:

```text
- Thêm chuông và số thông báo chưa đọc cho từng tài khoản.
- Gửi thông báo khi admin cập nhật đơn, đổi trả/hoàn tiền và bảo hành.
- Mở đúng đơn hoặc thiết bị từ thông báo; đánh dấu từng mục/tất cả đã đọc.
- Bổ sung migration, kiểm thử quyền truy cập và hướng dẫn chạy.
```

## Kiểm thử

- 104 bài kiểm thử backend, 846 assertions: đạt trên SQLite tách biệt, không dùng database thật của bạn.
- 7 nhóm kiểm thử React/jsdom: danh sách trống, polling, số chưa đọc, đánh dấu, lỗi/thử lại, phân trang, phản hồi tài khoản cũ, tạm dừng tab ẩn, mở đúng đơn/bảo hành và hiển thị chuông theo đăng nhập: đạt.
- Build giao diện: đạt, còn cảnh báo Tailwind/kích thước bundle có sẵn.
- Chưa kiểm thử trên MySQL thực tế ở máy bạn. Cấu hình Gmail không thay đổi.
