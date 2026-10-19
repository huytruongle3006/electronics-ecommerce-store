<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('techstore:mail-check {--to= : Dia chi nhan thu thu} {--send : Gui thu thu that}', function () {
    if (config('mail.default') !== 'smtp') {
        $this->error('MAIL_MAILER chưa phải smtp. Chế độ log không gửi email thật.'); return 1;
    }
    if (config('mail.mailers.smtp.url')) {
        $this->error('Đang có MAIL_URL ghi đè cấu hình. Hãy bỏ MAIL_URL cũ và chạy optimize:clear.'); return 1;
    }
    $smtp = config('mail.mailers.smtp');
    $username = $smtp['username'] ?? ''; $password = $smtp['password'] ?? '';
    $from = config('mail.from.address');
    if (($smtp['host'] ?? '') !== 'smtp.gmail.com' || !in_array((int) ($smtp['port'] ?? 0), [465, 587], true)) {
        $this->error('Gmail cần MAIL_HOST=smtp.gmail.com và cổng 587 (smtp) hoặc 465 (smtps).'); return 1;
    }
    if (((int) $smtp['port'] === 587 && ($smtp['scheme'] ?? '') !== 'smtp') || ((int) $smtp['port'] === 465 && ($smtp['scheme'] ?? '') !== 'smtps')) {
        $this->error('MAIL_SCHEME không khớp cổng: 587 dùng smtp, 465 dùng smtps.'); return 1;
    }
    if (!filter_var($username, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL) || strtolower($username) !== strtolower($from)) {
        $this->error('MAIL_USERNAME và MAIL_FROM_ADDRESS cần cùng địa chỉ Gmail gửi thư.'); return 1;
    }
    if (!is_string($password) || preg_match('/\s/', $password) || strlen($password) !== 16 || str_contains($password, 'dien_')) {
        $this->error('Điền mật khẩu ứng dụng Gmail 16 ký tự trong MAIL_PASSWORD, bỏ khoảng trắng hiển thị của Google.'); return 1;
    }
    if (!extension_loaded('openssl')) { $this->error('PHP chưa bật OpenSSL để kết nối TLS.'); return 1; }
    if (!$this->option('send')) {
        $this->info('Cấu hình Gmail đã đủ trường. Chưa kết nối hay gửi email.');
        $this->line('Để gửi thử: php artisan techstore:mail-check --send --to=dia_chi_nhan@example.com'); return 0;
    }
    $recipient = $this->option('to');
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) { $this->error('Cần --to là email nhận thư hợp lệ.'); return 1; }
    try {
        \Illuminate\Support\Facades\Mail::mailer('smtp')->raw('Đây là email kiểm tra cấu hình Gmail của TECHSTORE. Thư này không chứa liên kết đổi mật khẩu.', function ($message) use ($recipient) {
            $message->to($recipient)->subject('TECHSTORE — Kiểm tra gửi email');
        });
        $this->info('Máy chủ Gmail đã tiếp nhận thư thử. Hãy kiểm tra Hộp thư đến và Spam.'); return 0;
    } catch (\Throwable $error) {
        // SMTP exceptions can contain authentication details. Never print or log the raw exception.
        $text = strtolower($error->getMessage());
        if (str_contains($text, '535') || str_contains($text, 'authentication') || str_contains($text, 'credentials')) $this->error('Gmail từ chối đăng nhập. Kiểm tra email và mật khẩu ứng dụng, không dùng mật khẩu Gmail thường.');
        elseif (str_contains($text, 'certificate') || str_contains($text, 'crypto')) $this->error('Không xác minh được kết nối TLS. Kiểm tra chứng chỉ CA của PHP và thời gian máy; giữ bật xác minh TLS.');
        else $this->error('Không gửi được qua Gmail. Kiểm tra kết nối mạng, cổng SMTP và cấu hình; thử lại sau.');
        return 1;
    }
})->purpose('Kiem tra cau hinh Gmail va gui email thu khi co --send');
