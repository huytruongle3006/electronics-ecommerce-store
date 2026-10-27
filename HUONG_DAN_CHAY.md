# TECHSTORE — Nhắn tin hỗ trợ giữa user và admin

## Cập nhật bản đang chạy

1. Giải nén electronics-store-support-update-only.zip rồi chép nội dung vào đúng thư mục dự án có artisan, giữ đường dẫn và thay file cũ. Gói dùng trên nền admin đơn hàng/in phiếu/menu mới nhất hoặc nền lọc sản phẩm đã giao; có kèm file phụ thuộc để không thiếu import nếu bạn bỏ qua bản lọc. Nếu nhóm đã sửa cùng file, đối chiếu trước khi ghi đè.
2. Giữ nguyên .env, APP_KEY, MySQL, Gmail và Gemini. Không nhập lại SQL, không tạo lại khóa và không chạy migrate:fresh.
3. Chạy từng lệnh:

```powershell
php artisan migrate --path=database/migrations/2026_10_27_150000_create_support_conversations_tables.php
php artisan optimize:clear
```

4. Khởi động lại php artisan serve nếu đang chạy. Mở terminal khác chạy npm.cmd run dev; nếu dùng giao diện build, chạy npm.cmd run build. Đóng tab cũ, mở lại http://localhost:8000 rồi Ctrl+F5.

Migration tạo support_threads và support_messages; không xóa dữ liệu cũ. Bản này không cần cấu hình AI, SMTP, WebSocket, queue worker hay package mới để nhắn tin. Nền dự án cần có bảng store_notifications từ bản thông báo trước đây. Khi cài mới, chạy các migration bổ sung theo phần cuối hướng dẫn.

## User nhắn với cửa hàng

1. Đăng nhập → mở menu tên tài khoản → Hỗ trợ / Nhắn cửa hàng.
2. Bấm Tạo yêu cầu mới, nhập tiêu đề và nội dung. Có thể chọn một đơn của chính tài khoản trong Đơn hàng liên quan hoặc để không gắn đơn.
3. Bấm Gửi yêu cầu hỗ trợ. Yêu cầu và tin nhắn đầu tiên được lưu cùng lúc; admin đang hoạt động nhận thông báo trong website.
4. Chọn yêu cầu trong danh sách, đọc tin và gửi tiếp ở ô Tin nhắn. Lịch sử được giữ trên server, không mất khi đóng hộp thoại hoặc đăng nhập lại.
5. Khi admin phản hồi, user nhận thông báo ở chuông. Bấm thông báo sẽ mở đúng hội thoại hỗ trợ, không mở nhầm chi tiết đơn hàng.
6. Yêu cầu đã giải quyết vẫn giữ lịch sử. User gửi tin mới sẽ mở lại yêu cầu để cửa hàng xử lý tiếp.

Tiêu đề tối đa 160 ký tự, mỗi tin tối đa 4000 ký tự; không nhận nội dung chỉ có khoảng trắng. Bản đầu hỗ trợ chữ và xuống dòng, chưa gửi ảnh/tệp, chưa có gọi thoại/video hoặc chỉ báo đang nhập.

## Admin trả lời

1. Đăng nhập admin → sidebar Hỗ trợ khách hàng.
2. Tìm theo tiêu đề, mã đơn, tên/email khách; lọc Chờ xử lý / Đang xử lý / Đã giải quyết. Danh sách phân trang 12 yêu cầu.
3. Chọn yêu cầu, xem khách hàng, đơn liên quan và lịch sử trao đổi, nhập nội dung rồi Gửi tin nhắn.
4. Tin từ admin làm yêu cầu chuyển Đang xử lý và tạo thông báo cho đúng chủ hội thoại.
5. Có thể chọn trạng thái rồi Cập nhật trạng thái. User nhận thông báo trạng thái mới. Nếu có tin/cập nhật mới làm phiên bản thay đổi, hệ thống yêu cầu tải lại trước khi cập nhật để tránh ghi đè dữ liệu mới.
6. Admin cũng có chuông thông báo trên đầu khu vực quản trị; tin khách gửi và yêu cầu mới xuất hiện ở đó. Bấm sẽ mở mục hỗ trợ và đúng hội thoại.

Đây là hộp thư dùng chung của các admin có role ADMIN. Tin khách gửi thông báo tới các admin đang active, trừ người gửi nếu cùng tài khoản. Dấu đã đọc của phía admin dùng chung cho đội ngũ; không phải hệ thống phân công nhân viên riêng. Dấu đã đọc không phải cam kết đã giải quyết yêu cầu.

## Tự cập nhật và chưa đọc

- Khi đang mở, hội thoại kiểm tra tin mới khoảng 5 giây, danh sách khoảng 8 giây, chuông theo cơ chế cũ khoảng 20 giây. Chuyển lại tab/focus cũng tải lại; tab bị ẩn tạm ngưng các lần kiểm tra định kỳ.
- Có nút Tải lại hội thoại/Làm mới. Chưa dùng WebSocket nên đây là polling, không phải cập nhật tức thời tuyệt đối; trình duyệt/mạng có thể trì hoãn.
- Lần mở đầu tải 30 tin mới nhất, hiển thị theo thứ tự cũ → mới. Xem tin nhắn cũ hơn tải 30 tin trước đó; tin mới được lấy tăng dần theo id, không bỏ qua khoảng giữa.
- Nếu có nhiều hơn 30 tin mới giữa các lần tải, bấm Tải tiếp tin mới hoặc chờ lượt kiểm tra tiếp theo để lấy tiếp; các tin đã tải vẫn được giữ.
- Mở một hội thoại đang hiển thị/focus sẽ đánh dấu đã đọc đến id tin cuối đã tải. Tin đến sau mốc đó vẫn chưa đọc. Không đánh dấu mọi hội thoại chỉ vì xem danh sách.
- Đọc hội thoại và đọc chuông thông báo là hai dấu độc lập. Có thể dùng Đánh dấu tất cả đã đọc trong chuông nếu cần dọn thông báo cũ.

