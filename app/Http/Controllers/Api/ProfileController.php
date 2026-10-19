<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:100', 'regex:/\S/u'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9][0-9\s().-]{7,19}$/'],
            'address' => ['nullable', 'string', 'max:1000'],
        ], [
            'full_name.required' => 'Vui lòng nhập họ và tên.',
            'full_name.max' => 'Họ và tên tối đa 100 ký tự.',
            'full_name.regex' => 'Họ và tên không được chỉ có khoảng trắng.',
            'phone.regex' => 'Số điện thoại không hợp lệ (8–20 ký tự, có thể bắt đầu bằng +).',
            'phone.max' => 'Số điện thoại tối đa 20 ký tự.',
            'address.max' => 'Địa chỉ tối đa 1000 ký tự.',
        ]);

        $user->update([
            'full_name' => trim($data['full_name']),
            'phone' => isset($data['phone']) ? trim($data['phone']) : null,
            'address' => isset($data['address']) ? trim($data['address']) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thông tin tài khoản.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [
                'required', 'string', 'min:8', 'max:72', 'confirmed', 'different:current_password',
                function (string $attribute, mixed $value, \Closure $fail) {
                    // Bcrypt accepts at most 72 bytes, including multi-byte characters.
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('Mật khẩu quá dài. Vui lòng dùng ít ký tự hơn.');
                    }
                },
            ],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'password.required' => 'Vui lòng nhập mật khẩu mới.',
            'password.min' => 'Mật khẩu mới cần ít nhất 8 ký tự.',
            'password.max' => 'Mật khẩu mới tối đa 72 ký tự.',
            'password.confirmed' => 'Mật khẩu xác nhận chưa khớp.',
            'password.different' => 'Mật khẩu mới phải khác mật khẩu hiện tại.',
        ]);
        $user = $request->user();

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không chính xác.'],
            ]);
        }

        DB::transaction(function () use ($user, $data) {
            $user->update(['password' => Hash::make($data['password'])]);
            $user->tokens()->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        ]);
    }
}
