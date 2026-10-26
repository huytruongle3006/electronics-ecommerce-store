# Cách chạy TECHSTORE — bản thông báo trong website

## Cập nhật khi bạn đang dùng bản sổ địa chỉ đã sửa lỗi

1. Giải nén `electronics-store-notifications-update-only.zip`. Chép các file/thư mục bên trong vào đúng thư mục dự án có `artisan`, đồng ý thay thế file cũ. Gói này cần bản đã có tài khoản/Gmail, giỏ khách, kho, đổi trả, bảo hành, đánh giá và sổ địa chỉ. Nếu nhóm đã sửa thêm cùng file thì so sánh trước khi ghi đè.
2. Giữ nguyên `.env`, APP_KEY, database MySQL và Gmail đang chạy được. Không nhập lại SQL.
3. Mở Terminal trong VS Code tại thư mục có `artisan`, chạy từng lệnh:

```powershell
php artisan migrate --path=database/migrations/2026_10_26_140000_create_store_notifications_table.php
php artisan optimize:clear
```

Migration chỉ tạo bảng `store_notifications`. Chạy migration trước khi để admin cập nhật đơn hoặc hồ sơ.

4. Khởi động lại website, dùng hai terminal:

```powershell
php artisan serve
```

```powershell
npm.cmd run dev
```

Nếu dùng giao diện build thì chạy `npm.cmd run build` thay cho việc giữ Vite chạy. Nhấn Ctrl+F5 ở trình duyệt.

## Cách sử dụng thông báo

- Đăng nhập user, chuông thông báo xuất hiện cạnh giỏ hàng và tài khoản. Khách chưa đăng nhập không thấy chuông.
- Admin xác nhận/đổi trạng thái/hủy đơn sẽ tạo thông báo cho chủ đơn. Trạng thái cũ không đổi hoặc thao tác thất bại không sinh thông báo.
- Admin duyệt/từ chối/nhận hàng/ghi nhận hoàn tiền sẽ thông báo cho chủ đơn.
- Admin cấp serial, thay đổi trạng thái bảo hành hoặc tiếp nhận/từ chối/sửa chữa/sẵn sàng trả/đóng hồ sơ bảo hành sẽ thông báo cho user liên quan. Phiếu bảo hành cũ không gắn với đơn có chủ tài khoản không thể gửi cho user.
- Chuông cập nhật mỗi 20 giây khi tab đang hiển thị; khi quay lại tab/cửa sổ hoặc bấm mở chuông sẽ tải lại. Có thể bấm Tải lại để xem ngay. Không cần cài WebSocket, không cần worker hàng đợi.
- Bấm một thông báo để đánh dấu đã đọc và mở đúng đơn hoặc phiếu bảo hành. Đổi trả/hoàn tiền mở chi tiết đơn để xem phần yêu cầu. Phiếu bảo hành có nút Xem tất cả bảo hành để quay về danh sách.
- Đánh dấu tất cả đã đọc chỉ xử lý những thông báo có trước lần tải đang xem; thông báo mới đến sau đó vẫn chưa đọc.
- Thông báo lưu trong database, tải lại trang vẫn còn. Chỉ phát sinh từ thao tác admin sau khi cập nhật bản này, không gửi lại lịch sử cũ.

## Test bằng hai trình duyệt

1. Dùng Chrome đăng nhập user A, đặt một đơn COD và giữ trang đang mở.
2. Mở cửa sổ ẩn danh hoặc trình duyệt khác, đăng nhập admin.
3. Admin chuyển đơn của user A từ Chờ duyệt sang Đã xác nhận. Quay lại tab user: chuông tăng số chưa đọc trong khoảng 20 giây, hoặc bấm chuông/Tải lại.
4. Bấm thông báo. Đúng đơn phải mở ra và số chưa đọc giảm. Tải lại trang để kiểm tra trạng thái đã đọc được lưu.
5. Admin chuyển tiếp Đang giao rồi Hoàn tất. User nhận từng thông báo. Bấm Đánh dấu tất cả đã đọc để xóa số chưa đọc.
6. Đăng nhập user B: không thấy thông báo hay dữ liệu của user A.
7. Thử luồng đổi trả trên đơn đủ điều kiện, admin duyệt/từ chối hoặc ghi nhận hoàn tiền thực tế. Thử cấp serial và cập nhật hồ sơ bảo hành. Chuông phải mở đúng đơn/thiết bị.
8. Thử bấm lại cùng trạng thái ở admin: không tạo thêm thông báo trùng. Nếu mất mạng, chuông hiển thị lỗi và có nút Tải lại sau khi mạng phục hồi.

