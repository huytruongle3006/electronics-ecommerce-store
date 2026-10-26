# TECHSTORE — Quản lý giao hàng và thông báo cho khách

## Cập nhật từ bản mã giảm giá mới nhất

1. Giải nén electronics-store-delivery-update-only.zip, chép nội dung vào gốc dự án có artisan. Giữ đúng đường dẫn và thay file cũ. Gói này cần nền bản mã giảm giá cho khách hàng đã giao; nếu nhóm sửa cùng file hãy đối chiếu trước khi thay.
2. Giữ nguyên .env, APP_KEY, database MySQL, Gmail và Gemini. Không nhập lại SQL hoặc migrate:fresh.
3. Tại terminal VS Code trong thư mục có artisan, chạy từng lệnh:

```powershell
php artisan migrate --path=database/migrations/2026_10_27_100000_add_delivery_fields_to_orders.php
php artisan optimize:clear
```

4. Dừng/mở lại php artisan serve nếu đang chạy. Chạy npm.cmd run dev ở terminal khác, hoặc npm.cmd run build nếu dùng giao diện build. Đóng tab cũ, mở lại http://localhost:8000 rồi Ctrl+F5.

Migration chỉ bổ sung các cột vào orders: carrier_name, tracking_number, estimated_delivery_date, dispatched_at, delivered_at, receipt_confirmed_at và delivery_version. Đơn cũ không bị xóa và các thời điểm chưa biết vẫn để trống. Không cần package mới, API vận chuyển hoặc cấu hình email mới.

## Admin sử dụng

1. Trang quản trị → Đơn hàng → xác nhận đơn đang chờ duyệt.
2. Mở Chi tiết đơn. Ở Quản lý giao hàng, nhập đơn vị vận chuyển, mã vận đơn và ngày giao dự kiến.
3. Bấm Lưu vận chuyển và thông báo. Khách nhận thông báo trong website kèm đơn vị, mã và ngày dự kiến. Lưu lại thông tin y hệt không tạo thêm thông báo/lịch sử.
4. Khi thực sự bàn giao hàng, chuyển trạng thái ở danh sách đơn sang Đang giao. Hệ thống ghi thời điểm bắt đầu giao và gửi thông báo trạng thái kèm thông tin vận chuyển.
5. Nếu cần sửa đơn vị/mã/ngày dự kiến trong lúc đang giao, mở lại chi tiết, sửa và lưu. Mỗi lần thay đổi thành công tạo một thông báo mới cho đúng chủ đơn.
6. Ngày dự kiến mới phải từ hôm nay theo giờ Việt Nam. Mã tối đa 100 ký tự, chỉ chữ/số/dấu chấm/gạch ngang/gạch dưới/gạch chéo. Tên đơn vị tối đa 100 ký tự.
7. Chỉ sửa thông tin vận chuyển của đơn confirmed hoặc shipping. Đơn cancelled/completed không được sửa. Nếu có người khác cập nhật đồng thời, hệ thống báo xung đột; bấm Tải lại thông tin vận chuyển rồi sửa trên bản mới.
8. Admin vẫn có thể chuyển đơn shipping sang completed theo luồng cũ, ghi thời điểm hệ thống xác nhận giao thành công và gửi thông báo. Trường xác nhận của khách vẫn trống nếu khách chưa thực hiện xác nhận.

Luồng đổi trạng thái cũ vẫn hỗ trợ đơn chưa có thông tin vận chuyển để tương thích dữ liệu trước đây. Nên nhập thông tin trước khi chuyển Đang giao. Lưu vận đơn không tự đổi trạng thái hay tự tạo vận đơn bên hãng vận chuyển.

## Khách hàng sử dụng

- Menu tài khoản → Đơn hàng của tôi → mở chi tiết đơn.
- Xem đơn vị vận chuyển, mã vận đơn, ngày giao dự kiến và các thời điểm đã ghi nhận. Ngày chỉ là dự kiến, thông tin do cửa hàng nhập; chưa kết nối tra cứu hành trình trực tiếp với hãng vận chuyển.
- Khi đơn đang giao và đã nhận đủ hàng, bấm Đã nhận hàng → đọc xác nhận → Xác nhận đã nhận hàng.
- Đơn chuyển sang Hoàn tất, lưu thời điểm ghi nhận giao thành công và thời điểm khách xác nhận; có thông báo trong website. Đây là thời điểm hệ thống ghi nhận xác nhận, không tự suy ra thời điểm giao thực tế từ hãng vận chuyển.
- Nút chỉ có ở đơn shipping của chính tài khoản. Không được xác nhận cho đơn người khác hoặc đơn chờ duyệt/đã hủy/đã hoàn tất bởi admin. Nếu server đã nhận xác nhận của khách, gửi lại yêu cầu chỉ trả kết quả cũ, không tạo lịch sử/thông báo mới.
- Nút Tải lại giao hàng tải dữ liệu server mới nhất. Nếu mất mạng sau khi bấm xác nhận, dùng nút này để biết server đã hoàn tất chưa; có thể gửi lại cùng thao tác khi cần vì chuyển trạng thái được xử lý một lần.
- Nếu admin đã hoàn tất đơn trước, tải lại đơn: thời điểm giao thành công được hiển thị, không cần bấm nhận hàng nữa.

