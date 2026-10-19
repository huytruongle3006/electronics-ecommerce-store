<?php

namespace Tests\Feature;

use App\Models\Warranty;
use App\Models\WarrantyServiceRequest;
use App\Models\WarrantyServiceEvent;
use App\Models\Product;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Event;
use Tests\Support\OrderTestCase;

class WarrantyWorkflowTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__ . '/../../database/migrations/2026_10_19_120000_create_return_requests_tables.php')->up();
        (require __DIR__ . '/../../database/migrations/2026_10_19_150000_create_warranty_service_tables.php')->up();
    }

    private function issue($order, string $serial = 'SERIAL-0001'): Warranty
    {
        $product = $order->details()->first()->product_id;
        $this->postJson('/api/admin/warranties', ['order_id' => $order->id, 'product_id' => $product, 'serial_number' => $serial])->assertCreated();
        return Warranty::where('serial_number', strtoupper($serial))->firstOrFail();
    }

    public function test_issuance_enforces_quantity_unique_serial_and_derived_dates(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $product = $order->details()->first()->product; $product->update(['warranty_months' => 1]);
        $order->forceFill(['updated_at' => '2026-01-31 10:00:00'])->save();
        $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order, 'serial-0001');
        $this->assertSame('2026-01-31', $warranty->start_date->toDateString());
        $this->assertSame('2026-02-28', $warranty->end_date->toDateString());
        $payload = ['order_id' => $order->id, 'product_id' => $product->id, 'serial_number' => 'serial-0001'];
        $this->postJson('/api/admin/warranties', $payload)->assertOk();
        $this->issue($order, 'SERIAL-0002');
        $this->postJson('/api/admin/warranties', array_merge($payload, ['serial_number' => 'SERIAL-0003']))->assertStatus(409);
        $this->assertSame(2, Warranty::count());
    }

    public function test_public_lookup_is_case_insensitive_private_and_valid_through_end_of_day(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order);
        $warranty->update(['end_date' => now()->toDateString()]);
        $this->postJson('/api/warranties/check', ['serial_number' => 'serial-0001'])->assertOk()->assertJsonPath('data.effective_status', 'valid')->assertJsonMissingPath('data.customer_name')->assertJsonMissingPath('data.customer_phone')->assertJsonMissingPath('data.order');
        $this->travel(1)->days();
        $this->postJson('/api/warranties/check', ['serial_number' => 'SERIAL-0001'])->assertOk()->assertJsonPath('data.effective_status', 'expired');
    }

    public function test_only_owner_sees_warranties_and_can_request_service(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test'); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order);
        $this->actingAs($other, 'sanctum')->getJson('/api/warranties/my')->assertOk()->assertJsonCount(0, 'data.data');
        $this->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'Máy không khởi động được', 'contact_phone' => '0912345678'])->assertNotFound();
        $this->actingAs($user, 'sanctum')->getJson('/api/warranties/my')->assertOk()->assertJsonCount(1, 'data.data');
        $this->getJson('/api/admin/warranties')->assertForbidden();
    }

    public function test_full_service_workflow_is_audited_and_does_not_extend_warranty_or_change_stock(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum'); $warranty = $this->issue($order); $end = $warranty->end_date->toDateString();
        $this->actingAs($user, 'sanctum'); $payload = ['problem' => 'Máy không khởi động được', 'contact_phone' => '0912345678'];
        $id = $this->postJson("/api/warranties/{$warranty->id}/service-requests", $payload)->assertCreated()->json('data.id');
        $this->postJson("/api/warranties/{$warranty->id}/service-requests", $payload)->assertOk()->assertJsonPath('data.id', $id);
        $this->assertSame(1, WarrantyServiceRequest::count());
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/warranty-services/{$id}", ['status' => 'closed'])->assertStatus(409);
        foreach (['accepted', 'repairing'] as $status) $this->putJson("/api/admin/warranty-services/{$id}", ['status' => $status])->assertOk();
        $this->putJson("/api/admin/warranty-services/{$id}", ['status' => 'ready'])->assertUnprocessable();
        $ready = ['status' => 'ready', 'resolution' => 'Đã thay linh kiện và kiểm tra hoạt động.'];
        $this->putJson("/api/admin/warranty-services/{$id}", $ready)->assertOk();
        $this->putJson("/api/admin/warranty-services/{$id}", $ready)->assertOk();
        $this->putJson("/api/admin/warranty-services/{$id}", ['status' => 'closed', 'note' => 'Khách đã nhận máy'])->assertOk();
        $this->assertSame(5, WarrantyServiceEvent::count()); $this->assertSame(5, Product::first()->quantity); $this->assertSame($end, $warranty->fresh()->end_date->toDateString());
        $this->actingAs($user, 'sanctum')->getJson('/api/warranties/my')->assertOk()->assertJsonPath('data.data.0.service_requests.0.resolution', $ready['resolution']);
    }

    public function test_open_service_blocks_return_and_warranty_status_change(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum'); $warranty = $this->issue($order);
        $this->actingAs($user, 'sanctum')->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'Máy không hoạt động', 'contact_phone' => '0912345678'])->assertCreated();
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Yêu cầu trả hàng này'])->assertStatus(409);
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/warranties/{$warranty->id}/status", ['status' => 'expired', 'note' => 'Kiểm tra lại phiếu'])->assertStatus(409);
    }

    public function test_return_request_or_refund_blocks_issuance_and_service(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum'); $warranty = $this->issue($order);
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Sản phẩm không phù hợp'])->assertCreated();
        $this->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'Máy không hoạt động', 'contact_phone' => '0912345678'])->assertStatus(409);
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/warranties', ['order_id' => $order->id, 'product_id' => $warranty->product_id, 'serial_number' => 'SERIAL-0002'])->assertStatus(409);
        $this->postJson('/api/warranties/check', ['serial_number' => 'SERIAL-0001'])->assertOk()->assertJsonPath('data.effective_status', 'invalid');
    }

    public function test_ineligible_order_product_and_duplicate_serial_are_rejected(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'pending'); $admin = $this->administrator(); $this->actingAs($admin, 'sanctum');
        $payload = ['order_id' => $order->id, 'product_id' => $order->details()->first()->product_id, 'serial_number' => 'SERIAL-0001'];
        $this->postJson('/api/admin/warranties', $payload)->assertStatus(409);
        $order->update(['status' => 'completed']);
        $this->postJson('/api/admin/warranties', array_merge($payload, ['product_id' => 999]))->assertUnprocessable();
        $this->postJson('/api/admin/warranties', $payload)->assertCreated();
        $other = $this->purchase($user, 'completed');
        $this->postJson('/api/admin/warranties', ['order_id' => $other->id, 'product_id' => $other->details()->first()->product_id, 'serial_number' => 'serial-0001'])->assertUnprocessable();
    }

    public function test_expired_or_manually_disabled_warranty_cannot_open_service(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order);
        $this->putJson("/api/admin/warranties/{$warranty->id}/status", ['status' => 'expired', 'note' => 'Phiếu cần đối soát'])->assertOk();
        $this->actingAs($user, 'sanctum')->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'Máy không hoạt động', 'contact_phone' => '0912345678'])->assertStatus(409);
    }

    public function test_request_validation_and_service_failure_roll_back(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order);
        $this->actingAs($user, 'sanctum')->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'short', 'contact_phone' => 'abc'])->assertUnprocessable();
        Event::listen('eloquent.creating: ' . WarrantyServiceEvent::class, function () { throw new \RuntimeException('Simulated event failure'); });
        $this->postJson("/api/warranties/{$warranty->id}/service-requests", ['problem' => 'Máy không hoạt động', 'contact_phone' => '0912345678'])->assertStatus(500);
        $this->assertSame(0, WarrantyServiceRequest::count());
    }

    public function test_failed_issuance_audit_rolls_back_warranty(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $this->actingAs($this->administrator(), 'sanctum');
        Schema::drop('warranty_events');
        $this->postJson('/api/admin/warranties', ['order_id' => $order->id, 'product_id' => $order->details()->first()->product_id, 'serial_number' => 'SERIAL-0001'])->assertStatus(500);
        $this->assertSame(0, Warranty::count());
    }

    public function test_expiry_uses_end_of_day_in_store_timezone(): void
    {
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-10-19 16:59:59', 'UTC'));
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $this->actingAs($this->administrator(), 'sanctum'); $warranty = $this->issue($order);
        $warranty->update(['end_date' => '2026-10-19']);
        $this->postJson('/api/warranties/check', ['serial_number' => 'SERIAL-0001'])->assertOk()->assertJsonPath('data.effective_status', 'valid');
        $this->travel(2)->seconds();
        $this->postJson('/api/warranties/check', ['serial_number' => 'SERIAL-0001'])->assertOk()->assertJsonPath('data.effective_status', 'expired');
    }
}
