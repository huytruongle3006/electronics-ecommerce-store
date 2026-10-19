<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            // Legacy SQL uses signed INT identifiers; avoid incompatible foreign key types.
            $table->unsignedBigInteger('order_id')->unique();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('kind', 30);
            $table->string('status', 30)->default('requested')->index();
            $table->text('reason');
            $table->json('evidence_urls')->nullable();
            $table->text('refund_instructions')->nullable();
            $table->decimal('amount', 15, 2);
            $table->text('admin_note')->nullable();
            $table->boolean('restocked')->default(false);
            $table->unsignedBigInteger('received_by')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->unsignedBigInteger('refunded_by')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_reference', 100)->nullable();
            $table->timestamps();
        });
        Schema::create('return_request_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained('return_requests');
            $table->unsignedBigInteger('actor_id');
            $table->string('action', 30);
            $table->text('note')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_request_events');
        Schema::dropIfExists('return_requests');
    }
};
