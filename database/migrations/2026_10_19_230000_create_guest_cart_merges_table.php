<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void
    {
        Schema::create('guest_cart_merges', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('user_id'); $table->uuid('batch_id');
            $table->string('fingerprint', 64); $table->json('result'); $table->timestamp('created_at');
            $table->unique(['user_id', 'batch_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('guest_cart_merges'); }
};
