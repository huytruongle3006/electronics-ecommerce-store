<?php

namespace Tests\Support;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

abstract class AccountTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:' . base64_encode(str_repeat('t', 32))]);

        // The supplied SQL dump has a different users schema from the starter migrations.
        // Use an isolated, in-memory schema matching the account fields; never touch MySQL.
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        app('db')->purge('sqlite');
        (require __DIR__.'/../../database/migrations/2026_10_26_140000_create_store_notifications_table.php')->up();
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('maUser')->unique();
            $table->string('full_name', 100);
            $table->string('email', 100)->unique();
            $table->string('password');
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('status');
            $table->timestamps();
        });
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('maRole');
            $table->string('tenRole');
            $table->timestamps();
        });
        Schema::create('users_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id');
        });
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    protected function account(string $email = 'customer@example.test'): User
    {
        return User::create([
            'maUser' => $email,
            'full_name' => 'Khách hàng',
            'email' => $email,
            'password' => Hash::make('OldPassword123!'),
            'status' => 'active',
        ]);
    }

}
