# Cập nhật chức năng TECHSTORE

Ngày tổng hợp: 19/10/2026.

Tài liệu so sánh mã nguồn gốc trong **electronics-ecommerce-store-main.zip** với bản mới nhất đã dọn gọn **electronics-store-clean**. Đây là kết quả so với ZIP gốc được cung cấp, không phải so với trạng thái hiện tại của repository GitHub.

## Tổng quan thay đổi

| Loại | Số file |
|---|---:|
| Thêm mới | 53 |
| Sửa nội dung | 24 |
| Bỏ tài liệu cũ | 3 |
| Giữ nguyên | 79 |

ZIP gốc có 106 file; bản source mới có 156 file. Không có file chỉ đổi xuống dòng/BOM. File UPDATE.md này được tạo riêng cho việc công bố cập nhật và chưa tính vào các số trên.

Các chức năng đăng ký/đăng nhập, đặt hàng và nhiều màn hình admin đã có trong source gốc. Bảng bên dưới chỉ mô tả phần được bổ sung hoặc hoàn thiện trong đợt cập nhật này.

## Chức năng đã bổ sung hoặc hoàn thiện

| Nhóm | Nội dung cập nhật |
|---|---|
| Quản lý tài khoản user | Xem và sửa tên, điện thoại, địa chỉ; đổi mật khẩu có kiểm tra mật khẩu hiện tại; thu hồi phiên đăng nhập khi đổi mật khẩu. |
| Quên mật khẩu qua email | Gửi liên kết đặt lại mật khẩu qua mail transport; mã dùng một lần, có hạn dùng; thêm cấu hình mẫu Gmail SMTP và lệnh kiểm tra/gửi thư thử. Gmail gửi thật cần cấu hình riêng trong .env. |
| Giỏ khách và đồng bộ sau đăng nhập | Lưu giỏ khách trên trình duyệt, gộp vào giỏ tài khoản, cộng số lượng sản phẩm trùng; thử lại không cộng hai lần; giữ và báo rõ món thiếu hàng/ngừng bán. |
| Hủy đơn hàng | User hủy đơn chờ xác nhận với lý do; hoàn lại tồn kho và lượt voucher đúng một lần; admin chỉ chuyển trạng thái theo trình tự hợp lệ. |
| Danh sách yêu thích | Thêm/bỏ yêu thích, lưu theo tài khoản, xem chi tiết và thêm vào giỏ; xử lý sản phẩm hết hàng hoặc không còn mở bán. |
| Quản lý đánh giá | User xem danh sách nhận xét của mình, sửa/xóa có xác nhận; phân trang/lọc sao; tính điểm trên toàn bộ nhận xét; thêm nút đánh giá ngay trong chi tiết đơn đã xác nhận, đang giao hoặc hoàn tất. |
| Đổi trả và hoàn tiền | User gửi yêu cầu đủ điều kiện và theo dõi lịch sử; admin duyệt/từ chối, nhận hàng, chọn nhập lại kho và ghi nhận hoàn tiền thực tế bằng chứng từ. |
| Bảo hành và sửa chữa | Admin cấp serial theo đơn/số lượng đã mua; user xem phiếu của mình và gửi yêu cầu; theo dõi tiếp nhận, sửa chữa, chờ trả máy và đóng hồ sơ. Tra cứu công khai hạn chế dữ liệu cá nhân. |
| Kho, nhà cung cấp và nhập hàng | Thêm quản lý nhà cung cấp, xem tồn kho, lập/xem phiếu nhập; kiểm tra số tiền và chống cộng kho trùng khi gửi lại yêu cầu. |
| Phân quyền và kiểm tra dữ liệu | Bảo vệ API admin bằng vai trò; kiểm tra chủ sở hữu giỏ, đơn, nhận xét, bảo hành, yêu thích; đồng bộ các điều kiện ở server và giao diện. |
| Báo cáo hiện có | Điều chỉnh tính doanh thu để loại các đơn đã ghi nhận hoàn tiền. |
| Menu và giao diện | Header gọn một khu vực chính, bỏ hàng menu tiện ích phía dưới; đưa chức năng user vào menu tên/avatar; giữ nút bảo hành ở hàng chính và điều chỉnh màn hình nhỏ. |
| Hướng dẫn và kiểm tra | Gom tài liệu chạy dự án thành HUONG_DAN_CHAY.md; thêm kiểm tra backend cho các luồng mới. |

