<?php

use Illuminate\Support\Facades\Route;

// Mọi đường dẫn giao diện đều dẫn về file app.blade.php để React Router xử lý
Route::get('/{any?}', function () {
    return view('app'); // Nếu file blade bạn đặt tên là welcome.blade.php thì sửa thành view('welcome')
})->where('any', '^(?!api).*$'); // Loại trừ các route bắt đầu bằng /api