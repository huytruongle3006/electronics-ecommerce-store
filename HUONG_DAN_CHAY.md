# TECHSTORE — Mua lại đơn cũ và sản phẩm đã xem gần đây

## Cập nhật bản đang chạy

1. Giải nén electronics-store-rebuy-recent-update-only.zip rồi chép nội dung vào đúng thư mục dự án có artisan; giữ các đường dẫn và cho phép thay file cũ. Gói cần nền code Gemini Flash-Lite mới nhất đã giao. Nếu nhóm sửa cùng file, so sánh trước khi ghi đè.
2. Giữ nguyên .env, APP_KEY, MySQL, Gmail và key Gemini đang dùng. Không nhập lại SQL hoặc tạo lại khóa.
3. Trong Terminal VS Code ở thư mục có artisan, chạy từng lệnh:

```powershell
php artisan migrate --path=database/migrations/2026_10_26_160000_create_order_rebuy_batches_table.php
php artisan optimize:clear
```

Migration mới chỉ tạo bảng order_rebuy_batches để ghi nhận mã yêu cầu mua lại. Không chạy migrate:fresh hoặc nhập lại database cũ.

4. Dừng/khởi động lại php artisan serve nếu đang chạy. Mở terminal thứ hai chạy npm.cmd run dev. Nếu dùng giao diện build thì chạy npm.cmd run build. Mở http://localhost:8000 và Ctrl+F5.

## Cách dùng Mua lại

- Đăng nhập → tài khoản → Đơn hàng của tôi → mở chi tiết đơn → Mua lại.
- Hệ thống tải giá/tồn kho hiện tại và số lượng đã có trong giỏ. Có thể bỏ chọn hoặc giảm số lượng, tối đa bằng số lượng gốc và phần tồn kho còn có thể thêm.
- Đơn nhiều dòng cùng sản phẩm được gộp số lượng. Món hết hàng, ngừng bán hoặc đã xóa được báo rõ; không tự thêm món đó.
- Bấm Xác nhận thêm vào giỏ. Nếu giá/tồn kho đổi sau khi xem, toàn bộ lần thêm được hủy và cần kiểm tra lại giá/tồn kho, không cộng dở một số dòng.
- Sau khi thành công bấm Xem giỏ hàng để kiểm tra rồi mới đặt đơn mới. Không áp lại voucher, thanh toán hoặc địa chỉ cũ. Không sửa đơn cũ, không tự thanh toán và không trừ/giữ tồn kho chỉ vì thêm vào giỏ.
- Mất mạng sau khi gửi: mã yêu cầu và các món đã chọn được giữ trong sessionStorage riêng theo tài khoản/đơn. Gửi lại cùng yêu cầu sẽ không cộng trùng nếu server đã xử lý. Không sửa lựa chọn trong lúc chưa biết kết quả.
- Nếu đóng tab hoàn toàn hoặc xóa dữ liệu phiên trình duyệt, kiểm tra giỏ trước khi tạo lần mua lại mới vì mã yêu cầu cũ có thể không còn trên trình duyệt.

## Cách dùng Sản phẩm đã xem gần đây

- Mở chi tiết một sản phẩm đang bán, đóng chi tiết rồi kéo xuống dưới danh sách sản phẩm trên trang cửa hàng.
- Lịch sử giữ tối đa 12 sản phẩm, sản phẩm xem lại chuyển lên đầu, không tạo bản ghi trùng. Chỉ ghi nhận sau khi tải chi tiết thành công.
- Giá, tồn kho được tải từ server khi hiển thị; sản phẩm ngừng bán/đã xóa có dòng thông báo và nút bỏ, không hiển thị giá cũ.
- Có thể mở chi tiết, thêm vào giỏ, bỏ từng món hoặc xóa lịch sử sau bước xác nhận. Thêm vào giỏ tải lại tình trạng sản phẩm trước khi thực hiện.
- Lịch sử lưu tại trình duyệt bằng id và thời gian xem, tách riêng khách và từng tài khoản; không đồng bộ qua thiết bị hoặc tự nhập lịch sử khách sang tài khoản sau đăng nhập. Đổi tài khoản không thấy lịch sử tài khoản trước.
- Dữ liệu trình duyệt bị chặn sẽ có thông báo; dữ liệu hỏng bị bỏ qua. Tính năng không gửi lịch sử đã xem tới Gemini.

## Kịch bản test

1. Chọn một đơn cũ có sản phẩm còn hàng; mở Mua lại, đối chiếu giá cũ và hiện tại, đổi số lượng rồi xác nhận. Giỏ phải tăng đúng, đơn cũ và tồn kho giữ nguyên.
2. Đặt một sản phẩm của đơn thành hết hàng/ngừng bán ở admin rồi xem lại: có cảnh báo và không chọn được.
3. Mở preview mua lại, ở cửa sổ khác đổi giá hoặc tồn kho, rồi quay lại xác nhận: báo dữ liệu thay đổi, chưa thêm vào giỏ; tải lại để xác nhận giá mới.
4. Thử mất kết nối lúc gửi, sau đó Gửi lại cùng yêu cầu: không cộng trùng. Kiểm tra cả khi đóng/mở lại hộp đơn trong cùng tab.
5. Mở 3 sản phẩm rồi xem lại sản phẩm thứ nhất: phải lên đầu. Mở hơn 12 sản phẩm: chỉ giữ 12.
6. Tải lại website: lịch sử còn. Đăng nhập tài khoản khác: lịch sử riêng. Khách chưa đăng nhập cũng có lịch sử riêng.
7. Xóa một mục, thử Giữ lịch sử rồi Xác nhận xóa lịch sử. Chỉ bucket hiện tại bị xóa.

## Giữ cấu hình Gemini

Hai chức năng mới không cần gọi AI. Nếu .env cũ đã chạy Gemini thì giữ nguyên key/model. Khi cài mới và muốn dùng AI:

```dotenv
AI_ADVISOR_ENABLED=true
GEMINI_API_KEY="key_gemini_cua_ban"
GEMINI_MODEL=gemini-3.5-flash-lite
AI_ADVISOR_DAILY_CALL_LIMIT=80
```

Key chỉ lưu backend. Không đưa .env lên GitHub hoặc gửi ảnh có key.

## GitHub và kiểm tra

Giải nén gói update-only và upload nội dung bên trong vào gốc repository, giữ đúng đường dẫn. Không upload nguyên ZIP, .env, vendor, node_modules, build hoặc log. Danh sách 15 file và nội dung commit trong UPDATE.md.

142 bài backend/1020 assertions: đạt trên SQLite riêng. 7 nhóm React/jsdom cho hai chức năng mới: đạt. Build đạt, còn cảnh báo Tailwind/bundle có sẵn. Chưa kiểm thử trên MySQL và trình duyệt thực tế của máy bạn.

## Cài mới từ đầu

Sau khi chuẩn bị .env theo các bước bên dưới, thêm cấu hình Gemini theo mục Giữ cấu hình Gemini trong hướng dẫn này.

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-rebuy-recent-full.zip` vào một thư mục mới.

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





## Bản sửa lỗi lặp mục đã xem

Đã tách key React riêng cho từng component cùng cấp trong app.jsx để tránh nhân đôi mục đã xem khi trang cập nhật. Sau khi chép bản sửa, khởi động lại Vite hoặc build lại, đóng tab cũ rồi mở lại và Ctrl+F5. Không cần xóa lịch sử, sửa .env hoặc migration bổ sung. Kiểm thử App qua 5 vòng modal, đổi tài khoản và xóa lịch sử đều đạt, không có cảnh báo key trùng.

