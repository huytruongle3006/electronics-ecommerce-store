<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_rebuy_batches', function (Blueprint $table) {
            $table->id();
            // Original SQL uses signed INT ids. Do not introduce incompatible foreign keys.
            $table->unsignedBigInteger('user_id'); $table->unsignedBigInteger('order_id');
            $table->uuid('batch_id'); $table->string('fingerprint',64);
            $table->text('result'); $table->timestamp('created_at');
            $table->unique(['user_id','batch_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('order_rebuy_batches'); }
};
