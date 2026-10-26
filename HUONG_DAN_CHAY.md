# TECHSTORE — Gemini bản tối ưu thời gian chờ

## Cập nhật bản tối ưu khi bạn đã dùng Gemini

Giải nén electronics-store-gemini-fast-update-only.zip, chép nội dung vào dự án có artisan và đồng ý thay thế file cũ (so sánh trước nếu nhóm đã chỉnh cùng file). Giữ nguyên .env với GEMINI_API_KEY/GEMINI_MODEL hiện tại, không cần key mới hoặc migration.

Chạy php artisan optimize:clear, dừng/khởi động lại php artisan serve và npm.cmd run dev. Nếu dùng build thì chạy npm.cmd run build. Nhấn Ctrl+F5.

### Đã sửa vấn đề chờ lâu không có kết quả

- Một lần gọi Gemini thay cho hai lần tuần tự.
- Rút ngắn prompt: tối đa 16 ứng viên và 8 dòng căn cứ mỗi sản phẩm; không thay đổi model của bạn.
- Cache quyết định đã kiểm tra hợp lệ trong 90 giây. Câu hỏi/hội thoại, bộ lọc, model hoặc catalog khác sẽ có khóa cache khác. Kết quả cache vẫn được đối chiếu lại với database; giá/tồn kho thay đổi không hiển thị sai dữ liệu cũ.
- Timeout gọi Gemini mặc định 18 giây, tối đa 20 giây trong code; timeout Axios 27 giây và watchdog giao diện 30 giây. Khi mạng/AI không phản hồi, báo lỗi để gửi lại, mở ô nhập thay vì chờ vô hạn. Đây là ngưỡng thời gian chờ, không phải cam kết luôn có câu trả lời AI trong thời gian đó; trình duyệt/tab bị treo hoặc throttling có thể làm bộ đếm trễ.
- Hiện số giây đang chờ; hủy/đóng/hội thoại mới bỏ qua phản hồi muộn.
- Dùng thinking MINIMAL cho gemini-3.5-flash-lite để khớp bài thử thành công; model Gemini 3/4 khác vẫn dùng LOW, không tự ép MINIMAL cho mọi model: https://ai.google.dev/gemini-api/docs/generate-content/thinking.

Kiểm thử: hỏi cùng nhu cầu/bộ lọc hai lần riêng biệt trong 90 giây; lượt trùng có nhãn dùng kết quả gần đây. Hỏi tiếp trong cùng hội thoại có ngữ cảnh khác nên không nhất thiết trúng cache. Thử ngắt mạng trong lúc hỏi: sau thời gian chờ phải thấy thông báo lỗi và ô nhập mở lại. Đổi giá/tồn kho rồi hỏi lại để kiểm tra cache được thay theo catalog.

Người dùng đã kiểm tra yêu cầu sinh JSON nhỏ với model 3.5 Flash-Lite thành công trong 1,263 giây. Đây không phải phép đo tư vấn catalog đầy đủ, không cam kết mọi lượt đều 1–3 giây hoặc hết lỗi dịch vụ Google. Nếu Gemini không phản hồi trong khoảng chờ, bạn có thể thử lại hoặc dùng bộ lọc sản phẩm; ứng dụng không giả câu trả lời AI thành công.


## Gói đưa lên GitHub

Gói electronics-store-gemini-github-update.zip chứa 12 file nguồn/tài liệu, là toàn bộ phần AI mới nhất so với bản thông báo. Giải nén và upload nội dung vào gốc repository, giữ đúng đường dẫn. Không upload nguyên ZIP, .env, các file diagnostic, vendor hoặc node_modules. So sánh trước nếu nhóm đã sửa cùng file. Chi tiết commit và file nằm trong UPDATE.md.

## 1. Cập nhật dự án đang chạy

Gói đầy đủ: electronics-store-gemini-fast-full.zip. Gói cập nhật: electronics-store-gemini-fast-update-only.zip.

Nếu bản AI/OpenAI hoặc bản thông báo của bạn đã chạy được, giải nén update-only rồi chép nội dung vào thư mục có artisan, giữ đúng các đường dẫn và đồng ý thay thế file cũ. Gói update-only chứa toàn bộ phần AI dựa trên bản thông báo, áp dụng được cả khi bạn đã cài AI/OpenAI. Nếu code nhóm đã sửa thêm cùng file, so sánh trước khi ghi đè.

Giữ nguyên .env, APP_KEY, database MySQL và Gmail cũ. Không nhập lại SQL và không chép .env.example đè lên .env đang chạy. Phần đổi Gemini không thêm bảng hoặc migration, không cần cài thư viện mới.

## 2. Điền key Gemini ở backend

