<?php

namespace Tests\Feature;

use App\Models\{Order, OrderHistory, Payment, StoreNotification, User};
use Tests\Support\OrderTestCase;

class AdminOrdersTest extends OrderTestCase
{
    public function test_admin_list_and_detail_require_admin(): void
    {
        $u=$this->account();$o=$this->purchase($u);
        $this->getJson('/api/admin/orders')->assertUnauthorized();$this->getJson("/api/admin/orders/$o->id")->assertUnauthorized();
        $this->actingAs($u,'sanctum')->getJson('/api/admin/orders')->assertForbidden();$this->getJson("/api/admin/orders/$o->id")->assertForbidden();
        $this->actingAs($this->administrator(),'sanctum')->getJson("/api/admin/orders/$o->id")->assertOk();$this->getJson('/api/admin/orders/99999')->assertNotFound();
    }
    public function test_detail_contains_saved_prices_account_payment_voucher_delivery_and_history_actor_without_secrets(): void
    {
        $u=$this->account();$o=$this->purchase($u,'shipping');$admin=$this->administrator();
        $o->update(['carrier_name'=>'GHN','tracking_number'=>'GHN-TEST','estimated_delivery_date'=>'2026-11-01']);
        $o->details->first()->product->update(['price'=>99000000]);
        OrderHistory::create(['order_id'=>$o->id,'changed_by'=>$admin->id,'status_changed'=>'shipping','note'=>'Đã bàn giao','created_at'=>now()]);
        $this->actingAs($admin,'sanctum')->getJson("/api/admin/orders/$o->id")->assertOk()
            ->assertJsonPath('data.user.email',$u->email)->assertJsonPath('data.details.0.price','10000000.00')
            ->assertJsonMissingPath('data.user.password')->assertJsonMissingPath('data.histories.0.changer.password')
            ->assertJsonPath('data.voucher.maVoucher','SALE0')->assertJsonPath('data.tracking_number','GHN-TEST')
            ->assertJsonPath('data.payment.payment_method','cod')->assertJsonPath('data.histories.0.changer.full_name',$admin->full_name);
    }
    public function test_search_matches_code_recipient_phone_account_email_and_tracking_and_combines_status(): void
    {
        $u=$this->account('specific@example.test');$o=$this->purchase($u,'confirmed',false);$o->update(['maDH'=>'ORDER-ALPHA','recipient_name'=>'Người Nhận Riêng','recipient_phone'=>'0988877766','tracking_number'=>'TRACK-XYZ']);
        $other=$this->purchase($this->account('other@example.test'),'pending',false);$other->update(['maDH'=>'ORDER-ALPHA-OTHER']);
        $this->actingAs($this->administrator(),'sanctum');
        foreach(['ORDER-ALPHA','Người Nhận Riêng','0988877766','specific@example.test','TRACK-XYZ'] as $text){
            $this->getJson('/api/admin/orders?status=confirmed&search='.urlencode($text))->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$o->id);
        }
        $this->getJson('/api/admin/orders?search=NO-MATCH')->assertJsonPath('data.total',0);
    }
    public function test_payment_status_filter_and_missing_payment_work(): void
    {
        $u=$this->account();$pending=$this->purchase($u,'pending',false);$paid=$this->purchase($u,'completed',false,'paid');$missing=$this->purchase($u,'pending',false);$missing->payment()->delete();
        $this->actingAs($this->administrator(),'sanctum');
        $this->getJson('/api/admin/orders?payment_status=paid')->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$paid->id);
        $this->getJson('/api/admin/orders?payment_status=pending')->assertJsonPath('data.data.0.id',$pending->id);
        $this->getJson('/api/admin/orders?payment_status=missing')->assertJsonPath('data.data.0.id',$missing->id);
    }
    public function test_date_filter_uses_whole_vietnam_day_with_exclusive_next_day_boundary(): void
    {
        $u=$this->account();$ids=[];
        foreach(['2026-10-26 16:59:59','2026-10-26 17:00:00','2026-10-27 16:59:59','2026-10-27 17:00:00'] as $time){$o=$this->purchase($u,'pending',false);$o->forceFill(['created_at'=>$time])->save();$ids[]=$o->id;}
        $this->actingAs($this->administrator(),'sanctum')->getJson('/api/admin/orders?from=2026-10-27&to=2026-10-27')->assertOk()->assertJsonPath('data.total',2)->assertJsonPath('data.data.0.id',$ids[2])->assertJsonPath('data.data.1.id',$ids[1]);
    }
    public function test_filters_are_validated_and_pagination_is_stable_and_bounded(): void
    {
        $u=$this->account();$this->actingAs($this->administrator(),'sanctum');
        foreach(['status=wrong','payment_status=wrong','page=0','page=1000001','from=2026-02-30','from=2026-10-28&to=2026-10-27','search='.str_repeat('x',101)] as $query)$this->getJson('/api/admin/orders?'.$query)->assertUnprocessable();
        foreach(range(1,17) as $i){$o=$this->purchase($u,'pending',false);$o->forceFill(['created_at'=>'2026-10-27 00:00:00'])->save();}
        $this->getJson('/api/admin/orders')->assertOk()->assertJsonPath('data.per_page',15)->assertJsonPath('data.last_page',2)->assertJsonPath('data.data.0.id',17);
        $this->getJson('/api/admin/orders?page=2')->assertJsonCount(2,'data.data')->assertJsonPath('data.data.0.id',2);
    }
    public function test_expected_status_conflict_has_no_side_effect_and_cancel_reason_is_audited(): void
    {
        $u=$this->account();$o=$this->purchase($u,'confirmed');$admin=$this->administrator();$this->actingAs($admin,'sanctum');
        $this->putJson("/api/admin/orders/$o->id/status",['status'=>'cancelled','expected_status'=>'pending','reason'=>'Khách đổi ý'])->assertConflict();
        $this->assertDatabaseCount('order_history',0);$this->assertDatabaseCount('store_notifications',0);
        $this->putJson("/api/admin/orders/$o->id/status",['status'=>'cancelled','expected_status'=>'confirmed','reason'=>'Khách đổi ý'])->assertOk();
        $this->assertStringContainsString('Khách đổi ý',OrderHistory::first()->note);$this->assertSame('cancelled',$o->fresh()->status);$this->assertSame($u->id,StoreNotification::first()->user_id);
    }
    public function test_missing_account_and_payment_are_tolerated_and_detail_read_is_not_a_mutation(): void
    {
        $u=$this->account();$o=$this->purchase($u,'pending',false);$o->payment()->delete();$u->delete();$before=$o->fresh()->getAttributes();
        $this->actingAs($this->administrator(),'sanctum')->getJson("/api/admin/orders/$o->id")->assertOk()->assertJsonPath('data.user',null)->assertJsonPath('data.payment',null);
        $this->assertSame($before,$o->fresh()->getAttributes());$this->assertDatabaseCount('order_history',0);
    }
}
