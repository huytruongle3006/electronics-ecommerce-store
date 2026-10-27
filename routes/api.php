<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\OrderCancellationController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\WarrantyController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\AdminController;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC ROUTES (Không cần đăng nhập)
|--------------------------------------------------------------------------
*/
Route::get('/advisor/options', [\App\Http\Controllers\Api\ProductAdvisorController::class, 'options'])->middleware('throttle:30,1');
Route::post('/advisor/chat', [\App\Http\Controllers\Api\ProductAdvisorController::class, 'chat'])->middleware('throttle:5,1');
Route::post('/products/recently-viewed', [\App\Http\Controllers\Api\RecentlyViewedController::class, 'index'])->middleware('throttle:60,1');
// Xác thực
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:10,1');

// Danh mục & Sản phẩm công khai cho khách hàng
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/reviews', [ReviewController::class, 'index']);

// Tra cứu bảo hành điện tử
Route::post('/warranties/check', [WarrantyController::class, 'check'])->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| 2. AUTHENTICATED ROUTES (Dành cho tài khoản đã đăng nhập)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'readAll']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'read'])->whereNumber('id');
    Route::get('/warranties/my/{id}', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'mineDetail'])->whereNumber('id');
    // Thông tin tài khoản
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:6,1');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/warranties/my', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'mine']);
    Route::post('/warranties/{id}/service-requests', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'requestService'])->middleware('throttle:10,1');

    Route::get('/wishlist', [\App\Http\Controllers\Api\WishlistController::class, 'index']);
    Route::put('/wishlist/{productId}', [\App\Http\Controllers\Api\WishlistController::class, 'store'])->whereNumber('productId');
    Route::delete('/wishlist/{productId}', [\App\Http\Controllers\Api\WishlistController::class, 'destroy'])->whereNumber('productId');

    Route::post('/cart/merge', [\App\Http\Controllers\Api\CartMergeController::class, 'merge']);
    // Sổ địa chỉ của tài khoản hiện tại
    Route::get('/addresses', [\App\Http\Controllers\Api\ShippingAddressController::class, 'index']);
    Route::post('/addresses', [\App\Http\Controllers\Api\ShippingAddressController::class, 'store']);
    Route::put('/addresses/{id}', [\App\Http\Controllers\Api\ShippingAddressController::class, 'update'])->whereNumber('id');
    Route::put('/addresses/{id}/default', [\App\Http\Controllers\Api\ShippingAddressController::class, 'makeDefault'])->whereNumber('id');
    Route::delete('/addresses/{id}', [\App\Http\Controllers\Api\ShippingAddressController::class, 'destroy'])->whereNumber('id');
    // Giỏ hàng
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart/add', [CartController::class, 'addToCart']);
    Route::put('/cart/items/{id}', [CartController::class, 'updateQuantity']);
    Route::delete('/cart/items/{id}', [CartController::class, 'removeItem']);

    Route::get('/orders/{id}/rebuy', [\App\Http\Controllers\Api\OrderRebuyController::class, 'preview'])->whereNumber('id');
    Route::post('/orders/{id}/rebuy', [\App\Http\Controllers\Api\OrderRebuyController::class, 'store'])->whereNumber('id')->middleware('throttle:10,1');
    Route::get('/vouchers', [\App\Http\Controllers\Api\CustomerVoucherController::class, 'index'])->middleware('throttle:60,1');
    Route::post('/vouchers/preview', [\App\Http\Controllers\Api\CustomerVoucherController::class, 'preview'])->middleware('throttle:30,1');
    // Đơn hàng & Checkout
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders/my-orders', [OrderController::class, 'myOrders']);
    Route::get('/orders/{id}/print', [\App\Http\Controllers\Api\OrderPrintController::class, 'customer'])->whereNumber('id')->middleware('throttle:20,1');
    Route::post('/orders/{id}/cancel', [OrderCancellationController::class, 'cancel'])->middleware('throttle:10,1');
    Route::post('/orders/{id}/received', [\App\Http\Controllers\Api\OrderDeliveryController::class, 'receive'])->whereNumber('id')->middleware('throttle:10,1');
    Route::get('/orders/{id}/return-request', [\App\Http\Controllers\Api\ReturnRequestController::class, 'forOrder']);
    Route::post('/orders/{id}/return-request', [\App\Http\Controllers\Api\ReturnRequestController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    Route::get('/reviews/my', [ReviewController::class, 'mine']);
    Route::put('/reviews/{id}', [ReviewController::class, 'update'])->whereNumber('id');
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy'])->whereNumber('id');

    // Gửi đánh giá sản phẩm
    Route::post('/products/{id}/reviews', [ReviewController::class, 'store']);

    /*
    |--------------------------------------------------------------------------
    | 3. ADMIN PANEL ROUTES (prefix: /api/admin)
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->middleware(\App\Http\Middleware\EnsureAdmin::class)->group(function () {
        Route::get('/warranties', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'index']);
        Route::get('/warranties/orders', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'orders']);
        Route::get('/warranties/{id}', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'detail']);
        Route::post('/warranties', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'store']);
        Route::put('/warranties/{id}/status', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'status']);
        Route::get('/warranty-services', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'services']);
        Route::get('/warranty-services/{id}', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'serviceDetail']);
        Route::put('/warranty-services/{id}', [\App\Http\Controllers\Api\WarrantyManagementController::class, 'updateService']);
        Route::get('/return-requests', [\App\Http\Controllers\Api\ReturnRequestController::class, 'index']);
        Route::get('/return-requests/{id}', [\App\Http\Controllers\Api\ReturnRequestController::class, 'show']);
        Route::put('/return-requests/{id}', [\App\Http\Controllers\Api\ReturnRequestController::class, 'update']);
        Route::post('/orders/{id}/confirm-cod', [\App\Http\Controllers\Api\ReturnRequestController::class, 'confirmCod']);
        Route::get('/suppliers', [\App\Http\Controllers\Api\InventoryController::class, 'suppliers']);
        Route::post('/suppliers', [\App\Http\Controllers\Api\InventoryController::class, 'saveSupplier']);
        Route::put('/suppliers/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'saveSupplier']);
        Route::get('/inventory/summary', [\App\Http\Controllers\Api\InventoryController::class, 'summary']);
        Route::get('/inventory/products', [\App\Http\Controllers\Api\InventoryController::class, 'products']);
        Route::get('/import-receipts', [\App\Http\Controllers\Api\InventoryController::class, 'receipts']);
        Route::get('/import-receipts/{id}', [\App\Http\Controllers\Api\InventoryController::class, 'showReceipt']);
        Route::post('/import-receipts', [\App\Http\Controllers\Api\InventoryController::class, 'storeReceipt']);
        // Thống kê tổng quan & Báo cáo tài chính nâng cao
        Route::get('/dashboard', [AdminController::class, 'dashboardStats']);
        Route::get('/analytics/financial', [AdminController::class, 'financialReport']);

        // Quản lý Đơn hàng
        Route::get('/orders', [AdminController::class, 'getOrders']);
        Route::get('/orders/{id}', [AdminController::class, 'showOrder'])->whereNumber('id');
        Route::get('/orders/{id}/print', [\App\Http\Controllers\Api\OrderPrintController::class, 'admin'])->whereNumber('id')->middleware('throttle:20,1');
        Route::put('/orders/{id}/status', [AdminController::class, 'updateOrderStatus']);
        Route::put('/orders/{id}/delivery', [\App\Http\Controllers\Api\OrderDeliveryController::class, 'update'])->whereNumber('id')->middleware('throttle:30,1');
        Route::get('/orders/{id}/delivery', [\App\Http\Controllers\Api\OrderDeliveryController::class, 'show'])->whereNumber('id');

        // Quản lý Sản phẩm (Admin)
        Route::get('/products', [AdminController::class, 'getAdminProducts']);
        Route::post('/products', [AdminController::class, 'storeProduct']);
        Route::put('/products/{id}', [AdminController::class, 'updateProduct']);
        Route::delete('/products/{id}', [AdminController::class, 'deleteProduct']);

        // Quản lý Danh mục (Admin)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

        // Quản trị Người dùng & Phân quyền
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/roles', [AdminController::class, 'getAllRoles']);
        Route::put('/users/{id}/role', [AdminController::class, 'updateUserRole']);
        Route::put('/users/{id}/toggle-status', [AdminController::class, 'toggleUserStatus']);

        // Quản lý Voucher & Khuyến mãi
        Route::get('/vouchers', [AdminController::class, 'getVouchers']);
        Route::post('/vouchers', [AdminController::class, 'storeVoucher']);
        Route::put('/vouchers/{id}', [AdminController::class, 'updateVoucher']);
        Route::put('/vouchers/{id}/toggle', [AdminController::class, 'toggleVoucherStatus']);
        Route::delete('/vouchers/{id}', [AdminController::class, 'deleteVoucher']);

        // Cấu hình hệ thống
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::post('/settings', [AdminController::class, 'updateSettings']);
    });
});
