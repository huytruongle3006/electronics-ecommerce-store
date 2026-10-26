<?php
namespace Tests\Feature;

use App\Models\StoreNotification;
use App\Models\Warranty;
use App\Models\Order;
use App\Services\StoreNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Support\OrderTestCase;

class StoreNotificationTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__.'/../../database/migrations/2026_10_19_120000_create_return_requests_tables.php')->up();
        (require __DIR__.'/../../database/migrations/2026_10_19_150000_create_warranty_service_tables.php')->up();
    }
    private function notice($user, string $key): StoreNotification
    {
        return StoreNotification::create(['user_id' => $user->id, 'event_key' => $key, 'title' => 'Cập nhật đơn hàng', 'body' => 'Đơn đã xác nhận.', 'target_type' => 'order', 'target_id' => 1, 'created_at' => now()]);
    }

    public function test_authentication_and_no_client_notification_creation(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->putJson('/api/notifications/1/read')->assertUnauthorized();
        $this->putJson('/api/notifications/read-all', ['through_id' => 1])->assertUnauthorized();
        $this->actingAs($this->account(), 'sanctum')->postJson('/api/notifications', ['title' => 'Fake'])->assertStatus(405);
    }

    public function test_paginated_list_and_badge_are_private_and_newest_first(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        for ($i=0; $i<17; $i++) $this->notice($user, "user:$i");
        $foreign = $this->notice($other, 'foreign');
        $this->actingAs($user, 'sanctum')->getJson('/api/notifications')->assertOk()->assertJsonCount(15, 'data.data')
            ->assertJsonPath('unread_count', 17)->assertJsonPath('latest_id', 17)->assertJsonPath('data.data.0.id', 17)
            ->assertJsonMissingPath('data.data.0.user_id')->assertJsonMissingPath('data.data.0.event_key');
        $this->getJson('/api/notifications?page=2')->assertJsonCount(2, 'data.data');
        $this->getJson('/api/notifications?page=0')->assertUnprocessable();
        $this->assertNull($foreign->fresh()->read_at);
    }

    public function test_mark_one_is_owner_scoped_and_idempotent(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        $notice = $this->notice($user, 'own'); $foreign = $this->notice($other, 'foreign');
        $this->actingAs($user, 'sanctum')->putJson("/api/notifications/{$foreign->id}/read")->assertNotFound();
        $this->putJson('/api/notifications/999/read')->assertNotFound();
        $this->putJson("/api/notifications/{$notice->id}/read")->assertOk();
        $read = $notice->fresh()->read_at->toISOString(); $this->travel(5)->minutes();
        $this->putJson("/api/notifications/{$notice->id}/read")->assertOk();
        $this->assertSame($read, $notice->fresh()->read_at->toISOString());
        $this->assertNull($foreign->fresh()->read_at);
        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
    }

    public function test_mark_all_respects_snapshot_boundary_and_does_not_read_new_or_foreign_items(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        $first = $this->notice($user, 'first'); $foreign = $this->notice($other, 'foreign');
        $this->actingAs($user, 'sanctum'); $cutoff = $this->getJson('/api/notifications')->json('latest_id');
        $new = $this->notice($user, 'new');
        $this->putJson('/api/notifications/read-all', ['through_id' => $cutoff])->assertOk();
        $this->assertNotNull($first->fresh()->read_at); $this->assertNull($new->fresh()->read_at); $this->assertNull($foreign->fresh()->read_at);
        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 1);
        $this->putJson('/api/notifications/read-all', [])->assertUnprocessable();
    }

    public function test_admin_order_updates_notify_owner_once_and_invalid_updates_notify_nobody(): void
    {
        $user = $this->account(); $order = $this->purchase($user); $admin = $this->administrator();
        $this->actingAs($user, 'sanctum')->putJson("/api/admin/orders/{$order->id}/status", ['status'=>'confirmed'])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/orders/{$order->id}/status", ['status'=>'completed'])->assertStatus(409);
        $this->assertDatabaseCount('store_notifications', 0);
        foreach (['confirmed','confirmed','shipping','completed'] as $status) $this->putJson("/api/admin/orders/{$order->id}/status", ['status'=>$status])->assertOk();
        $this->assertDatabaseCount('store_notifications', 3);
        $this->assertSame([$user->id], StoreNotification::pluck('user_id')->unique()->all());
        $this->assertSame([$order->id], StoreNotification::pluck('target_id')->unique()->all());
        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications')->assertJsonCount(0, 'data.data');
        $this->actingAs($user, 'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count', 3);
    }

    public function test_admin_cancellation_sends_one_notice_and_retries_do_not_duplicate(): void
    {
        $user = $this->account(); $order = $this->purchase($user);
        $this->actingAs($this->administrator(), 'sanctum');
        for ($i=0; $i<2; $i++) $this->putJson("/api/admin/orders/{$order->id}/status", ['status'=>'cancelled'])->assertOk();
        $this->assertDatabaseCount('store_notifications', 1);
        $this->assertStringContainsString('hủy', StoreNotification::first()->body);
    }

    public function test_notification_failure_rolls_back_admin_business_update(): void
    {
        $user = $this->account(); $order = $this->purchase($user);
        $this->actingAs($this->administrator(), 'sanctum');
        $event = 'eloquent.creating: '.StoreNotification::class;
        Event::listen($event, fn () => throw new \RuntimeException('Notification storage unavailable'));
        $this->withoutExceptionHandling();
        try {
            $this->putJson("/api/admin/orders/{$order->id}/status", ['status'=>'confirmed']);
            $this->fail('Expected write to fail');
        } catch (\RuntimeException $e) { $this->assertSame('Notification storage unavailable', $e->getMessage()); }
        finally { Event::forget($event); }
        $this->assertSame('pending', $order->fresh()->status);
        $this->assertDatabaseCount('store_notifications', 0); $this->assertDatabaseCount('order_history', 0);
    }

    public function test_return_and_refund_workflow_generates_one_notice_per_admin_transition(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', false, 'paid');
        $id = $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/return-request", ['reason'=>'Thiết bị bị lỗi cần trả lại', 'refund_method'=>'bank_transfer', 'refund_account_name'=>'Người nhận', 'refund_account_number'=>'123456789', 'refund_bank_name'=>'Ngân hàng thử'])
            ->assertCreated()->json('data.id');
        $this->assertDatabaseCount('store_notifications', 0);
        $this->actingAs($this->administrator(), 'sanctum');
        foreach ([['action'=>'approve'], ['action'=>'approve'], ['action'=>'receive','restock'=>false,'confirmed_received'=>true], ['action'=>'refund','refund_reference'=>'REF001','confirmed_paid_back'=>true]] as $data)
            $this->putJson("/api/admin/return-requests/$id", $data)->assertOk();
        $this->assertDatabaseCount('store_notifications', 3);
        $this->assertSame(1, StoreNotification::where('event_key', "return:$id:refunded")->count());
        $this->assertSame($user->id, StoreNotification::first()->user_id);
    }

    public function test_warranty_issuance_service_statuses_and_private_deep_link(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test'); $order = $this->purchase($user, 'completed', false, 'paid'); $admin=$this->administrator();
        $payload=['order_id'=>$order->id,'product_id'=>$order->details()->first()->product_id,'serial_number'=>'SERIAL-NOTICE'];
        $id=$this->actingAs($admin, 'sanctum')->postJson('/api/admin/warranties',$payload)->assertCreated()->json('data.id');
        $this->postJson('/api/admin/warranties',$payload)->assertOk(); $this->assertDatabaseCount('store_notifications',1);
        $this->actingAs($other, 'sanctum')->getJson("/api/warranties/my/$id")->assertNotFound();
        $this->actingAs($user, 'sanctum')->getJson("/api/warranties/my/$id")->assertOk()->assertJsonPath('data.id',$id);
        $service=$this->postJson("/api/warranties/$id/service-requests",['problem'=>'Thiết bị không thể khởi động','contact_phone'=>'0912345678'])->assertCreated()->json('data.id');
        $this->assertDatabaseCount('store_notifications',1);
        $this->actingAs($admin, 'sanctum');
        foreach (['accepted','accepted','repairing','ready','closed'] as $status) $this->putJson("/api/admin/warranty-services/$service",['status'=>$status,'resolution'=>'Đã sửa và kiểm tra thiết bị'])->assertOk();
        $this->assertDatabaseCount('store_notifications',5);
        foreach (['expired','valid','expired'] as $status) $this->putJson("/api/admin/warranties/$id/status", ['status'=>$status,'note'=>'Cập nhật tình trạng thiết bị'])->assertOk();
        $this->assertDatabaseCount('store_notifications',8);
        $this->assertSame([$user->id], StoreNotification::pluck('user_id')->unique()->all());
        $this->assertSame(['warranty'], StoreNotification::pluck('target_type')->unique()->all());
    }
}
