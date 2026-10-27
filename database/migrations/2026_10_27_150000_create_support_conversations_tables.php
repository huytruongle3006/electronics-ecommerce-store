<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_threads',function(Blueprint $t){
            $t->id();$t->unsignedBigInteger('user_id');$t->unsignedBigInteger('order_id')->nullable();
            $t->string('subject',160);$t->string('status',20)->default('open');$t->unsignedInteger('version')->default(1);
            $t->uuid('client_id');$t->string('fingerprint',64);$t->unsignedBigInteger('customer_read_id')->default(0);$t->unsignedBigInteger('admin_read_id')->default(0);
            $t->timestamp('last_message_at')->nullable();$t->timestamps();
            $t->unique(['user_id','client_id']);$t->index(['user_id','updated_at']);$t->index(['status','last_message_at']);
        });
        Schema::create('support_messages',function(Blueprint $t){
            $t->id();$t->unsignedBigInteger('thread_id');$t->unsignedBigInteger('sender_id');$t->string('sender_role',12);
            $t->text('body');$t->uuid('client_id');$t->string('fingerprint',64);$t->timestamp('created_at');
            $t->unique(['thread_id','sender_id','client_id']);$t->index(['thread_id','id']);
        });
    }
    public function down(): void {Schema::dropIfExists('support_messages');Schema::dropIfExists('support_threads');}
};