Mở .env trong VS Code, thêm/sửa mỗi dòng đúng một lần:

```dotenv
AI_ADVISOR_ENABLED=true
GEMINI_API_KEY="dien_api_key_gemini_cua_ban"
GEMINI_MODEL=gemini-3.5-flash-lite
AI_ADVISOR_DAILY_CALL_LIMIT=80
```

Thay giá trị GEMINI_API_KEY bằng key thật trong Google AI Studio. Không gửi key trong chat, không đưa .env lên GitHub, không tạo biến VITE_GEMINI_API_KEY. Không dùng mật khẩu Google hay chỉ tên gói Gemini Pro thay cho API key.

Key: https://aistudio.google.com/api-keys. Tài liệu: https://ai.google.dev/gemini-api/docs/api-key.

GEMINI_MODEL mặc định là gemini-3.5-flash-lite theo tài liệu hiện tại. Tên model trong ảnh hạn mức của bạn chưa thấy rõ, nên không thể khẳng định hạn mức 100 yêu cầu/ngày áp dụng cho model mặc định này. Trong AI Studio → Rate Limit, chọn project của key và model muốn dùng; nhập đúng mã model được quyền gọi và hỗ trợ Structured Outputs. Chỉ nhập mã như gemini-3.5-flash-lite, không nhập URL hay models/ phía trước. Không tự động chuyển sang model khác khi gặp lỗi.

Bạn có thể xóa hai dòng OPENAI_API_KEY và OPENAI_ADVISOR_MODEL cũ nếu chỉ dùng bản Gemini. Code này không đọc key OpenAI và không gọi OpenAI.

Nhấn Ctrl+S. Ở terminal đúng thư mục có artisan, chạy:

```powershell
php artisan optimize:clear
```

Nếu bản cũ đang chạy php artisan serve, nhấn Ctrl+C để dừng rồi khởi động lại. Chạy hai terminal:

```powershell
php artisan serve
```

```powershell
npm.cmd run dev
```

Nếu bạn dùng build thì chạy npm.cmd run build thay cho giữ Vite. Mở http://localhost:8000, nhấn Ctrl+F5 rồi bấm AI chọn sản phẩm. Tiêu đề và dòng cuối hộp thoại phải ghi Gemini/Google Gemini. Chỉ copy các dòng bên trong khối code, không copy dấu backtick bao quanh.

## 3. Cách dùng và test

1. Nhập “Tìm bàn phím cơ đang có ở cửa hàng”, chọn danh mục nếu muốn và nhập ngân sách VND. Ví dụ 2000000 là hai triệu, 20000000 là hai mươi triệu.
2. Gemini phân tích nhu cầu, backend chỉ đưa sản phẩm status=active và quantity>0, đúng danh mục/khoảng giá. AI đề xuất tối đa 3 sản phẩm từ nhóm tối đa 16 ứng viên.
3. Tên, giá, số lượng, bảo hành và thông số hiển thị do database cung cấp. AI chỉ chọn id và vị trí căn cứ trong thông số, không tự viết giá/thông số. Thiếu dữ liệu thì cần xác minh, không cam kết FPS hay pin bằng suy đoán.
4. Thử ngân sách thấp hơn tất cả sản phẩm: không được gợi ý vượt ngân sách. Bộ lọc nhập ở ô Ngân sách tối đa luôn được backend ưu tiên; muốn thay đổi thì sửa/xóa ô đó.
5. Admin đổi sản phẩm sang hết hàng hoặc ngừng bán rồi hỏi lại: không được gợi ý sản phẩm đó.
6. Hỏi tiếp “Có lựa chọn rẻ hơn không?” hoặc “Cái đầu tiên có RAM gì?”. Thông tin sản phẩm lượt trước được đọc lại từ database công khai.
7. Thử Xem chi tiết và Thêm vào giỏ. Thêm vào giỏ tải lại giá/tồn kho hiện tại; từ chối nếu vừa hết hàng/ngừng bán. Checkout giữ bước kiểm tra hiện có.
8. Thử đóng trợ lý lúc đang xử lý rồi mở lại; phản hồi cũ không được chèn vào cuộc hội thoại mới. Bấm Hội thoại mới để xóa hội thoại trong phiên trang.

## 4. Hạn mức thử nghiệm

