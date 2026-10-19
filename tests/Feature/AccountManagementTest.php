<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\Support\AccountTestCase;

class AccountManagementTest extends AccountTestCase
{
    public function test_account_changes_require_authentication(): void
    {
        $this->putJson('/api/profile', [])->assertUnauthorized();
        $this->putJson('/api/profile/password', [])->assertUnauthorized();
    }

    public function test_profile_updates_only_the_authenticated_users_allowed_fields(): void
    {
        $user = $this->account();
        $other = $this->account('other@example.test');
        $oldHash = $user->password;

        $this->actingAs($user, 'sanctum')->putJson('/api/profile', [
            'id' => $other->id,
            'full_name' => 'Tên mới',
            'phone' => '0912345678',
            'address' => '123 Nguyễn Trãi',
            'email' => 'changed@example.test',
            'status' => 'inactive',
            'password' => 'InjectedPassword',
            'roles' => ['ADMIN'],
        ])->assertOk()->assertJsonPath('user.full_name', 'Tên mới')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonMissingPath('user.password');

        $user->refresh();
        $this->assertSame('0912345678', $user->phone);
        $this->assertSame('123 Nguyễn Trãi', $user->address);
        $this->assertSame('active', $user->status);
        $this->assertSame($oldHash, $user->password);
        $this->assertSame('Khách hàng', $other->fresh()->full_name);
        $this->assertSame(0, $user->roles()->count());
    }

    public function test_profile_rejects_invalid_fields_and_can_clear_optional_fields(): void
    {
        $user = $this->account();
        $this->actingAs($user, 'sanctum')->putJson('/api/profile', [
            'full_name' => '   ', 'phone' => 'abc', 'address' => str_repeat('a', 1001),
        ])->assertUnprocessable()->assertJsonValidationErrors(['full_name', 'phone', 'address']);
        $this->putJson('/api/profile', [
            'full_name' => 'Khách hàng', 'phone' => '', 'address' => '',
        ])->assertOk();
        $this->assertNull($user->fresh()->phone);
        $this->assertNull($user->fresh()->address);
    }

    public function test_wrong_current_password_does_not_change_password_or_revoke_tokens(): void
    {
        $user = $this->account();
        $user->createToken('existing');
        $this->actingAs($user, 'sanctum')->putJson('/api/profile/password', [
            'current_password' => 'WrongPassword',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_new_password_must_be_confirmed_long_enough_and_different(): void
    {
        $user = $this->account();
        $this->actingAs($user, 'sanctum');
        foreach ([
            ['short', 'short'],
            ['NewPassword123!', 'Mismatch'],
            ['OldPassword123!', 'OldPassword123!'],
            [str_repeat('a', 73), str_repeat('a', 73)],
            [str_repeat('ệ', 25), str_repeat('ệ', 25)],
        ] as [$password, $confirmation]) {
            $this->putJson('/api/profile/password', [
                'current_password' => 'OldPassword123!',
                'password' => $password,
                'password_confirmation' => $confirmation,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->assertTrue(Hash::check('OldPassword123!', $user->fresh()->password));
    }

    public function test_password_is_hashed_and_all_personal_tokens_are_revoked(): void
    {
        $user = $this->account();
        $other = $this->account('other@example.test');
        $user->createToken('device-one');
        $user->createToken('device-two');
        $other->createToken('other-user');

        $this->actingAs($user, 'sanctum')->putJson('/api/profile/password', [
            'current_password' => 'OldPassword123!',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
        $this->assertFalse(Hash::check('OldPassword123!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
    }
}
