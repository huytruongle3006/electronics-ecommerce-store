# Cập nhật sổ địa chỉ giao hàng — 26/10/2026

## Chức năng đã bổ sung

- Sổ địa chỉ riêng cho mỗi tài khoản: thêm, sửa, xóa, đặt mặc định; tối đa 20 địa chỉ.
- Tên gợi nhớ, tên người nhận, điện thoại và địa chỉ đầy đủ dạng văn bản; không tích hợp danh mục hành chính hay kiểm chứng địa chỉ tự động.
- Địa chỉ đầu tiên là mặc định. Khi xóa mặc định, tự chọn địa chỉ còn lại được lưu sớm nhất.
- Thanh toán tự chọn địa chỉ mặc định; cho phép đổi địa chỉ, quản lý sổ địa chỉ tại checkout, hoặc nhập địa chỉ dùng một lần.
- Backend xác minh quyền sở hữu địa chỉ, lấy thông tin từ database và sao chép vào đơn hàng. Sửa/xóa địa chỉ về sau không sửa đơn cũ.
- Giữ tương thích đặt hàng bằng thông tin nhập thủ công và trường địa chỉ hồ sơ cũ. Không tự chuyển địa chỉ hồ sơ thành bản ghi sổ địa chỉ.
- Khóa thao tác theo tài khoản khi thay đổi sổ địa chỉ để bảo vệ địa chỉ mặc định và giới hạn số lượng.

## Phạm vi gói cập nhật

So với bản source sạch đã giao trước đó (menu/giỏ khách/Gmail/đánh giá/đổi trả/bảo hành/kho), lần này thêm **5 file**, sửa **7 file** (gồm hướng dẫn), không xóa file nào. File UPDATE.md này là tài liệu bổ sung ngoài các số đếm đó.

Gói update-only chỉ chứa thay đổi sổ địa chỉ, cần áp dụng trên bản trước đó. Nếu GitHub mới chỉ có code gốc ban đầu thì dùng source đầy đủ; gói này không chứa lại toàn bộ những chức năng cũ.

### File mới

- `app/Http/Controllers/Api/ShippingAddressController.php`
- `app/Models/ShippingAddress.php`
- `database/migrations/2026_10_26_100000_create_shipping_addresses_table.php`
- `resources/js/components/AddressBook.jsx`
- `tests/Feature/ShippingAddressTest.php`

### File đã sửa

- `app/Http/Controllers/Api/OrderController.php`
- `resources/js/app.jsx`
- `resources/js/components/AccountModal.jsx`
- `resources/js/components/CheckoutModal.jsx`
- `resources/js/services/api.js`
- `routes/api.php`
- `HUONG_DAN_CHAY.md`

## Database và cách chạy

Giữ nguyên .env và database đang có, không nhập lại SQL. Chỉ chạy migration bổ sung:

```powershell
php artisan migrate --path=database/migrations/2026_10_26_100000_create_shipping_addresses_table.php
php artisan optimize:clear
```

Sau đó khởi động lại PHP và chạy giao diện (npm.cmd run dev hoặc npm.cmd run build). Chi tiết cài mới/cập nhật và kịch bản test nằm trong HUONG_DAN_CHAY.md.

## Đưa lên GitHub

Giải nén update-only, vào thư mục gốc repository → Add file → Upload files, kéo các file/thư mục bên trong lên, giữ đúng đường dẫn app/, resources/, routes/, database/, tests/ và hai file Markdown ở gốc. Không upload nguyên file ZIP. Kiểm tra các file trước khi commit, nhất là khi nhóm đã sửa cùng file.

Commit đề xuất:

```text
feat: thêm sổ địa chỉ giao hàng và chọn địa chỉ khi đặt hàng
```

Mô tả:

```text
- Thêm quản lý nhiều địa chỉ và địa chỉ mặc định cho user.
- Chọn địa chỉ đã lưu hoặc nhập địa chỉ khác khi checkout.
- Kiểm tra quyền sở hữu và giữ nguyên địa chỉ trên đơn đã đặt.
- Bổ sung migration, kiểm thử và hướng dẫn chạy.
```

Không đưa .env, thông tin Gmail, vendor/, node_modules/, build/cache/log lên GitHub. Source đầy đủ không đóng gói các dữ liệu này.

## Kiểm tra đã thực hiện

- 95 bài kiểm thử backend, 770 assertions: đạt; dùng SQLite tách biệt, không truy cập database của bạn.
- 7 kịch bản giao diện qua React/jsdom: CRUD và xác nhận xóa, lỗi validation, đổi mặc định, chọn địa chỉ khi checkout, nhập thủ công, quản lý ngay tại checkout, tải lỗi/thử lại và tab tài khoản: đạt.
- Build giao diện: đạt. Còn cảnh báo Tailwind từ cấu hình có sẵn và cảnh báo kích thước bundle, không chặn build.
- Chưa kiểm tra trên MySQL/Gmail thực tế của máy bạn; chức năng mới không thay cấu hình gửi mail.


## Sua loi sau khi luu dia chi tai checkout

Tu chon dia chi vua them/sua va khoa cac o ten, dien thoai, dia chi giao hang. Lua chon nhap dia chi khac van mo lai cac o. Da kiem thu them tinh huong dia chi dau tien, dia chi tiep theo va chinh sua dia chi trong checkout. Khong them migration so voi ban so dia chi truoc.