- Giới hạn ứng dụng mặc định 80 lần gọi model trong cửa sổ 24 giờ qua cache. Mỗi lượt gọi tối đa 1 lần; cache hợp lệ hoặc không có hàng trong bộ lọc tường minh không cần gọi. Khoảng 80 lượt chưa có cache có thể sử dụng hết giới hạn ứng dụng 80 lần gọi, còn tùy quota Google và các lượt lỗi.
- Đây là giới hạn của ứng dụng, tách biệt hạn mức Google theo project/model. Ảnh bạn gửi hiển thị 60 RPM, 100K TPM và 100 RPD nhưng chưa có tên model; không áp dụng các số này cho mọi model/key.
- Endpoint chat giới hạn 5 yêu cầu/phút/IP. Không tự retry API khi bị hạn mức để tránh tốn thêm lượt; khách bấm Gửi lại yêu cầu khi muốn thử lại.
- Gemini API vẫn có thể quá tải hoặc hết quota. Gói Google AI Pro không tự bảo đảm quota API của website. Kiểm tra Rate Limit/Billing của đúng project. Việc gọi API có thể phát sinh phí tùy loại tài khoản/hạn mức.

## 5. Khi gặp lỗi

- **Chưa cấu hình:** kiểm tra GEMINI_API_KEY, AI_ADVISOR_ENABLED=true, lưu file, chạy php artisan optimize:clear, khởi động lại PHP, bấm Tải lại trạng thái AI.
- **Gemini chạm hạn mức:** xem Rate Limit/Usage của đúng project/model. Nếu hết giới hạn phút thì đợi rồi thử, nếu hết ngày thì chờ hạn mức ngày phục hồi. Tạo thêm key cùng project không tự tạo quota riêng.
- **Key bị từ chối:** xem key thuộc project nào, API đã được bật/chấp nhận, key có quyền gọi Gemini API/model không. Không gửi ảnh chứa key.
- **Model chưa khả dụng:** sửa GEMINI_MODEL theo model được cấp quyền hỗ trợ JSON có cấu trúc. Xóa cache cấu hình và khởi động lại PHP sau khi sửa.
- **Cấu hình chưa hợp lệ:** kiểm tra mã model, key và hỗ trợ Structured Outputs; code không đưa nguyên lỗi Google hoặc key ra trình duyệt.
- **Chưa kết nối/dịch vụ tạm thời chưa sẵn sàng:** kiểm tra mạng HTTPS tới generativelanguage.googleapis.com, cấu hình CA/OpenSSL/cURL; không tắt xác minh TLS.
- **AI chưa hoàn tất:** có thể chạm giới hạn sinh nội dung hoặc phản hồi bị chặn. Rút gọn nhu cầu và thử lại; ứng dụng không hiển thị JSON dở dang hoặc câu trả lời giả.
- **Vẫn thấy dòng OpenAI trên giao diện:** bạn chưa chép đúng ProductAdvisor.jsx hoặc còn dùng build cũ. Khởi động lại Vite/build lại và Ctrl+F5.

## 6. Dữ liệu và kiểm thử

Hội thoại chỉ giữ trong bộ nhớ trang; dữ liệu chat và catalog công khai được gửi tới Google Gemini. Không đọc bảng tài khoản, đơn hàng, địa chỉ hay thông tin Gmail để tư vấn. Bản tích hợp không tự lưu chat vào database; cách Google xử lý dữ liệu phụ thuộc điều khoản/gói Gemini API của bạn. Không có tham số store=false của OpenAI trong Gemini.

Tích hợp theo REST generateContent và JSON Schema: https://ai.google.dev/gemini-api/docs/generate-content/structured-output. Key truyền bằng header x-goog-api-key ở backend, không đặt trong URL hay frontend. API xử lý finishReason và bỏ các phần thought khỏi dữ liệu giải mã/hiển thị.

131 bài kiểm thử backend, 958 assertions: đạt. 8 nhóm kiểm thử React/jsdom: đạt. Build đạt, còn cảnh báo Tailwind/bundle có sẵn.

Kiểm thử tự động API dùng HTTP mock theo cấu trúc Gemini. Người dùng đã tự thử thành công một yêu cầu JSON nhỏ trên model 3.5 Flash-Lite; chưa đo độ trễ hay chất lượng tư vấn catalog đầy đủ bằng key thật hoặc kiểm thử MySQL thực tế tại máy người dùng. Cần điền key và test website để xác nhận quyền/hạn mức/model thật.

## 7. Up GitHub

Giải nén update-only và upload nội dung bên trong vào đúng đường dẫn gốc repository, không upload nguyên ZIP hoặc .env. Chi tiết file thay đổi nằm trong UPDATE.md.

Commit đề xuất: feat: chuyển trợ lý chọn sản phẩm sang Gemini API

## Cài mới từ đầu

Sau khi chuẩn bị .env theo các bước bên dưới, thêm cấu hình Gemini ở mục 2 phía trên.

## 1. Giải nén và mở đúng thư mục

Giải nén `electronics-store-gemini-fast-full.zip` vào một thư mục mới.

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