Đổi trả/hoàn tiền ở đây là quy trình xử lý và ghi nhận đối soát tại cửa hàng; không phải tự chuyển tiền từ cổng thanh toán. Nhãn công khai “Đã mua hàng” của nhận xét vẫn kiểm tra đơn hoàn tất, dù user được phép bắt đầu viết từ trạng thái đã xác nhận.

## Danh sách đầy đủ 24 file đã sửa

- `.env.example`
- `app/Http/Controllers/Api/AdminController.php`
- `app/Http/Controllers/Api/CartController.php`
- `app/Http/Controllers/Api/ProductController.php`
- `app/Http/Controllers/Api/ReviewController.php`
- `app/Http/Controllers/Api/WarrantyController.php`
- `app/Models/Order.php`
- `app/Models/User.php`
- `app/Models/Warranty.php`
- `config/mail.php`
- `resources/js/app.jsx`
- `resources/js/components/AdminDashboard.jsx`
- `resources/js/components/AuthModal.jsx`
- `resources/js/components/CartDrawer.jsx`
- `resources/js/components/MyOrdersModal.jsx`
- `resources/js/components/Navbar.jsx`
- `resources/js/components/OrderManagement.jsx`
- `resources/js/components/ProductCard.jsx`
- `resources/js/components/ProductCategoryManagement.jsx`
- `resources/js/components/ProductDetailModal.jsx`
- `resources/js/components/WarrantyModal.jsx`
- `resources/js/services/api.js`
- `routes/api.php`
- `routes/console.php`

## Danh sách đầy đủ 53 file thêm mới

- `app/Http/Controllers/Api/CartMergeController.php`
- `app/Http/Controllers/Api/InventoryController.php`
- `app/Http/Controllers/Api/OrderCancellationController.php`
- `app/Http/Controllers/Api/PasswordResetController.php`
- `app/Http/Controllers/Api/ProfileController.php`
- `app/Http/Controllers/Api/ReturnRequestController.php`
- `app/Http/Controllers/Api/WarrantyManagementController.php`
- `app/Http/Controllers/Api/WishlistController.php`
- `app/Http/Middleware/EnsureAdmin.php`
- `app/Models/ReturnRequest.php`
- `app/Models/ReturnRequestEvent.php`
- `app/Models/WarrantyServiceEvent.php`
- `app/Models/WarrantyServiceRequest.php`
- `app/Notifications/ResetUserPassword.php`
- `app/Services/OrderCancellation.php`
- `app/Services/WarrantyPolicy.php`
- `config/warranty.php`
- `database/migrations/2026_10_19_120000_create_return_requests_tables.php`
- `database/migrations/2026_10_19_150000_create_warranty_service_tables.php`
- `database/migrations/2026_10_19_180000_create_wishlist_items_table.php`
- `database/migrations/2026_10_19_230000_create_guest_cart_merges_table.php`
- `HUONG_DAN_CHAY.md`
- `resources/js/components/AccountModal.jsx`
- `resources/js/components/CartSyncNotice.jsx`
- `resources/js/components/ConfirmCodPayment.jsx`
- `resources/js/components/FavoriteButton.jsx`
- `resources/js/components/InventoryManagement.jsx`
- `resources/js/components/MyReviewsModal.jsx`
- `resources/js/components/Navbar.css`
- `resources/js/components/OrderProductReview.jsx`
- `resources/js/components/PasswordRecovery.jsx`
- `resources/js/components/ProductReviews.jsx`
- `resources/js/components/ReturnManagement.jsx`
- `resources/js/components/ReturnRequestPanel.jsx`
- `resources/js/components/ReviewEditor.jsx`
- `resources/js/components/WarrantyManagement.jsx`
- `resources/js/components/WarrantyShared.jsx`
- `resources/js/components/WishlistModal.jsx`
- `resources/js/hooks/useStoreCart.js`
- `resources/js/hooks/useWishlist.js`
- `resources/js/utils/orderStatus.js`
- `tests/Feature/AccountManagementTest.php`
- `tests/Feature/GmailMailCheckTest.php`
- `tests/Feature/GuestCartMergeTest.php`
- `tests/Feature/InventoryManagementTest.php`
- `tests/Feature/OrderCancellationTest.php`
- `tests/Feature/PasswordRecoveryTest.php`
- `tests/Feature/ReturnWorkflowTest.php`
- `tests/Feature/ReviewManagementTest.php`
- `tests/Feature/WarrantyWorkflowTest.php`
- `tests/Feature/WishlistTest.php`
- `tests/Support/AccountTestCase.php`
- `tests/Support/OrderTestCase.php`

