<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Nạp sẵn cấu hình mặc định ban đầu
        $defaults = [
            'store_name'          => 'TECHSTORE - Hệ Thống Thiết Bị Điện Tử',
            'store_phone'         => '0901234567',
            'store_email'         => 'support@techstore.vn',
            'store_address'       => '140 Lê Trọng Tấn, Tây Thạnh, Tân Phú, TP.HCM',
            'shipping_fee'        => '30000',
            'free_shipping_limit' => '5000000',
            'tax_percent'         => '8',
            'enable_cod'          => '1',
            'enable_bank'         => '1',
            'bank_info'           => 'MB Bank - 0901234567 - CONG TY TECHSTORE',
            'maintenance_mode'    => '0',
        ];

        foreach ($defaults as $key => $val) {
            DB::table('settings')->insert([
                'key'        => $key,
                'value'      => $val,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};