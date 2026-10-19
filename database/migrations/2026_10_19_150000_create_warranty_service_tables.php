<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warranty_service_requests', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('warranty_id')->index(); $table->unsignedBigInteger('user_id')->index();
            $table->string('status', 30)->default('requested')->index(); $table->text('problem');
            $table->string('contact_phone', 20); $table->text('admin_note')->nullable(); $table->text('resolution')->nullable();
            $table->timestamps();
        });
        Schema::create('warranty_service_events', function (Blueprint $table) {
            $table->id(); $table->foreignId('warranty_service_request_id')->constrained('warranty_service_requests');
            $table->unsignedBigInteger('actor_id'); $table->string('action', 30); $table->text('note')->nullable(); $table->timestamp('created_at');
        });
        Schema::create('warranty_events', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('warranty_id')->index(); $table->unsignedBigInteger('actor_id');
            $table->string('action', 30); $table->text('note'); $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranty_events');
        Schema::dropIfExists('warranty_service_events');
        Schema::dropIfExists('warranty_service_requests');
    }
};
