<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    public function forgot(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:100'],
        ], [
            'email.required' => 'Vui lòng nhập email đăng ký.',
            'email.email' => 'Địa chỉ email không hợp lệ.',
            'email.max' => 'Email tối đa 100 ký tự.',
        ]);

        try {
            Password::broker('users')->sendResetLink([
                'email' => $data['email'],
                'status' => 'active',
            ]);
        } catch (\Throwable $exception) {
            // Keep the public response identical for unknown accounts and mail failures.
            // Do not log the email, reset token or SMTP exception context.
            \Illuminate\Support\Facades\Log::error('Password reset email could not be delivered. Check mail transport configuration.');
        }

        return response()->json([
            'success' => true,
            'message' => 'Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục Spam.',
        ]);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:100'],
            'token' => ['required', 'string', 'size:64', 'regex:/^[a-f0-9]+$/'],
            'password' => [
                'required', 'string', 'min:8', 'max:72', 'confirmed',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('Mật khẩu quá dài. Vui lòng dùng ít ký tự hơn.');
                    }
                },
            ],
        ], [
            'email.required' => 'Vui lòng nhập email đăng ký.',
            'email.email' => 'Địa chỉ email không hợp lệ.',
            'token.required' => 'Thiếu liên kết xác thực. Vui lòng yêu cầu email mới.',
            'token.size' => 'Liên kết không hợp lệ. Vui lòng yêu cầu email mới.',
            'token.regex' => 'Liên kết không hợp lệ. Vui lòng yêu cầu email mới.',
            'password.required' => 'Vui lòng nhập mật khẩu mới.',
            'password.min' => 'Mật khẩu mới cần ít nhất 8 ký tự.',
            'password.max' => 'Mật khẩu mới tối đa 72 ký tự.',
            'password.confirmed' => 'Mật khẩu xác nhận chưa khớp.',
        ]);

        $status = DB::transaction(function () use ($data) {
            // Serialize attempts for this token so it cannot be consumed twice concurrently.
            DB::table(config('auth.passwords.users.table'))
                ->where('email', $data['email'])->lockForUpdate()->first();

            return Password::broker('users')->reset(
                array_merge($data, ['status' => 'active']),
                function ($user, string $password) {
                    $user->forceFill([
                        'password' => Hash::make($password),
                    ])->save();
                    $user->tokens()->delete();
                    event(new PasswordReset($user));
                }
            );
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'success' => false,
                'message' => 'Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu email đặt lại mật khẩu mới.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
        ]);
    }
}