## Tránh gửi trùng khi mất mạng

- Trình duyệt lưu UUID và nội dung của lần gửi đang chờ trong sessionStorage, tách theo tài khoản, vai trò và hội thoại. Server kiểm tra UUID để một lần gửi chỉ tạo một yêu cầu/tin và thông báo.
- Nếu chờ lâu rồi báo lỗi, không đổi nội dung của lần đang chờ. Bấm Gửi lại cùng yêu cầu để gửi đúng UUID cũ.
- Đóng/mở lại hộp thoại trong cùng tab vẫn khôi phục lần gửi đang chờ. Gửi lại sau lỗi giới hạn tốc độ/hết phiên vẫn giữ UUID; đợi hoặc đăng nhập lại rồi thử đúng yêu cầu cũ.
- Đóng hẳn tab hoặc xóa dữ liệu phiên có thể làm mất UUID trên máy. Kiểm tra lịch sử trước khi tạo/gửi một lần mới. Chỉ nội dung đã gửi thành công được lưu server; đoạn đang gõ chưa gửi có thể mất khi đóng giao diện.
- Nếu browser chặn sessionStorage thì không gửi cho đến khi có thể lưu mã an toàn. Không cần gửi API key hay mật khẩu trong nội dung chat.

## Quyền và dữ liệu

- User chỉ xem/tạo/gửi/đánh dấu đã đọc hội thoại của mình. Chỉ gắn đơn của chính mình; sửa id trên đường dẫn không vượt quyền.
- Endpoint admin bắt buộc role ADMIN trên server, không dựa vào cờ do trình duyệt gửi. Vai trò người gửi do endpoint xác định, không cho client tự nhận là admin.
- Tin nhắn hiển thị dạng văn bản được React escape. HTML/script trong nội dung không được thực thi và không tự mở link/tệp bên ngoài.
- Ghi yêu cầu/tin/trạng thái/thông báo trong transaction; lỗi lưu thông báo sẽ hoàn tác thay đổi liên quan. Có giới hạn gửi và đọc riêng để polling không làm hết lượt gửi.
- Yêu cầu và tin được giữ lại, không có thao tác xóa lịch sử trong bản này.

## Test nhanh bằng 2 tài khoản

1. Mở một cửa sổ thường cho khách và cửa sổ ẩn danh cho admin (hoặc hai profile trình duyệt khác nhau) để hai phiên không ghi đè token của nhau.
2. Khách tạo yêu cầu gắn với đơn, gửi tin. Admin mở Hỗ trợ khách hàng hoặc chuông: thấy yêu cầu và nội dung đúng.
3. Admin trả lời. Khách đang mở sẽ thấy tin mới sau lượt cập nhật hoặc bấm Tải lại; chuông có thông báo mở đúng hội thoại.
4. Admin chuyển Đã giải quyết: khách thấy trạng thái/thông báo. Khách nhắn thêm: yêu cầu mở lại Chờ xử lý; admin trả lời lại sẽ thành Đang xử lý.
5. Đăng nhập một khách khác: không xem được hội thoại trước và không gắn được đơn của người khác.
6. Tạo hơn 30 tin bằng test hoặc dữ liệu thử: Xem tin cũ hơn vẫn giữ được lịch sử khi tin mới đến.
7. Thử mất mạng lúc gửi rồi Gửi lại cùng yêu cầu: chỉ có một tin/yêu cầu, không có thông báo trùng. Kiểm tra cả khi đóng/mở hộp thoại trong cùng tab.
8. Nếu hết phiên hoặc gửi quá nhanh, dùng thông báo hướng dẫn, giữ mã gửi đang chờ và kiểm tra lịch sử khi quay lại.

## GitHub và kiểm thử

Gói update có 9 file mới, 8 file sửa và 5 file phụ thuộc kèm lại từ bản lọc sản phẩm (22 file). Upload nội dung sau giải nén vào đúng đường dẫn repository. Không upload nguyên ZIP, .env, vendor, node_modules, public/build hoặc log. Danh sách và nội dung commit trong UPDATE.md.

206 bài backend / 1534 assertions đạt trên SQLite riêng, gồm 14 bài mới cho hỗ trợ. 9 nhóm React/jsdom mới đạt: nhắn hai chiều, an toàn nội dung, retry UUID sau mất mạng/429, tạo yêu cầu gắn đơn, sidebar admin/trạng thái, tải tin cũ/tin mới, lỗi/retry, menu/chuông khách/admin và đổi tài khoản. Production build đạt, còn cảnh báo Tailwind/bundle có sẵn. Chưa kiểm tra trực tiếp trên MySQL hoặc trình duyệt thật của máy bạn.

## Cài mới từ đầu

Sau khi chuẩn bị .env theo các bước bên dưới, thêm cấu hình Gemini theo mục Giữ cấu hình Gemini trong hướng dẫn này.

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-support-full.zip` vào một thư mục mới.

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
php artisan migrate --path=database/migrations/2026_10_27_150000_create_support_conversations_tables.php
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







