<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetUserPassword extends Notification
{
    public function __construct(public string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // The fragment is read by React and is not sent in HTTP requests or referrers.
        $url = rtrim(config('app.url'), '/') . '/reset-password#' . http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], '', '&', PHP_QUERY_RFC3986);

        return (new MailMessage)
            ->subject('TECHSTORE — Đặt lại mật khẩu')
            ->greeting('Xin chào ' . $notifiable->full_name . ',')
            ->line('Bạn nhận được email này vì có yêu cầu đặt lại mật khẩu cho tài khoản TECHSTORE.')
            ->action('Đặt lại mật khẩu', $url)
            ->line('Liên kết có hiệu lực trong ' . config('auth.passwords.users.expire') . ' phút và chỉ dùng được một lần.')
            ->line('Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.')
            ->salutation('TECHSTORE');
    }
}
