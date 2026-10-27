# Trung tâm hỗ trợ: user và admin nhắn tin trong website

So với bản lọc sản phẩm mới nhất; giữ các chức năng trước đây. Gói có thêm phụ thuộc để dùng trên nền admin đơn hàng/in phiếu trước bản lọc.

## Chức năng

- User tạo yêu cầu, tùy chọn gắn đơn của mình, nhắn tiếp và đọc phản hồi từ cửa hàng.
- Admin có mục Hỗ trợ khách hàng, xem/tìm/lọc/phân trang, trả lời và cập nhật trạng thái.
- Thông báo riêng khi khách gửi cho admin active, admin trả lời cho chủ yêu cầu và khi cập nhật trạng thái; chuông mở đúng hội thoại.
- Hội thoại polling 5 giây khi tab hiển thị, danh sách 8 giây; hỗ trợ tải 30 tin cũ/tin mới theo cursor không bỏ khoảng giữa.
- Chưa đọc theo phía khách/admin; admin dùng chung hộp thư và dấu đã đọc. Đọc không đổi thứ tự inbox/version.
- UUID và receipt trên server chống gửi trùng khi mất phản hồi. Pending lưu sessionStorage theo tài khoản/vai trò/hội thoại; giữ UUID qua retry, giới hạn tốc độ hoặc hết phiên.
- Phân quyền server, nội dung dạng chữ, không attachments/WebSocket/email. Không xóa lịch sử. Các cập nhật/notification cùng transaction.

## File mới (9)

- database/migrations/2026_10_27_150000_create_support_conversations_tables.php
- app/Models/SupportThread.php
- app/Models/SupportMessage.php
- app/Http/Controllers/Api/SupportController.php
- resources/js/hooks/useSupportMutation.js
- resources/js/components/SupportCenter.jsx
- resources/js/components/SupportConversation.jsx
- resources/js/components/SupportCenter.css
- tests/Feature/SupportConversationTest.php

## File sửa (8)

- app/Services/StoreNotifier.php
- resources/js/app.jsx
- resources/js/components/AdminDashboard.jsx
- resources/js/components/Navbar.jsx
- resources/js/services/api.js
- routes/api.php
- HUONG_DAN_CHAY.md
- UPDATE.md

## Phụ thuộc kèm lại, không đổi so với bản lọc (5)

- resources/js/hooks/useProductCatalog.js
- resources/js/components/ProductFilters.jsx
- resources/js/components/FilterBar.jsx
- app/Http/Controllers/Api/ProductController.php
- tests/Feature/ProductFiltersTest.php

## Migration và chạy

```powershell
php artisan migrate --path=database/migrations/2026_10_27_150000_create_support_conversations_tables.php
php artisan optimize:clear
```

Giữ .env/APP_KEY/database. Khởi động lại PHP/Vite hoặc build rồi Ctrl+F5. Không nhập SQL hoặc migrate:fresh. Không cần key AI, SMTP, WebSocket hay worker để chat. Nền cần bảng store_notifications đã có từ bản thông báo.

## Validation

206 backend tests / 1534 assertions, 9 nhóm React/jsdom mới và production build đạt. Có kiểm tra quyền, order ownership, idempotency, chưa đọc, phân trang/cursor, status conflict, rollback notification và tách rate limit đọc/gửi. Chưa kiểm tra MySQL/browser máy người dùng. Cảnh báo Tailwind/bundle cũ còn tồn tại.

## Commit GitHub

```text
feat: thêm nhắn tin hỗ trợ giữa khách hàng và admin
```

Mô tả:

```text
- Tạo yêu cầu hỗ trợ gắn đơn, nhắn tin hai chiều và theo dõi trạng thái.
- Thêm hộp thư admin, chưa đọc và thông báo mở đúng hội thoại.
- Tự tải tin mới, tải lịch sử, chống gửi trùng khi thử lại sau mất mạng.
- Kiểm tra quyền riêng tư, bổ sung migration, kiểm thử và hướng dẫn.
```
