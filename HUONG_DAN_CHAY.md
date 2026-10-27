# TECHSTORE — Hoàn thiện quản lý đơn hàng admin và in phiếu

## Cập nhật bản đang chạy

Gói update-only dùng cho nền quản lý giao hàng hoặc nền in phiếu đơn hàng đã giao trước đó. Bản đầy đủ có toàn bộ các chức năng trước đây.

1. Dừng Vite bằng Ctrl+C. Giải nén electronics-store-admin-orders-update-only.zip và chép nội dung vào gốc dự án có artisan. Giữ đúng đường dẫn, thay file cũ; nếu nhóm đã sửa cùng file, đối chiếu trước khi chép.
2. Giữ nguyên .env, APP_KEY, MySQL, Gmail và Gemini. Không nhập lại SQL và không tạo lại khóa.
3. Chạy:

```powershell
php artisan optimize:clear
```

4. Khởi động lại php artisan serve nếu đang chạy. Mở terminal khác chạy npm.cmd run dev, hoặc chạy npm.cmd run build khi dùng giao diện build. Đóng tab cũ rồi mở lại http://localhost:8000 và Ctrl+F5.

Bản cập nhật này không có migration mới hoặc package mới. Nền dự án cần đã có migration giao hàng 2026_10_27_100000_add_delivery_fields_to_orders.php. Nếu chưa có, xem phần cài mới bên dưới; không chạy migrate:fresh trên dữ liệu đang dùng.

## Lỗi cũ đã sửa

AdminDashboard trước đây tự hiển thị một bảng đơn hàng cũ, không sử dụng OrderManagement đã có nút in/chi tiết. Đã bỏ bảng trùng đó và nối tab Đơn hàng tới đúng màn hình quản lý mới. Kiểm thử mới đi từ AdminDashboard thực tế, không chỉ kiểm tra component riêng.

## Cách dùng

### Danh sách đơn hàng

- Đăng nhập admin → Đơn hàng. Mỗi dòng có nút Chi tiết đơn và In phiếu nhìn thấy ngay trong cột Thao tác.
- Tìm theo mã đơn, tên người nhận, điện thoại, email/tên tài khoản hoặc mã vận đơn. Bấm Áp dụng bộ lọc.
- Lọc trạng thái đơn, trạng thái thanh toán, ngày đặt từ/đến theo ngày Việt Nam. Có phân trang Trước/Sau, làm mới và xóa bộ lọc.
- Khi lỗi mạng có thông báo và nút thử lại; kết quả tải cũ không ghi đè kết quả bộ lọc mới.
- Tại Tổng quan, bấm mã trong Đơn Hàng Mới Nhận cũng mở đúng chi tiết đơn.

### Chi tiết đơn hàng

- Nút Chi tiết đơn tải dữ liệu mới từ server theo id, không chỉ dùng lại bản trong danh sách.
- Có tài khoản đặt hàng, email/điện thoại tài khoản, người nhận, số điện thoại, địa chỉ và ghi chú riêng.
- Có sản phẩm, mã sản phẩm, số lượng, đơn giá đã đặt, thành tiền đã lưu; sản phẩm đã gỡ có dòng thay thế.
- Có tạm tính, giảm giá, mã voucher và tổng thanh toán. Không tính lại theo giá danh mục hiện tại.
- Có phương thức/trạng thái thanh toán, số tiền bản ghi, mã giao dịch hoặc phiếu thu và thời gian thanh toán.
- Có quản lý vận chuyển: đơn vị, mã vận đơn, ngày dự kiến, giờ giao/xác nhận; giữ luồng gửi thông báo cho khách đang có.
- Có lịch sử theo thời gian/id, người xử lý và ghi chú; tài khoản xử lý đã gỡ có mã id thay thế.
- Có nút In phiếu / Lưu PDF ngay trên đầu chi tiết, nút tải lại và đóng; giao diện có vùng cuộn khi đơn nhiều dòng.

### Xử lý trạng thái và COD

- Chỉ hiển thị bước chuyển hợp lệ: chờ duyệt → xác nhận/hủy; xác nhận → đang giao/hủy; đang giao → hoàn tất. Đơn đã hủy/hoàn tất không được mở lại.
- Chọn trạng thái mới rồi bấm Xác nhận cập nhật trạng thái. Hủy đơn cần nhập lý do, tối đa 200 ký tự, được ghi trong lịch sử.
- UI gửi trạng thái đang xem để kiểm tra xung đột. Nếu admin/khách đã cập nhật trước đó, hệ thống từ chối và yêu cầu Tải lại chi tiết, không ghi đè kết quả mới.
- Trong lúc gửi, khóa thao tác/đóng hộp thoại liên quan. Nếu mất mạng hoặc chưa biết kết quả, tải lại chi tiết trước khi xử lý lần nữa.
- Đơn completed + COD pending có nút Xác nhận đã thu COD trong phần Thanh toán. Nhập mã phiếu thu và xác nhận đã thu đủ tiền thực tế. Sau thành công, chi tiết tải lại trạng thái và mã phiếu thu.
- Chuyển Hoàn tất không tự đánh dấu đã thu COD. Hủy đơn/hoàn tiền và thông báo vẫn theo luồng nghiệp vụ hiện có.