## 3 file tài liệu được bỏ khi dọn source

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`

Ba file này là tài liệu/hướng dẫn mẫu, không ảnh hưởng chức năng chạy web. Upload file mới không tự xóa chúng trên GitHub. Nếu muốn repository giống bản dọn gọn, xóa riêng ba file này trên repository; có thể giữ README giới thiệu dự án nếu muốn.

## Cách đưa bản cập nhật lên GitHub

Gói **electronics-store-update-for-github.zip** có 77 file code/cấu hình/kiểm tra/hướng dẫn đã thêm hoặc sửa, giữ đúng đường dẫn, cùng file UPDATE.md này. Không chứa file không đổi, .env cá nhân, mật khẩu Gmail, vendor, node_modules, cache, log hoặc bản build.

1. Giải nén gói cập nhật.
2. Trên GitHub, mở thư mục gốc repository — nơi có artisan, composer.json và các thư mục app/resources/routes.
3. Chọn **Add file → Upload files**, kéo các file/thư mục đã giải nén vào. Không upload nguyên ZIP làm mã nguồn và không tạo thêm thư mục update bọc ngoài.
4. Kiểm tra các đường dẫn như resources/js/app.jsx hoặc app/Http/Controllers/Api/... khớp file đang có. Nếu repository đã được thành viên khác sửa sau ZIP gốc, đối chiếu trước khi ghi đè.
5. Đưa UPDATE.md lên thư mục gốc để người xem mở và đọc phần chức năng/danh sách file. Nội dung này cũng có thể dùng làm mô tả pull request.
6. Nếu cần khớp bản dọn gọn, xóa riêng ba tài liệu cũ liệt kê ở trên.
7. Ghi commit và lưu thay đổi.

Tiêu đề commit gợi ý:

~~~text
feat: bổ sung chức năng user, quản lý kho, đổi trả và bảo hành
~~~

Mô tả commit gợi ý:

~~~text
Bổ sung quản lý tài khoản, khôi phục mật khẩu qua email và yêu thích.
Giữ/gộp giỏ khách khi đăng nhập, thêm hủy đơn và quản lý nhận xét.
Bổ sung đổi trả/hoàn tiền, cấp và xử lý bảo hành, quản lý kho/nhập hàng.
Cải thiện phân quyền, menu và thêm kiểm tra backend.
Xem UPDATE.md để biết danh sách file và hướng dẫn áp dụng.
~~~

## Khi áp dụng code vào máy chạy dự án

Giữ nguyên .env và APP_KEY đang hoạt động. Cấu hình MySQL/Gmail thật chỉ đặt ở máy triển khai, không commit lên GitHub.

Chạy các migration riêng; những migration đã chạy được bỏ qua:

~~~powershell
php artisan migrate --path=database/migrations/2026_10_19_120000_create_return_requests_tables.php
php artisan migrate --path=database/migrations/2026_10_19_150000_create_warranty_service_tables.php
php artisan migrate --path=database/migrations/2026_10_19_180000_create_wishlist_items_table.php
php artisan migrate --path=database/migrations/2026_10_19_230000_create_guest_cart_merges_table.php
php artisan optimize:clear
~~~

Không nhập lại SQL hay chạy migrate:fresh trên database đang có dữ liệu. Chi tiết cài và chạy có trong HUONG_DAN_CHAY.md đi kèm source.

## Kiểm tra đã thực hiện cho bản code này

- 87 kiểm tra backend, 681 assertions đạt trên môi trường SQLite độc lập.
- Kiểm tra React/jsdom cho các luồng giao diện mới và build production thành công.
- Gói cập nhật được đối chiếu đường dẫn và hash nội dung với bản source mới; áp dụng lên ZIP gốc cùng danh sách bỏ tài liệu cho ra đúng bản đã so sánh.
- Các kiểm tra trên không thay thế thử nghiệm MySQL, cấu hình SMTP và dữ liệu thực tế ở máy triển khai.
