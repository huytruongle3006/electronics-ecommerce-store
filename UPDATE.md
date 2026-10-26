# Cập nhật quản lý giao hàng và thông báo

So với bản mã giảm giá khách hàng mới nhất. Giữ toàn bộ tính năng trước đó.

## Chức năng

- Admin nhập/sửa đơn vị vận chuyển, mã vận đơn, ngày giao dự kiến cho đơn đã xác nhận/đang giao.
- Khách xem thông tin trong chi tiết đơn; bấm Đã nhận hàng qua bước xác nhận khi đơn đang giao.
- Ghi thời điểm bắt đầu giao, giao thành công và khách xác nhận riêng biệt; admin hoàn tất không giả lập khách đã xác nhận.
- Thông báo riêng cho chủ đơn khi thêm/sửa vận chuyển, bắt đầu giao, hoàn tất và xác nhận nhận hàng. Bấm thông báo mở đúng đơn.
- Khóa dòng đơn trong transaction, kiểm tra phiên bản sửa vận chuyển, retry không tạo trùng lịch sử/thông báo. Lỗi thông báo hoàn tác thay đổi đơn.
- Không đổi thanh toán/COD, không trừ kho lần nữa, không thay lượt voucher. delivered_at là mốc hoàn tất nếu đã có; đơn cũ giữ fallback lịch sử.
- Tương thích đơn cũ chưa có vận đơn/thời gian. Thông tin do admin nhập, chưa tích hợp API hãng vận chuyển, email hoặc push.

## File mới (4)

- app/Http/Controllers/Api/OrderDeliveryController.php
- database/migrations/2026_10_27_100000_add_delivery_fields_to_orders.php
- resources/js/components/OrderDelivery.jsx
- tests/Feature/OrderDeliveryTest.php

## File sửa (11)

- app/Http/Controllers/Api/AdminController.php
- app/Models/Order.php
- app/Services/StoreNotifier.php
- resources/js/components/MyOrdersModal.jsx
- resources/js/components/OrderManagement.jsx
- resources/js/services/api.js
- routes/api.php
- tests/Feature/WarrantyWorkflowTest.php
- tests/Support/OrderTestCase.php
- HUONG_DAN_CHAY.md
- UPDATE.md

tests/Support/OrderTestCase.php bổ sung schema giao hàng cho các kiểm thử; WarrantyWorkflowTest.php dùng đúng ngày theo múi giờ bảo hành khi kiểm tra hết hạn cuối ngày.

## Chạy sau khi cập nhật

```powershell
php artisan migrate --path=database/migrations/2026_10_27_100000_add_delivery_fields_to_orders.php
php artisan optimize:clear
```

Giữ .env, APP_KEY và database. Khởi động lại Vite/PHP hoặc build rồi tải lại toàn bộ trang. Không nhập lại SQL/migrate:fresh. Cột mới nullable, không bịa thời điểm giao của các đơn cũ.

## Kiểm thử

167 backend tests / 1225 assertions, 6 nhóm React/jsdom mới và production build đạt. Backend chạy SQLite riêng, chưa kiểm tra MySQL/browser máy bạn. Cảnh báo Tailwind/bundle cũ vẫn có.

## Commit GitHub

Tiêu đề:

```text
feat: thêm quản lý giao hàng và thông báo cho khách
```

Mô tả:

```text
- Admin cập nhật đơn vị vận chuyển, mã vận đơn và ngày giao dự kiến.
- User xem thông tin và xác nhận đã nhận hàng khi đơn đang giao.
- Lưu thời gian giao thành công, gửi thông báo trong website tới chủ đơn.
- Chống cập nhật trùng/xung đột, bổ sung migration và kiểm thử.
```
