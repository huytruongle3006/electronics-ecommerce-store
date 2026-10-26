<?php

namespace Tests\Feature;

use App\Models\{Order, OrderHistory, Payment, Product, StoreNotification};
use Illuminate\Support\Facades\Event;
use Tests\Support\OrderTestCase;

class OrderDeliveryTest extends OrderTestCase
{
    private function delivery(int $version=0): array
    {
        return ['carrier_name'=>'  Giao hàng nhanh  ','tracking_number'=>'  GHN-12345  ',
            'estimated_delivery_date'=>now('Asia/Ho_Chi_Minh')->addDays(2)->toDateString(),'expected_version'=>$version];
    }
    public function test_delivery_admin_permissions_and_receipt_ownership(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping',false);
        $this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertUnauthorized();
        $this->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertUnauthorized();
        $this->actingAs($u,'sanctum')->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertForbidden();
        $this->getJson("/api/admin/orders/$o->id/delivery")->assertForbidden();
        $this->actingAs($this->account('other@test.test'),'sanctum')->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertNotFound();
        $this->assertDatabaseCount('store_notifications',0);$this->assertSame('shipping',$o->fresh()->status);
    }
    public function test_admin_saves_shipping_details_and_notifies_only_owner(): void
    {
        $u=$this->account();$o=$this->purchase($u,'confirmed',false);$a=$this->administrator();$this->actingAs($a,'sanctum');
        $this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertOk()->assertJsonPath('data.carrier_name','Giao hàng nhanh')
            ->assertJsonPath('data.tracking_number','GHN-12345')->assertJsonPath('data.delivery_version',1)->assertJsonPath('data.status','confirmed');
        $notice=StoreNotification::first();$this->assertSame($u->id,$notice->user_id);$this->assertSame('order',$notice->target_type);$this->assertSame($o->id,$notice->target_id);
        $this->assertStringContainsString('GHN-12345',$notice->body);$this->assertStringContainsString($o->fresh()->estimated_delivery_date->format('d/m/Y'),$notice->body);
        $this->assertDatabaseCount('order_history',1);$this->getJson("/api/admin/orders/$o->id/delivery")->assertOk();
        $this->actingAs($u,'sanctum')->getJson("/api/orders/$o->id")->assertOk()->assertJsonPath('data.tracking_number','GHN-12345');
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('unread_count',1)->assertJsonPath('data.data.0.target_id',$o->id);
        $this->actingAs($a,'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count',0);
    }
    public function test_repeat_save_does_not_spam_and_stale_edit_is_rejected(): void
    {
        $o=$this->purchase($this->account(),'shipping',false);$this->actingAs($this->administrator(),'sanctum');
        $this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertOk();
        $this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertOk();
        $changed=array_merge($this->delivery(),['tracking_number'=>'NEW']);
        $this->putJson("/api/admin/orders/$o->id/delivery",$changed)->assertConflict();
        $this->assertDatabaseCount('store_notifications',1);$this->assertDatabaseCount('order_history',1);
        $this->putJson("/api/admin/orders/$o->id/delivery",array_merge($changed,['expected_version'=>1]))->assertOk()->assertJsonPath('data.delivery_version',2);
        $this->assertDatabaseCount('store_notifications',2);$this->assertDatabaseCount('order_history',2);
    }
    public function test_delivery_state_validation_and_dates_are_enforced(): void
    {
        $u=$this->account();$this->actingAs($this->administrator(),'sanctum');
        foreach(['pending','completed','cancelled'] as $status){$o=$this->purchase($u,$status,false);$this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertConflict();}
        $o=$this->purchase($u,'confirmed',false);
        foreach([['carrier_name'=>' '],['carrier_name'=>str_repeat('a',101)],['tracking_number'=>'<script>'],['tracking_number'=>'x'."\n".'y'],['estimated_delivery_date'=>'2026-02-30'],['estimated_delivery_date'=>now('Asia/Ho_Chi_Minh')->subDay()->toDateString()],['expected_version'=>-1]] as $bad){
            $this->putJson("/api/admin/orders/$o->id/delivery",array_merge($this->delivery(),$bad))->assertUnprocessable();
        }
        $this->assertDatabaseCount('store_notifications',0);
    }
    public function test_shipping_transition_timestamps_and_includes_tracking_in_notice(): void
    {
        $o=$this->purchase($this->account(),'confirmed',false);$this->actingAs($this->administrator(),'sanctum');
        $this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertOk();
        $this->putJson("/api/admin/orders/$o->id/status",['status'=>'shipping'])->assertOk();
        $sent=$o->fresh()->dispatched_at;$this->assertNotNull($sent);$this->assertNull($o->fresh()->delivered_at);
        $this->assertStringContainsString('GHN-12345',StoreNotification::where('event_key',"order:$o->id:shipping")->first()->body);
        $this->travel(10)->minutes();$this->putJson("/api/admin/orders/$o->id/status",['status'=>'shipping'])->assertOk();
        $this->assertTrue($sent->equalTo($o->fresh()->dispatched_at));$this->assertDatabaseCount('store_notifications',2);
    }
    public function test_customer_receipt_completes_order_without_changing_payment_inventory_and_sends_once(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping',false);$p=Product::first();$this->actingAs($u,'sanctum');
        $this->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertOk()->assertJsonPath('data.status','completed')->assertJsonPath('data.payment.payment_status','pending');
        $this->assertNotNull($o->fresh()->delivered_at);$this->assertNotNull($o->fresh()->receipt_confirmed_at);$time=$o->fresh()->delivered_at;
        $this->assertSame($p->quantity,$p->fresh()->quantity);$this->assertSame('pending',Payment::first()->payment_status);
        $this->assertDatabaseHas('order_history',['order_id'=>$o->id,'changed_by'=>$u->id,'note'=>'Khách hàng xác nhận đã nhận hàng.']);
        $this->travel(1)->hours();$this->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertOk();
        $this->assertDatabaseCount('order_history',1);$this->assertDatabaseCount('store_notifications',1);$this->assertTrue($time->equalTo($o->fresh()->delivered_at));
        $this->assertTrue($time->equalTo($o->fresh()->completedAt()));
    }
    public function test_receipt_rejects_other_states_or_unconfirmed_intent(): void
    {
        $u=$this->account();$this->actingAs($u,'sanctum');
        foreach(['pending','confirmed','completed','cancelled'] as $status){$o=$this->purchase($u,$status,false);$this->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertConflict();}
        $o=$this->purchase($u,'shipping',false);$this->postJson("/api/orders/$o->id/received",[])->assertUnprocessable();
        $this->postJson("/api/orders/$o->id/received",['confirm_received'=>false])->assertUnprocessable();$this->assertDatabaseCount('store_notifications',0);
    }
    public function test_admin_completion_records_delivery_but_not_customer_confirmation(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping',false);$this->actingAs($this->administrator(),'sanctum');
        $this->putJson("/api/admin/orders/$o->id/status",['status'=>'completed'])->assertOk();
        $this->assertNotNull($o->fresh()->delivered_at);$this->assertNull($o->fresh()->receipt_confirmed_at);
        $time=$o->fresh()->delivered_at;$this->travel(1)->days();$this->putJson("/api/admin/orders/$o->id/status",['status'=>'completed'])->assertOk();
        $this->assertTrue($time->equalTo($o->fresh()->delivered_at));$this->assertDatabaseCount('store_notifications',1);
        $this->actingAs($u,'sanctum')->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertConflict();
    }
    public function test_failed_notification_rolls_back_delivery_and_history(): void
    {
        $u=$this->account();$o=$this->purchase($u,'confirmed',false);$this->actingAs($this->administrator(),'sanctum');
        Event::listen('eloquent.creating: '.StoreNotification::class,function(){throw new \RuntimeException('notification failed');});
        try{$this->putJson("/api/admin/orders/$o->id/delivery",$this->delivery())->assertStatus(500);}finally{Event::forget('eloquent.creating: '.StoreNotification::class);}
        $this->assertNull($o->fresh()->tracking_number);$this->assertSame(0,$o->fresh()->delivery_version);$this->assertDatabaseCount('order_history',0);
    }
    public function test_failed_receipt_notification_rolls_back_completion(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping',false);$this->actingAs($u,'sanctum');
        Event::listen('eloquent.creating: '.StoreNotification::class,function(){throw new \RuntimeException('notification failed');});
        try{$this->postJson("/api/orders/$o->id/received",['confirm_received'=>true])->assertStatus(500);}finally{Event::forget('eloquent.creating: '.StoreNotification::class);}
        $this->assertSame('shipping',$o->fresh()->status);$this->assertNull($o->fresh()->delivered_at);$this->assertNull($o->fresh()->receipt_confirmed_at);$this->assertDatabaseCount('order_history',0);
    }
    public function test_long_delivery_fields_fit_legacy_history_and_reach_user_notification(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping',false);$this->actingAs($this->administrator(),'sanctum');
        $this->putJson("/api/admin/orders/$o->id/delivery",array_merge($this->delivery(),['carrier_name'=>str_repeat('ệ',100),'tracking_number'=>str_repeat('A',100)]))->assertOk();
        $this->assertLessThanOrEqual(255,mb_strlen(OrderHistory::first()->note));$this->assertStringContainsString(str_repeat('A',100),StoreNotification::first()->body);
    }
}
