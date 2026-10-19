<?php
namespace Tests\Feature;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Tests\TestCase;
class GmailMailCheckTest extends TestCase
{
    private function setupGmail(): void
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.url' => null, 'mail.mailers.smtp.host' => 'smtp.gmail.com', 'mail.mailers.smtp.port' => 587, 'mail.mailers.smtp.scheme' => 'smtp', 'mail.mailers.smtp.username' => 'sender@example.test', 'mail.mailers.smtp.password' => 'abcdefghijklmnop', 'mail.from.address' => 'sender@example.test']);
    }
    public function test_log_mode_is_not_reported_as_real_delivery(): void
    {
        config(['mail.default' => 'log']);
        $this->artisan('techstore:mail-check')->expectsOutputToContain('Chế độ log không gửi email thật')->assertExitCode(1);
    }
    public function test_missing_credentials_are_rejected_and_check_alone_does_not_send(): void
    {
        $this->setupGmail(); Mail::shouldReceive('mailer')->never();
        config(['mail.mailers.smtp.password' => '']); $this->artisan('techstore:mail-check')->assertExitCode(1);
        config(['mail.mailers.smtp.password' => 'abcdefghijklmnop']); $this->artisan('techstore:mail-check')->expectsOutputToContain('Chưa kết nối hay gửi email')->assertExitCode(0);
    }
    public function test_explicit_send_requires_recipient_and_uses_smtp_transport(): void
    {
        $this->setupGmail(); $this->artisan('techstore:mail-check --send')->assertExitCode(1);
        $mailer = Mockery::mock(\Illuminate\Mail\Mailer::class);
        Mail::shouldReceive('mailer')->once()->with('smtp')->andReturn($mailer);
        $mailer->shouldReceive('raw')->once()->withArgs(function ($text, $callback) {
            $message = Mockery::mock(\Illuminate\Mail\Message::class);
            $message->shouldReceive('to')->once()->with('receiver@example.test')->andReturnSelf();
            $message->shouldReceive('subject')->once()->with('TECHSTORE — Kiểm tra gửi email')->andReturnSelf();
            $callback($message); return str_contains($text, 'không chứa liên kết');
        });
        $this->artisan('techstore:mail-check --send --to=receiver@example.test')->expectsOutputToContain('Máy chủ Gmail đã tiếp nhận thư thử')->assertExitCode(0);
    }
    public function test_smtp_errors_do_not_print_credentials(): void
    {
        $this->setupGmail(); $mailer = Mockery::mock(\Illuminate\Mail\Mailer::class);
        Mail::shouldReceive('mailer')->once()->with('smtp')->andReturn($mailer);
        $mailer->shouldReceive('raw')->andThrow(new \RuntimeException('535 authentication abcdefghijklmnop secret context'));
        $this->assertSame(1, Artisan::call('techstore:mail-check', ['--send' => true, '--to' => 'receiver@example.test']));
        $this->assertStringContainsString('Gmail từ chối đăng nhập', Artisan::output());
        $this->assertStringNotContainsString('abcdefghijklmnop', Artisan::output());
    }
}