Không cần thay cấu hình Gmail vì đây là thông báo bên trong website. Nếu thấy lỗi thiếu bảng store_notifications, kiểm tra .env đang dùng DB_CONNECTION=mysql, chạy php artisan config:clear rồi chạy migration mới ở trên.

## Cài mới từ đầu

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-notifications-full.zip` vào một thư mục mới.

Trong VS Code chọn **File → Open Folder**, mở thư mục vừa giải nén. Bạn phải nhìn thấy `artisan`, `composer.json`, `package.json` và file hướng dẫn này ngay trong thư mục đang mở.

Chọn **Terminal → New Terminal**. Các lệnh bên dưới đều chạy ở thư mục có `artisan`. Chạy từng lệnh, chờ xong rồi mới chạy lệnh tiếp theo.

Máy cần có PHP từ 8.3, Composer, Node.js/npm và MySQL Server. Nếu bạn đã chạy được bản trước thì dùng tiếp các phần mềm đã cài.

## 2. Cài thư viện

```powershell
composer install
npm.cmd ci
```

Gói source không kèm `vendor` và `node_modules`; hai lệnh này sẽ cài chúng.

## 3. Chuẩn bị file .env

### Nếu bản cũ đã kết nối MySQL và gửi Gmail được

Copy file `.env` từ thư mục dự án cũ sang thư mục mới, cùng cấp với `artisan`.

Giữ nguyên APP_KEY, thông tin MySQL và Gmail. Không chạy lại lệnh tạo khóa khi đã dùng file `.env` cũ.

### Nếu cài mới, chưa có .env

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Mở `.env`, chỉnh cấu hình sau, thay mật khẩu bằng mật khẩu MySQL thật của bạn:

```dotenv
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=electronics_store
DB_USERNAME=root
DB_PASSWORD="mat_khau_mysql_cua_ban"

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

DB_DATABASE là tên database trong mục SCHEMAS của MySQL Workbench. Nếu tên của bạn khác, điền đúng tên đó. Nhấn Ctrl+S để lưu.

## 4. Chuẩn bị và kiểm tra database

### Nếu đã có database từ bản trước

Dùng tiếp database đó. Không nhập lại SQL, không xóa bảng.

### Chỉ khi chưa có database

Mở MySQL Workbench và kết nối MySQL Server. Tạo database bằng câu lệnh:

```sql
CREATE DATABASE IF NOT EXISTS electronics_store
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Nhấp đúp schema `electronics_store` để chọn làm mặc định. Chọn **File → Open SQL Script**, mở `database_backup/electronics_store.sql` trong dự án, rồi thực thi toàn bộ script vào database vừa tạo.

File SQL đi kèm là dữ liệu mẫu để cài mới; không dùng nó ghi đè database đang có dữ liệu của bạn.

### Kiểm tra kết nối trong terminal VS Code

```powershell
php artisan optimize:clear
php artisan db:show
```

Nếu hiện database và các bảng là kết nối được.

Chạy các migration bổ sung dưới đây. Cái nào đã chạy sẽ tự bỏ qua:

```powershell
php artisan migrate --path=database/migrations/2026_10_19_120000_create_return_requests_tables.php
php artisan migrate --path=database/migrations/2026_10_19_150000_create_warranty_service_tables.php
php artisan migrate --path=database/migrations/2026_10_19_180000_create_wishlist_items_table.php
php artisan migrate --path=database/migrations/2026_10_19_230000_create_guest_cart_merges_table.php
php artisan migrate --path=database/migrations/2026_10_26_100000_create_shipping_addresses_table.php
php artisan migrate --path=database/migrations/2026_10_26_140000_create_store_notifications_table.php
php artisan optimize:clear
```

Không chạy `migrate:fresh`, `composer run setup` hoặc toàn bộ migration gốc trên database đã nhập SQL. Nếu một migration báo bảng đã tồn tại nhưng chưa ghi nhận đã chạy, dừng kiểm tra, không xóa bảng có dữ liệu.

## 5. Gmail gửi email quên mật khẩu

Nếu đã copy `.env` cũ và Gmail đang gửi được, bỏ qua bước cấu hình và giữ nguyên thông tin đó.

Nếu chưa cấu hình:

1. Đăng nhập tài khoản Gmail dùng làm địa chỉ gửi của cửa hàng.
2. Bật Xác minh 2 bước trong Tài khoản Google.
3. Mở https://myaccount.google.com/apppasswords, tạo mật khẩu ứng dụng cho TECHSTORE.
4. Nhập mã 16 ký tự Google cấp vào `.env`, bỏ khoảng trắng phân nhóm. Không dùng mật khẩu đăng nhập Gmail thông thường.

Sửa các dòng MAIL đang có trong `.env`, không tạo thêm nhiều dòng trùng tên:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME="gmail_gui_thu_cua_ban@gmail.com"
MAIL_PASSWORD="ma_ung_dung_google_cap"
MAIL_FROM_ADDRESS="gmail_gui_thu_cua_ban@gmail.com"
MAIL_FROM_NAME="TECHSTORE"
MAIL_REQUIRE_TLS=true
MAIL_TIMEOUT=30
```

