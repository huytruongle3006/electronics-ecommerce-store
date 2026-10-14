<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
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
// Xác thực
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Danh mục & Sản phẩm công khai cho khách hàng
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/reviews', [ReviewController::class, 'index']);

// Tra cứu bảo hành điện tử
Route::post('/warranties/check', [WarrantyController::class, 'check']);

/*
|--------------------------------------------------------------------------
| 2. AUTHENTICATED ROUTES (Dành cho tài khoản đã đăng nhập)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Thông tin tài khoản
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Giỏ hàng
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart/add', [CartController::class, 'addToCart']);
    Route::put('/cart/items/{id}', [CartController::class, 'updateQuantity']);
    Route::delete('/cart/items/{id}', [CartController::class, 'removeItem']);

    // Đơn hàng & Checkout
    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders/my-orders', [OrderController::class, 'myOrders']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Gửi đánh giá sản phẩm
    Route::post('/products/{id}/reviews', [ReviewController::class, 'store']);

    /*
    |--------------------------------------------------------------------------
    | 3. ADMIN PANEL ROUTES (prefix: /api/admin)
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->group(function () {
        // Thống kê tổng quan & Báo cáo tài chính nâng cao
        Route::get('/dashboard', [AdminController::class, 'dashboardStats']);
        Route::get('/analytics/financial', [AdminController::class, 'financialReport']);

        // Quản lý Đơn hàng
        Route::get('/orders', [AdminController::class, 'getOrders']);
        Route::put('/orders/{id}/status', [AdminController::class, 'updateOrderStatus']);

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