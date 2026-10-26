<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('store_notifications', function (Blueprint $table) {
            $table->id();
            // Compatible with the signed INT ids in the original SQL dump.
            $table->unsignedBigInteger('user_id');
            $table->string('event_key', 160)->unique();
            $table->string('title', 160);
            $table->text('body');
            $table->string('target_type', 20);
            $table->unsignedBigInteger('target_id');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at');
            $table->index(['user_id', 'id']);
            $table->index(['user_id', 'read_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('store_notifications'); }
};
