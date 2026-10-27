<?php
namespace Tests\Feature;

use App\Models\{SupportThread,SupportMessage,StoreNotification};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\Support\OrderTestCase;

class SupportConversationTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__.'/../../database/migrations/2026_10_27_150000_create_support_conversations_tables.php')->up();
    }
    private function payload(array $extra=[]): array{return array_merge(['subject'=>'Cần hỗ trợ đơn hàng','body'=>'Cho tôi hỏi thời gian giao hàng','client_id'=>(string)Str::uuid()],$extra);}
    private function create($user,array $extra=[]): int
    {
        return $this->actingAs($user,'sanctum')->postJson('/api/support',$this->payload($extra))->assertCreated()->json('data.id');
    }
    public function test_guests_and_non_admin_cannot_access_protected_support_endpoints(): void
    {
        $this->getJson('/api/support')->assertUnauthorized();$this->postJson('/api/support',$this->payload())->assertUnauthorized();
        $this->actingAs($this->account(),'sanctum')->getJson('/api/admin/support')->assertForbidden();
        $this->postJson('/api/admin/support/1/messages',$this->payload())->assertForbidden();
        $this->putJson('/api/admin/support/1/status',['status'=>'resolved','expected_version'=>1])->assertForbidden();
    }
    public function test_user_creates_own_thread_with_optional_order_and_notifies_active_admin(): void
    {
        $u=$this->account();$admin=$this->administrator();$order=$this->purchase($u);$id=$this->create($u,['order_id'=>$order->id]);
        $this->assertDatabaseHas('support_threads',['id'=>$id,'user_id'=>$u->id,'order_id'=>$order->id,'status'=>'open']);$this->assertDatabaseCount('support_messages',1);
        $notice=StoreNotification::first();$this->assertSame($admin->id,$notice->user_id);$this->assertSame('support',$notice->target_type);$this->assertSame($id,$notice->target_id);
        $this->getJson("/api/support/$id")->assertOk()->assertJsonPath('thread.order_code',$order->maDH)->assertJsonPath('messages.0.sender_role','customer')->assertJsonMissingPath('thread.customer')->assertJsonMissingPath('thread.client_id')->assertJsonMissingPath('messages.0.fingerprint');
    }
    public function test_cannot_link_another_customers_order(): void
    {
        $u=$this->account();$other=$this->account('other@test.test');$order=$this->purchase($other);
        $this->actingAs($u,'sanctum')->postJson('/api/support',$this->payload(['order_id'=>$order->id]))->assertUnprocessable();$this->assertDatabaseCount('support_threads',0);$this->assertDatabaseCount('support_messages',0);
    }
    public function test_customer_cannot_list_read_send_or_mark_read_for_other_threads(): void
    {
        $u=$this->account();$id=$this->create($u);$this->actingAs($this->account('other@test.test'),'sanctum');
        $this->getJson('/api/support?search='.urlencode('Cần hỗ trợ'))->assertJsonPath('data.total',0);
        $this->getJson("/api/support/$id")->assertNotFound();$this->postJson("/api/support/$id/messages",$this->payload())->assertNotFound();$this->putJson("/api/support/$id/read",['through_id'=>999])->assertNotFound();
        $this->assertDatabaseCount('support_messages',1);
    }
    public function test_create_retry_replays_same_request_without_duplicate_thread_message_or_notice(): void
    {
        $u=$this->account();$this->administrator();$payload=$this->payload();$this->actingAs($u,'sanctum');
        $id=$this->postJson('/api/support',$payload)->assertCreated()->json('data.id');$this->postJson('/api/support',$payload)->assertOk()->assertJsonPath('data.id',$id)->assertJsonPath('replayed',true);
        $this->postJson('/api/support',array_merge($payload,['body'=>'Đổi nội dung']))->assertConflict();
        $this->assertDatabaseCount('support_threads',1);$this->assertDatabaseCount('support_messages',1);$this->assertDatabaseCount('store_notifications',1);
    }
    public function test_admin_reply_notifies_only_owner_and_customer_receives_admin_message(): void
    {
        $u=$this->account();$other=$this->account('other@test.test');$admin=$this->administrator();$id=$this->create($u);$this->actingAs($admin,'sanctum');
        $this->postJson("/api/admin/support/$id/messages",['body'=>'Cửa hàng sẽ giao ngày mai','client_id'=>(string)Str::uuid(),'sender_role'=>'customer','sender_id'=>$other->id])->assertCreated()->assertJsonPath('message.sender_role','admin')->assertJsonPath('message.sender_name','Nhân viên cửa hàng');
        $this->assertDatabaseHas('support_threads',['id'=>$id,'status'=>'in_progress','version'=>2]);
        $this->actingAs($u,'sanctum')->getJson("/api/support/$id")->assertJsonPath('thread.unread_count',1)->assertJsonPath('messages.1.body','Cửa hàng sẽ giao ngày mai');
        $this->getJson('/api/notifications')->assertJsonPath('unread_count',1)->assertJsonPath('data.data.0.target_type','support');
        $this->actingAs($other,'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count',0);
    }
    public function test_message_retry_does_not_duplicate_notification_or_reopen_resolved_thread(): void
    {
        $u=$this->account();$admin=$this->administrator();$id=$this->create($u);$payload=['body'=>'Phản hồi từ cửa hàng','client_id'=>(string)Str::uuid()];$this->actingAs($admin,'sanctum');
        $this->postJson("/api/admin/support/$id/messages",$payload)->assertCreated();
        $this->putJson("/api/admin/support/$id/status",['status'=>'resolved','expected_version'=>2])->assertOk();
        $this->postJson("/api/admin/support/$id/messages",$payload)->assertOk()->assertJsonPath('replayed',true);
        $this->assertSame('resolved',SupportThread::find($id)->status);$this->assertDatabaseCount('support_messages',2);$this->assertDatabaseCount('store_notifications',3);
        $this->postJson("/api/admin/support/$id/messages",array_merge($payload,['body'=>'Nội dung khác']))->assertConflict();
    }
    public function test_status_optimistic_conflict_and_customer_reply_reopen_resolved_thread(): void
    {
        $u=$this->account();$admin=$this->administrator();$id=$this->create($u);$this->actingAs($admin,'sanctum');
        $this->putJson("/api/admin/support/$id/status",['status'=>'resolved','expected_version'=>99])->assertConflict();
        $this->putJson("/api/admin/support/$id/status",['status'=>'resolved','expected_version'=>1])->assertOk();
        $this->putJson("/api/admin/support/$id/status",['status'=>'resolved','expected_version'=>1])->assertOk();$this->assertDatabaseCount('store_notifications',2);
        $this->actingAs($u,'sanctum')->postJson("/api/support/$id/messages",['body'=>'Tôi cần hỏi thêm','client_id'=>(string)Str::uuid(),'sender_role'=>'admin'])->assertCreated()->assertJsonPath('message.sender_role','customer');
        $this->assertSame('open',SupportThread::find($id)->status);
    }
    public function test_read_cursor_is_monotonic_and_does_not_mark_newer_reply_read_or_reorder_inbox(): void
    {
        $u=$this->account();$admin=$this->administrator();$id=$this->create($u);$this->actingAs($admin,'sanctum');
        $one=$this->postJson("/api/admin/support/$id/messages",['body'=>'Tin 1','client_id'=>(string)Str::uuid()])->json('message.id');
        $two=$this->postJson("/api/admin/support/$id/messages",['body'=>'Tin 2','client_id'=>(string)Str::uuid()])->json('message.id');
        $before=SupportThread::find($id)->updated_at->toIso8601String();$version=SupportThread::find($id)->version;$this->travel(2)->hours();
        $this->actingAs($u,'sanctum')->putJson("/api/support/$id/read",['through_id'=>$one])->assertOk()->assertJsonPath('unread_count',1);
        $this->putJson("/api/support/$id/read",['through_id'=>0])->assertOk()->assertJsonPath('unread_count',1);
        $this->assertSame($one,SupportThread::find($id)->customer_read_id);$this->assertSame($before,SupportThread::find($id)->updated_at->toIso8601String());$this->assertSame($version,SupportThread::find($id)->version);
        $this->putJson("/api/support/$id/read",['through_id'=>$two])->assertJsonPath('unread_count',0);
    }
    public function test_message_pagination_supports_latest_older_and_incremental_without_gaps(): void
    {
        $u=$this->account();$id=$this->create($u);foreach(range(1,64) as $n)SupportMessage::create(['thread_id'=>$id,'sender_id'=>$u->id,'sender_role'=>'customer','body'=>'Tin '.$n,'client_id'=>(string)Str::uuid(),'fingerprint'=>str_repeat('a',64),'created_at'=>now()]);
        $this->getJson("/api/support/$id")->assertOk()->assertJsonCount(30,'messages')->assertJsonPath('messages.0.id',36)->assertJsonPath('has_more_before',true);
        $this->getJson("/api/support/$id?before_id=36")->assertJsonCount(30,'messages')->assertJsonPath('messages.0.id',6)->assertJsonPath('messages.29.id',35);
        $this->getJson("/api/support/$id?after_id=0")->assertJsonPath('messages.0.id',1)->assertJsonPath('messages.29.id',30)->assertJsonPath('has_more_after',true);
        $this->getJson("/api/support/$id?after_id=30")->assertJsonPath('messages.0.id',31)->assertJsonPath('messages.29.id',60);
        $this->getJson("/api/support/$id?after_id=60")->assertJsonCount(5,'messages')->assertJsonPath('has_more_after',false);
        $this->getJson("/api/support/$id?after_id=1&before_id=10")->assertUnprocessable();
    }
    public function test_input_limits_and_no_client_user_or_sender_role_override(): void
    {
        $u=$this->account();$this->actingAs($u,'sanctum');
        foreach([['subject'=>' '],['subject'=>str_repeat('a',161)],['body'=>' '],['body'=>str_repeat('a',4001)],['client_id'=>'bad']] as $bad)$this->postJson('/api/support',$this->payload($bad))->assertUnprocessable();
        $id=$this->create($u,['user_id'=>999]);$this->assertSame($u->id,SupportThread::find($id)->user_id);
        $this->postJson("/api/support/$id/messages",['body'=>'   ','client_id'=>(string)Str::uuid()])->assertUnprocessable();
        $this->putJson("/api/support/$id/read",['through_id'=>-1])->assertUnprocessable();$this->getJson('/api/support?status=bad')->assertUnprocessable();
    }
    public function test_shared_admin_read_cursor_and_admin_list_customer_search(): void
    {
        $u=$this->account();$admin=$this->administrator();$id=$this->create($u);$second=$this->account('admin2@test.test');DB::table('users_roles')->insert(['user_id'=>$second->id,'role_id'=>DB::table('roles')->where('maRole','ADMIN')->value('id')]);
        $this->actingAs($admin,'sanctum')->getJson('/api/admin/support?search='.urlencode($u->email))->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.unread_count',1);
        $this->putJson("/api/admin/support/$id/read",['through_id'=>SupportMessage::max('id')])->assertJsonPath('unread_count',0);
        $this->actingAs($second,'sanctum')->getJson('/api/admin/support')->assertJsonPath('data.data.0.unread_count',0)->assertJsonMissingPath('data.data.0.customer.password');
    }
    public function test_create_and_reply_are_rolled_back_if_notification_storage_fails(): void
    {
        $u=$this->account();$admin=$this->administrator();$this->actingAs($u,'sanctum');
        Event::listen('eloquent.creating: '.StoreNotification::class,function(){throw new \RuntimeException('Notice failed');});
        try{$this->postJson('/api/support',$this->payload())->assertStatus(500);}finally{Event::forget('eloquent.creating: '.StoreNotification::class);}
        $this->assertDatabaseCount('support_threads',0);$this->assertDatabaseCount('support_messages',0);
        $id=$this->create($u);$this->actingAs($admin,'sanctum');Event::listen('eloquent.creating: '.StoreNotification::class,function(){throw new \RuntimeException('Notice failed');});
        try{$this->postJson("/api/admin/support/$id/messages",['body'=>'Xin chào','client_id'=>(string)Str::uuid()])->assertStatus(500);}finally{Event::forget('eloquent.creating: '.StoreNotification::class);}
        $this->assertDatabaseCount('support_messages',1);$this->assertSame(1,SupportThread::find($id)->version);$this->assertSame('open',SupportThread::find($id)->status);
    }
    public function test_polling_reads_do_not_consume_the_message_sending_rate_limit(): void
    {
        $u=$this->account();$id=$this->create($u);
        foreach(range(1,20) as $i)$this->getJson("/api/support/$id")->assertOk();
        $this->postJson("/api/support/$id/messages",['body'=>'Vẫn gửi được sau nhiều lần tải tin','client_id'=>(string)Str::uuid()])->assertCreated();
    }
}
