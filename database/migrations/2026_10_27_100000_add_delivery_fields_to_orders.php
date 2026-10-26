<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->string('carrier_name', 100)->nullable();
            $t->string('tracking_number', 100)->nullable();
            $t->date('estimated_delivery_date')->nullable();
            $t->timestamp('dispatched_at')->nullable();
            $t->timestamp('delivered_at')->nullable();
            $t->timestamp('receipt_confirmed_at')->nullable();
            $t->unsignedInteger('delivery_version')->default(0);
        });
    }
    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['carrier_name','tracking_number','estimated_delivery_date','dispatched_at','delivered_at','receipt_confirmed_at','delivery_version']));
    }
};
