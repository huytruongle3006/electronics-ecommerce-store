<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipping_addresses', function (Blueprint $table) {
            $table->id();
            // The supplied SQL uses signed INT user ids. Keep the legacy schema intact.
            $table->unsignedBigInteger('user_id')->index();
            $table->string('label', 50)->nullable();
            $table->string('recipient_name', 100);
            $table->string('recipient_phone', 20);
            $table->text('shipping_address');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_addresses');
    }
};
