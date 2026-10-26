<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vouchers', fn (Blueprint $table) => $table->unsignedInteger('per_user_limit')->default(1));
    }
    public function down(): void
    {
        Schema::table('vouchers', fn (Blueprint $table) => $table->dropColumn('per_user_limit'));
    }
};
