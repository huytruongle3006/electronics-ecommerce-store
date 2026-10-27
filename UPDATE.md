# Hoàn thiện đơn hàng admin, chi tiết và in phiếu

## Vấn đề và kết quả

Tab Đơn hàng của AdminDashboard dùng bảng cũ, không nối tới OrderManagement có chức năng in. Đã thay bằng một màn hình quản lý dùng chung: in ngay trên dòng đơn, chi tiết từ server, tìm/lọc/phân trang và xử lý đơn trong chi tiết. Mã đơn ở Tổng quan có thể bấm để mở chi tiết.

## Bổ sung

- Chi tiết: tài khoản, người nhận/địa chỉ, ghi chú, sản phẩm/giá đã đặt, voucher/tiền giảm/tổng, thanh toán/phiếu thu, vận chuyển và lịch sử kèm người xử lý.
- API admin chi tiết riêng; tìm theo mã/tên/SĐT/email/vận đơn, lọc trạng thái thanh toán/ngày Việt Nam; phân trang 15 dòng và sắp xếp ổn định.
- Xác nhận trước khi đổi trạng thái, hủy có lý do; gửi expected_status để chặn ghi đè trạng thái mới.
- Giữ quản lý giao hàng/thông báo, thu COD và in phiếu/lưu PDF; lỗi có thể tải lại, phản hồi danh sách cũ không ghi đè kết quả mới.
- Không có migration mới. Giữ toàn bộ tính năng khách và dữ liệu cũ.

## File mới (3)

- resources/js/components/AdminOrdersPage.jsx
- resources/js/components/AdminOrderDetail.jsx
- tests/Feature/AdminOrdersTest.php

## File sửa so với nền in phiếu (9)

- app/Http/Controllers/Api/AdminController.php
- resources/js/components/AdminDashboard.jsx
- resources/js/components/ConfirmCodPayment.jsx
- resources/js/components/OrderManagement.jsx
- resources/js/components/OrderPrintButton.jsx
- resources/js/services/api.js
- routes/api.php
- HUONG_DAN_CHAY.md
- UPDATE.md

## File hỗ trợ in kèm lại, không đổi so với nền in phiếu (5)

- bootstrap/app.php
- app/Http/Controllers/Api/OrderPrintController.php
- resources/views/orders/print.blade.php
- tests/Feature/OrderPrintTest.php
- resources/js/components/MyOrdersModal.jsx

Tổng gói update 17 file, đường dẫn gốc repository. Không upload ZIP hoặc .env/thư viện/build/log.

## Chạy sau cập nhật

Giữ nguyên .env, APP_KEY và MySQL. Chép file, chạy php artisan optimize:clear, khởi động lại Vite/PHP hoặc build rồi Ctrl+F5. Không cần migration mới; nền phải đã có các migration giao hàng/voucher trước đây.

## Validation

183 backend tests / 1346 assertions và 9 nhóm React/jsdom mới đạt. Kiểm thử giao diện đi từ tab Đơn hàng thật của AdminDashboard, xác nhận có nút in và chi tiết hoạt động. Production build đạt; cảnh báo Tailwind/bundle cũ còn tồn tại. Chưa test MySQL/browser máy người dùng.

## Commit GitHub

```text
fix: nối đúng trang đơn hàng admin, thêm chi tiết và in phiếu
```

Mô tả:

```text
- Thay bảng đơn cũ trong dashboard bằng màn hình quản lý đầy đủ.
- Thêm in phiếu tại danh sách và chi tiết, mở đơn từ Tổng quan.
- Hiển thị khách hàng, sản phẩm, tiền giảm, thanh toán, vận chuyển và lịch sử.
- Thêm tìm/lọc/phân trang, xác nhận đổi trạng thái và kiểm tra xung đột.
- Giữ thu COD, thông báo và các chức năng trước đó; bổ sung kiểm thử.
```

## Sửa menu admin khi cuộn

Menu trái dùng sticky ở đỉnh cửa sổ, giới hạn chiều cao theo viewport. Danh mục cuộn riêng trên màn hình thấp, tiêu đề và nút Về Cửa Hàng được giữ trong khung. Chỉ sửa code AdminDashboard.jsx, không có migration. Khởi động lại Vite/build và Ctrl+F5 sau cập nhật. Build đạt; cần kiểm tra cuộn trên trình duyệt máy bạn.