## In phiếu / lưu PDF

1. Bấm In phiếu trên dòng đơn hoặc In phiếu / Lưu PDF trong chi tiết.
2. Tab mới tải phiếu; bấm In / Lưu PDF ở trang phiếu.
3. Trong hộp thoại in của trình duyệt, chọn máy in hoặc Lưu dưới dạng PDF, khổ A4. Có thể tắt đầu/chân trang của trình duyệt.
4. Nếu bị chặn popup, cho phép cửa sổ bật lên cho địa chỉ website rồi bấm lại.

Gói đã kèm controller, template và các file hỗ trợ in để tránh thiếu file khi cập nhật từ nền giao hàng. Phiếu là thông tin đơn hàng, không thay hóa đơn điện tử hoặc biên nhận thu tiền. PDF được lưu qua hộp thoại in, không tải file PDF tự động từ server. Quyền admin/user vẫn được kiểm tra; không có token trong URL phiếu.

## Test nhanh

1. Mở admin từ ứng dụng → Đơn hàng: phải thấy Chi tiết đơn và In phiếu ở từng dòng. Kiểm tra cả khi bấm mã đơn ở Tổng quan.
2. Mở chi tiết đơn có voucher: đối chiếu tài khoản, địa chỉ, sản phẩm, tiền giảm, thanh toán và lịch sử.
3. Tìm một mã đơn/email/vận đơn; lọc trạng thái, ngày Việt Nam và thanh toán; sang trang kế tiếp rồi đổi lọc: quay về trang 1.
4. Chọn chuyển trạng thái nhưng Bỏ qua: chưa đổi đơn. Xác nhận: đơn và lịch sử/thông báo cập nhật. Hủy không có lý do phải bị chặn.
5. Hai cửa sổ mở cùng đơn; cửa sổ thứ nhất chuyển trạng thái trước, cửa sổ sau dùng trạng thái cũ phải nhận thông báo tải lại.
6. Đơn COD đã hoàn tất nhưng chưa thu tiền: xác nhận phiếu thu, trạng thái/mã trong chi tiết phải đổi sau tải lại.
7. In từ danh sách và chi tiết: mở đúng mã đơn, chọn In / Lưu PDF để kiểm tra bản in.
8. User thường gọi API admin hoặc cố xem đơn không thuộc quyền: phải bị từ chối.

## GitHub và kiểm thử

Gói cập nhật gồm 3 file mới + 9 file sửa so với nền in phiếu, kèm 5 file hỗ trợ đã có để tương thích nền giao hàng (17 file tổng cộng). Danh sách và commit ở UPDATE.md. Upload nội dung đã giải nén, giữ đúng đường dẫn. Không upload nguyên ZIP, .env, vendor, node_modules, public/build hoặc log.

183 bài backend / 1346 assertions đạt trên SQLite riêng; gồm 8 bài mới về quyền admin, chi tiết, tìm/lọc, ngày Việt Nam, phân trang và xung đột trạng thái. 9 nhóm React/jsdom mới đạt từ AdminDashboard thực tế, gồm in ở dòng/chi tiết, mở từ Tổng quan, tìm/lọc, retry, phản hồi muộn, đổi trạng thái, hủy có lý do và COD. Production build đạt, còn cảnh báo Tailwind/bundle có sẵn.

Chưa kiểm tra MySQL hoặc hộp thoại in/PDF thực tế trên máy bạn. Hãy dùng các bước test trên sau khi cập nhật.

## Cài mới từ đầu

Sau khi chuẩn bị .env theo các bước bên dưới, thêm cấu hình Gemini theo mục Giữ cấu hình Gemini trong hướng dẫn này.

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-admin-orders-full.zip` vào một thư mục mới.

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
php artisan migrate --path=database/migrations/2026_10_26_160000_create_order_rebuy_batches_table.php
php artisan migrate --path=database/migrations/2026_10_26_180000_add_per_user_limit_to_vouchers.php
php artisan migrate --path=database/migrations/2026_10_27_100000_add_delivery_fields_to_orders.php
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







## Sửa menu admin khi cuộn

Menu trái dùng sticky ở đỉnh cửa sổ, giới hạn chiều cao theo viewport. Danh mục cuộn riêng trên màn hình thấp, tiêu đề và nút Về Cửa Hàng được giữ trong khung. Chỉ sửa code AdminDashboard.jsx, không có migration. Khởi động lại Vite/build và Ctrl+F5 sau cập nhật. Build đạt; cần kiểm tra cuộn trên trình duyệt máy bạn.