Thay các giá trị ví dụ bằng thông tin của bạn. MAIL_USERNAME và MAIL_FROM_ADDRESS dùng cùng Gmail gửi thư. Xóa dòng MAIL_URL cũ nếu có để tránh nó ghi đè cấu hình.

Lưu file rồi chạy:

```powershell
php artisan optimize:clear
php artisan techstore:mail-check
```

Lệnh này chỉ kiểm tra đủ trường, chưa gửi email. Để gửi thử thật, thay email nhận bên dưới bằng email bạn đang dùng:

```powershell
php artisan techstore:mail-check --send --to=email_nhan_cua_ban@gmail.com
```

Kiểm tra Hộp thư đến và Spam. Sau khi cấu hình thành công, website tự gửi email khi user dùng Quên mật khẩu; không cần chạy lệnh gửi thử mỗi lần.

User phải nhập email đã đăng ký trong database, tài khoản đang hoạt động. Nếu vừa yêu cầu, chờ ít nhất 60 giây trước khi yêu cầu lại. Khi APP_URL dùng localhost, mở liên kết email trên cùng máy đang chạy website.

Hướng dẫn Google: https://support.google.com/accounts/answer/185833?hl=vi.

Không gửi ảnh có mật khẩu ứng dụng, không đưa `.env` lên GitHub.

## 6. Khởi động website

Nếu bản cũ đang chạy `php artisan serve`, nhấn Ctrl+C ở terminal của bản cũ trước để tránh trùng cổng 8000.

Trong terminal thứ nhất của dự án mới:

```powershell
php artisan serve
```

Bấm dấu **+** trên thanh Terminal để mở terminal thứ hai, vẫn ở đúng thư mục có `package.json`:

```powershell
npm.cmd run dev
```

Giữ cả hai terminal chạy. Mở trình duyệt:

http://localhost:8000

Đây là địa chỉ website; không dùng địa chỉ cổng Vite làm trang chính. Nếu PHP báo chạy ở cổng khác, mở đúng địa chỉ PHP hiển thị và chỉnh APP_URL tương ứng.

Nhấn Ctrl+F5 để nạp giao diện mới. Menu tiện ích nằm trong nút tên/avatar; trong Đơn hàng của tôi, mở đơn đã xác nhận/đang giao/hoàn tất để thấy nút Đánh giá sản phẩm.

## 7. Những lần chạy sau

Không cần cài lại thư viện hoặc tạo lại `.env`. Chỉ mở đúng thư mục trong VS Code, chạy ở hai terminal:

```powershell
php artisan serve
```

```powershell
npm.cmd run dev
```

Nếu muốn dùng bản build thay vì giữ Vite chạy, thực hiện `npm.cmd run build`; dừng Vite và nếu còn file `public/hot` cũ thì xóa riêng file đó. Sau đó chỉ cần giữ `php artisan serve`.

## Khi gặp lỗi khởi động

- **Could not open input file: artisan** hoặc **không tìm thấy .env.example**: terminal đang ở sai thư mục. Mở lại thư mục có `artisan`.
- **Thiếu vendor/autoload.php**: chạy `composer install` và chờ hoàn tất.
- **MissingAppKeyException**: nếu cài mới và APP_KEY đang trống, chạy `php artisan key:generate`, sau đó `php artisan optimize:clear` và khởi động lại PHP.
- **Access denied / Unknown database / Connection refused**: kiểm tra MySQL Server đang chạy, tên database, tên đăng nhập, mật khẩu và cổng trong `.env`, rồi chạy `php artisan optimize:clear`.
- **Không tải được giao diện / Vite manifest not found**: chạy `npm.cmd ci`, rồi `npm.cmd run dev` ở terminal thứ hai.

