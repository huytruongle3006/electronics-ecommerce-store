# Cập nhật mã giảm giá cho khách hàng

So với bản mua lại đơn cũ + đã xem gần đây đã sửa lỗi React key.

## Chức năng

- Menu tài khoản xem/sao chép các mã đang phát hành từ database, hiển thị điều kiện và phân trang.
- Checkout chọn hoặc nhập mã, áp dụng, bỏ mã và xem tiền giảm/tổng thanh toán theo giỏ trên server.
- Kiểm tra hiệu lực, đơn tối thiểu, số lượt chung và giới hạn mỗi tài khoản. Mỗi đơn một mã, không giữ lượt khi xem trước.
- Checkout khóa user/cart/product/voucher, tính tiền theo đơn vị nhỏ nhất; không tin tiền giảm hoặc tạm tính từ client. Bản xem trước có chữ ký gắn user, giỏ và điều kiện mã; dữ liệu đổi phải áp dụng lại.
- Tạo đơn/thanh toán/chi tiết/trừ kho/trừ lượt/xóa giỏ cùng transaction; lỗi lưu hoàn tác toàn bộ. Thanh toán giữ luồng hiện có của dự án.
- Hủy đơn qua luồng hiện có hoàn lượt chung đúng một lần; số đơn chưa hủy xác định lượt cá nhân, bao gồm đơn từ các bản cũ. Đổi trả/hoàn tiền không tự hoàn lượt.
- Admin quản lý giới hạn mỗi tài khoản, ngày/giờ hết hạn, chuẩn hóa mã và không xóa mã đã có đơn sử dụng.
- Giữ bản sửa lỗi lặp mục đã xem gần đây và toàn bộ chức năng trước đó.

## File mới (5)

- app/Http/Controllers/Api/CustomerVoucherController.php
- app/Services/CustomerVoucher.php
- database/migrations/2026_10_26_180000_add_per_user_limit_to_vouchers.php
- resources/js/components/CustomerVouchers.jsx
- tests/Feature/CustomerVoucherTest.php

## File sửa (11)

- app/Http/Controllers/Api/AdminController.php
- app/Http/Controllers/Api/OrderController.php
- app/Models/Voucher.php
- resources/js/app.jsx
- resources/js/components/CheckoutModal.jsx
- resources/js/components/Navbar.jsx
- resources/js/components/VoucherManagement.jsx
- resources/js/services/api.js
- routes/api.php
- HUONG_DAN_CHAY.md
- UPDATE.md

## Migration

```powershell
php artisan migrate --path=database/migrations/2026_10_26_180000_add_per_user_limit_to_vouchers.php
php artisan optimize:clear
```

Giữ .env, database và APP_KEY. Migration thêm per_user_limit mặc định 1 cho mã cũ/mới; các đơn cũ chưa hủy vẫn tính lượt. Admin điều chỉnh nếu cần. Khởi động lại Vite hoặc build rồi tải lại toàn bộ trang. Không nhập lại SQL/migrate:fresh.

## Validation

156 bài backend / 1132 assertions đạt trên SQLite riêng; 7 nhóm frontend React/jsdom mới đạt; production build đạt. Chưa test MySQL/browser thực tế của người dùng. Cảnh báo Tailwind/bundle cũ còn tồn tại.

## Commit GitHub

Tiêu đề:

```text
feat: thêm mã giảm giá cho khách hàng và áp dụng tại checkout
```

Mô tả:

```text
- Xem danh sách mã và điều kiện trong menu tài khoản.
- Áp dụng/bỏ mã, hiển thị tiền giảm và tổng thanh toán.
- Kiểm tra hạn, lượt dùng và giới hạn mỗi tài khoản trên server.
- Hoàn lượt khi hủy đơn, giữ lịch sử mã đã được sử dụng.
- Bổ sung migration, kiểm thử và hướng dẫn chạy.
```