Xác nhận nhận hàng KHÔNG thay trạng thái thu tiền COD/thanh toán, KHÔNG trừ thêm kho, không cộng lại lượt voucher và không tự hoàn tiền. Quy trình xác nhận thu COD và đổi trả/bảo hành hiện có được giữ lại. Thời gian hoàn tất dùng delivered_at nếu có; đơn cũ tiếp tục dùng lịch sử hoàn tất như trước.

## Thông báo cho user

- Có thông báo khi admin thêm/sửa vận chuyển, chuyển Đang giao, chuyển Hoàn tất và khi khách xác nhận nhận hàng.
- Thông báo chỉ gửi tới tài khoản sở hữu đơn. Bấm ở chuông thông báo sẽ mở đúng chi tiết đơn, được kiểm tra quyền trên server.
- Chuông dùng cơ chế có sẵn: tự tải khoảng 20 giây khi tab đang hiển thị, khi quay lại tab hoặc mở chuông; có nút làm mới. Đây là thông báo trong website, không phải push trên điện thoại hay email.
- Ghi đơn/lịch sử/thông báo cùng transaction. Nếu một phần thất bại thì hoàn tác toàn bộ. Bấm lại khi trạng thái/thông tin không đổi không tạo thông báo trùng.

## Test nhanh trên máy bạn

1. Dùng một tài khoản khách đặt đơn COD; admin xác nhận đơn.
2. Admin nhập GHN, mã GHN-TEST-001, ngày dự kiến ngày mai rồi lưu. Khách mở chuông (hoặc đợi cập nhật), thấy thông báo và bấm để vào đúng đơn.
3. Admin chuyển Đang giao: khách nhận thêm thông báo, thấy mã/ngày/thời gian bắt đầu giao, có nút Đã nhận hàng.
4. Sửa mã thành GHN-TEST-002 hoặc đổi ngày dự kiến: khách thấy thông báo mới và thông tin mới sau Tải lại giao hàng. Lưu cùng dữ liệu lần nữa không được tăng số thông báo.
5. Khách bấm Đã nhận hàng rồi chọn Chưa nhận hàng: đơn vẫn shipping. Thử lại và xác nhận: đơn completed, có giờ giao/xác nhận và thông báo hoàn tất.
6. Tải lại hoặc gửi lại yêu cầu nhận hàng: thời gian không đổi, không có thêm lịch sử/thông báo. Kho và thanh toán COD giữ nguyên.
7. Đăng nhập khách khác: không được xem/xác nhận đơn này. User không được truy cập API quản lý giao hàng của admin.
8. Đơn pending/cancelled/completed không có nút nhận hàng; admin không sửa vận chuyển của đơn đã hủy/hoàn tất.
9. Hai cửa sổ admin mở cùng đơn rồi sửa khác nhau: lần sửa sau báo xung đột và yêu cầu tải lại.

## GitHub và kiểm thử

Gói update-only gồm 4 file mới và 11 file sửa (15 file). Giải nén rồi upload nội dung vào đúng đường dẫn repository. Không upload nguyên ZIP, .env, vendor, node_modules, public/build hoặc log. Nội dung commit trong UPDATE.md.

167 bài backend / 1225 assertions đạt trên SQLite riêng, gồm 11 bài mới về giao hàng, quyền, thời điểm, thông báo, retry và rollback. 6 nhóm React/jsdom mới đạt cho admin, khách, chi tiết đơn và chuông thông báo. Production build đạt; còn cảnh báo Tailwind/bundle có sẵn. Chưa chạy trên MySQL hoặc trình duyệt thật của máy bạn. Một test bảo hành cũ được chỉnh dùng ngày theo timezone bảo hành thay vì UTC để kết quả ổn định qua nửa đêm; nghiệp vụ bảo hành không bị đổi.

## Cài mới từ đầu

Sau khi chuẩn bị .env theo các bước bên dưới, thêm cấu hình Gemini theo mục Giữ cấu hình Gemini trong hướng dẫn này.

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-delivery-full.zip` vào một thư mục mới.

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






