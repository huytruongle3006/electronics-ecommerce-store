<?php

namespace Tests\Feature;

use App\Notifications\ResetUserPassword;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Support\AccountTestCase;

class PasswordRecoveryTest extends AccountTestCase
{
    public function test_recovery_email_is_rendered_and_delivered_to_the_mail_transport(): void
    {
        $user = $this->account();
        config(['app.url' => 'https://shop.example.test', 'mail.default' => 'array']);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $email = $messages->first()->getOriginalMessage();
        $this->assertSame($user->email, $email->getTo()[0]->getAddress());
        $this->assertStringContainsString('https://shop.example.test/reset-password#', $email->getHtmlBody());
        $this->assertStringContainsString('TECHSTORE', $email->getSubject());
    }

    public function test_transport_failure_keeps_the_same_public_response(): void
    {
        $user = $this->account();
        Password::shouldReceive('broker')->once()->with('users')->andReturnSelf();
        Password::shouldReceive('sendResetLink')->once()->andThrow(new \RuntimeException('Simulated mail failure'));
        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()->assertJsonPath('success', true)->assertJsonMissingPath('token');
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    public function test_request_sends_notification_and_stores_only_a_hashed_token(): void
    {
        Notification::fake();
        $user = $this->account();
        config(['app.url' => 'https://shop.example.test']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()->assertJsonPath('success', true)->assertJsonMissingPath('token');

        Notification::assertSentTo($user, ResetUserPassword::class, function ($notification) use ($user) {
            $stored = DB::table('password_reset_tokens')->where('email', $user->email)->first();
            $this->assertNotSame($notification->token, $stored->token);
            $this->assertTrue(Hash::check($notification->token, $stored->token));
            $mail = $notification->toMail($user);
            $this->assertStringStartsWith('https://shop.example.test/reset-password#', $mail->actionUrl);
            $this->assertStringContainsString('token=' . $notification->token, $mail->actionUrl);
            $this->assertStringContainsString('email=customer%40example.test', $mail->actionUrl);
            return true;
        });
    }

    public function test_unknown_inactive_and_recently_requested_accounts_get_same_public_response(): void
    {
        Notification::fake();
        $user = $this->account();
        $inactive = $this->account('inactive@example.test');
        $inactive->update(['status' => 'inactive']);
        $activeResponse = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->json();
        foreach ([$user->email, $inactive->email, 'unknown@example.test'] as $email) {
            $this->assertSame($activeResponse, $this->postJson('/api/forgot-password', ['email' => $email])->assertOk()->json());
        }
        Notification::assertSentToTimes($user, ResetUserPassword::class, 1);
        Notification::assertNotSentTo($inactive, ResetUserPassword::class);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $inactive->email]);
    }

    public function test_valid_link_resets_password_revokes_tokens_and_cannot_be_replayed(): void
    {
        $user = $this->account();
        $other = $this->account('other@example.test');
        $user->createToken('device-one');
        $user->createToken('device-two');
        $other->createToken('other-user');
        $token = Password::broker('users')->createToken($user);
        $payload = ['email' => $user->email, 'token' => $token, 'password' => 'RecoveredPassword123!', 'password_confirmation' => 'RecoveredPassword123!'];

        $this->postJson('/api/reset-password', $payload)->assertOk()->assertJsonPath('success', true);
        $this->assertTrue(Hash::check('RecoveredPassword123!', $user->fresh()->password));
        $this->assertFalse(Hash::check('OldPassword123!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'OldPassword123!'])->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'RecoveredPassword123!'])->assertOk();
    }

    public function test_expired_forged_and_cross_account_tokens_do_not_change_password(): void
    {
        $user = $this->account();
        $other = $this->account('other@example.test');
        $token = Password::broker('users')->createToken($user);
        $payload = ['email' => $user->email, 'token' => str_repeat('a', 64), 'password' => 'RecoveredPassword123!', 'password_confirmation' => 'RecoveredPassword123!'];
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
        $this->postJson('/api/reset-password', array_merge($payload, ['email' => $other->email, 'token' => $token]))->assertUnprocessable();
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['created_at' => now()->subMinutes(61)]);
        $this->postJson('/api/reset-password', array_merge($payload, ['token' => $token]))->assertUnprocessable();
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
        $this->assertTrue(Hash::check('OldPassword123!', $other->fresh()->password));
    }

    public function test_disabled_account_cannot_reset_password(): void
    {
        $user = $this->account();
        $token = Password::broker('users')->createToken($user);
        $user->update(['status' => 'banned']);
        $this->postJson('/api/reset-password', [
            'email' => $user->email, 'token' => $token,
            'password' => 'RecoveredPassword123!', 'password_confirmation' => 'RecoveredPassword123!',
        ])->assertUnprocessable();
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    public function test_recovery_validates_email_token_and_new_password(): void
    {
        $this->postJson('/api/forgot-password', ['email' => 'not-an-email'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $user = $this->account();
        $token = Password::broker('users')->createToken($user);
        foreach ([['short', 'short'], ['RecoveredPassword123!', 'Mismatch'], [str_repeat('a', 73), str_repeat('a', 73)], [str_repeat('ệ', 25), str_repeat('ệ', 25)]] as [$password, $confirmation]) {
            $this->postJson('/api/reset-password', [
                'email' => $user->email, 'token' => $token,
                'password' => $password, 'password_confirmation' => $confirmation,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->postJson('/api/reset-password', [
            'email' => $user->email, 'token' => 'invalid',
            'password' => 'RecoveredPassword123!', 'password_confirmation' => 'RecoveredPassword123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    public function test_forgot_password_rate_limit(): void
    {
        Notification::fake();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertOk();
        }
        $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertStatus(429);
    }

    public function test_new_link_replaces_old_link(): void
    {
        $user = $this->account();
        $oldToken = Password::broker('users')->createToken($user);
        $newToken = Password::broker('users')->createToken($user);
        $payload = ['email' => $user->email, 'password' => 'RecoveredPassword123!', 'password_confirmation' => 'RecoveredPassword123!'];
        $this->postJson('/api/reset-password', array_merge($payload, ['token' => $oldToken]))->assertUnprocessable();
        $this->postJson('/api/reset-password', array_merge($payload, ['token' => $newToken]))->assertOk();
    }

    public function test_reset_password_rate_limit(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/reset-password', [])->assertUnprocessable();
        }
        $this->postJson('/api/reset-password', [])->assertStatus(429);
    }
}
