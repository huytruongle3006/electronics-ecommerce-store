# Thêm mua lại đơn cũ và sản phẩm đã xem gần đây

## Chức năng

- Mua lại từ chi tiết đơn của chính user, xem trước giá/tồn kho hiện tại, chọn món và giảm số lượng khi cần.
- Tính cả số lượng có sẵn trong giỏ; báo hết hàng, ngừng bán, đã xóa hoặc không đủ số lượng.
- Kiểm tra lại giá và tồn kho khi xác nhận. Toàn bộ lần thêm rollback nếu một dòng không còn hợp lệ.
- Mã UUID và biên nhận server chống cộng trùng khi gửi lại cùng yêu cầu sau mất mạng. Dữ liệu yêu cầu chờ lưu trong sessionStorage theo tài khoản/đơn.
- Chỉ thêm vào giỏ, không tạo đơn/thanh toán, không thay đổi đơn cũ hay trừ kho, không áp lại voucher/địa chỉ cũ.
- Sản phẩm đã xem gần đây: 12 mục, mới nhất trước, không trùng, tách riêng khách và từng tài khoản trên cùng trình duyệt.
- Chỉ lưu id/thời gian tại localStorage. Server trả dữ liệu sản phẩm công khai hiện tại; mục ngừng bán/đã xóa là placeholder có thể bỏ.
- Có mở chi tiết, thêm giỏ theo dữ liệu mới nhất, xóa từng mục hoặc xóa bucket hiện tại với xác nhận. Không đọc lịch sử giữa các thiết bị và không gửi lịch sử sang AI.

## File thay đổi so với bản Gemini Flash-Lite mới nhất

Thêm 7 file, sửa 8 file, không xóa file nào.

### File mới

- `app/Http/Controllers/Api/OrderRebuyController.php`
- `app/Http/Controllers/Api/RecentlyViewedController.php`
- `database/migrations/2026_10_26_160000_create_order_rebuy_batches_table.php`
- `resources/js/components/RebuyPanel.jsx`
- `resources/js/components/RecentlyViewed.jsx`
- `resources/js/hooks/useRecentlyViewed.js`
- `tests/Feature/RebuyRecentTest.php`

### File sửa

- `resources/js/app.jsx`
- `resources/js/components/MyOrdersModal.jsx`
- `resources/js/components/ProductDetailModal.jsx`
- `resources/js/hooks/useStoreCart.js`
- `resources/js/services/api.js`
- `routes/api.php`
- `HUONG_DAN_CHAY.md`
- `UPDATE.md`

## Cập nhật database

Giữ nguyên .env/MySQL/Gmail/Gemini/APP_KEY. Chạy:

```powershell
php artisan migrate --path=database/migrations/2026_10_26_160000_create_order_rebuy_batches_table.php
php artisan optimize:clear
```

Khởi động lại PHP và Vite hoặc build lại. Không nhập lại SQL, không chạy migrate:fresh. Chi tiết cài mới/cập nhật/test trong HUONG_DAN_CHAY.md.

## Kiểm thử

- 142 bài backend, 1020 assertions: đạt, gồm 11 bài mới cho hai chức năng; dùng SQLite riêng, không truy cập database của bạn.
- 7 nhóm React/jsdom mới: đạt, gồm đồng bộ giỏ, retry sau mất mạng, giá thay đổi, giới hạn lịch sử, tách tài khoản, xóa, lỗi/thử lại và phản hồi cũ sau đổi tài khoản.
- Build giao diện đạt; còn cảnh báo Tailwind/bundle có sẵn. Chưa test MySQL và browser thực tế trên máy người dùng.

## Up GitHub

Giải nén update-only, upload nội dung vào đúng đường dẫn repository trên nền Gemini Flash-Lite hiện tại. So sánh nếu nhóm đã chỉnh thêm cùng file. Không upload nguyên ZIP, .env, vendor, node_modules, build, log hoặc script chẩn đoán.

### Tiêu đề commit

```text
feat: thêm mua lại đơn cũ và sản phẩm đã xem gần đây
```

### Mô tả

```text
- Mua lại từ đơn của user theo giá và tồn kho hiện tại.
- Xem trước, chọn số lượng và chống thêm trùng khi gửi lại yêu cầu.
- Lưu 12 sản phẩm đã xem, tách theo tài khoản và hỗ trợ xóa lịch sử.
- Bổ sung migration, kiểm thử và hướng dẫn chạy.
```

## Bản sửa lỗi lặp mục đã xem

Đã tách key React riêng cho từng component cùng cấp trong app.jsx để tránh nhân đôi mục đã xem khi trang cập nhật. Sau khi chép bản sửa, khởi động lại Vite hoặc build lại, đóng tab cũ rồi mở lại và Ctrl+F5. Không cần xóa lịch sử, sửa .env hoặc migration bổ sung. Kiểm thử App qua 5 vòng modal, đổi tài khoản và xóa lịch sử đều đạt, không có cảnh báo key trùng.

