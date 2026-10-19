<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestEvent;
use App\Models\Voucher;
use Illuminate\Support\Facades\Event;
use Tests\Support\OrderTestCase;

class ReturnWorkflowTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__ . '/../../database/migrations/2026_10_19_120000_create_return_requests_tables.php')->up();
        (require __DIR__ . '/../../database/migrations/2026_10_19_150000_create_warranty_service_tables.php')->up();
    }

    private function requestReturn(Order $order): ReturnRequest
    {
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Sản phẩm gặp lỗi, cần trả hàng.', 'refund_instructions' => 'Liên hệ để đối soát', 'evidence_urls' => ['https://example.test/evidence.jpg'], 'amount' => 999, 'status' => 'refunded'])
            ->assertCreated()->assertJsonPath('data.status', 'requested')->assertJsonPath('data.amount', '20000000.00');
        return ReturnRequest::where('order_id', $order->id)->firstOrFail();
    }

    public function test_full_return_workflow_restock_and_refund_once_with_audit(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($user, 'sanctum'); $return = $this->requestReturn($order); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum');
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'refund', 'refund_reference' => 'REF-001', 'confirmed_paid_back' => true])->assertStatus(409);
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve', 'note' => 'Gửi hàng về cửa hàng'])->assertOk();
        $receive = ['action' => 'receive', 'restock' => true, 'confirmed_received' => true];
        $this->putJson("/api/admin/return-requests/{$return->id}", $receive)->assertOk()->assertJsonPath('data.restocked', true);
        $this->putJson("/api/admin/return-requests/{$return->id}", $receive)->assertOk();
        $this->assertSame(7, Product::first()->quantity); $this->assertSame(4, Voucher::first()->quantity);
        $refund = ['action' => 'refund', 'refund_reference' => 'REF-001', 'confirmed_paid_back' => true];
        $this->putJson("/api/admin/return-requests/{$return->id}", $refund)->assertOk()->assertJsonPath('data.status', 'refunded');
        $this->putJson("/api/admin/return-requests/{$return->id}", $refund)->assertOk();
        $this->assertSame('refunded', Payment::first()->payment_status);
        $this->assertSame(4, ReturnRequestEvent::count()); $this->assertSame(7, Product::first()->quantity);
        $this->assertSame($admin->id, $return->fresh()->refunded_by);
        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('data.refund_reference', 'REF-001');
    }

    public function test_cancelled_paid_order_refunds_without_receiving_or_restoring_stock_again(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'pending', true, 'paid');
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm hàng'])->assertOk();
        $return = $this->requestReturn($order->fresh());
        $this->assertSame('refund_only', $return->kind);
        $admin = $this->administrator(); $this->actingAs($admin, 'sanctum');
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve'])->assertOk();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'receive', 'restock' => true, 'confirmed_received' => true])->assertStatus(409);
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'refund', 'refund_reference' => 'REF-CANCEL', 'confirmed_paid_back' => true])->assertOk();
        $this->assertSame(7, Product::first()->quantity); $this->assertSame(5, Voucher::first()->quantity);
    }

    public function test_damaged_return_can_be_received_without_restocking(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($user, 'sanctum'); $return = $this->requestReturn($order);
        $this->actingAs($this->administrator(), 'sanctum');
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve'])->assertOk();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'receive', 'restock' => false, 'confirmed_received' => true, 'note' => 'Hàng lỗi để riêng'])->assertOk()->assertJsonPath('data.restocked', false);
        $this->assertSame(5, Product::first()->quantity);
    }

    public function test_ownership_authentication_and_admin_permissions(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid'); $other = $this->account('other@example.test');
        $this->getJson("/api/orders/{$order->id}/return-request")->assertUnauthorized();
        $this->actingAs($other, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertNotFound();
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Yêu cầu trả hàng này'])->assertNotFound();
        $this->getJson('/api/admin/return-requests')->assertForbidden();
        $this->putJson('/api/admin/return-requests/1', ['action' => 'approve'])->assertForbidden();
    }

    public function test_one_request_per_order_and_rejection_is_terminal(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($user, 'sanctum'); $return = $this->requestReturn($order);
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Gửi lại sau mất mạng'])->assertOk()->assertJsonPath('data.id', $return->id);
        $this->actingAs($this->administrator(), 'sanctum');
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'reject'])->assertUnprocessable();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'reject', 'note' => 'Không đủ điều kiện'])->assertOk();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve'])->assertStatus(409);
        $this->assertSame(1, ReturnRequest::count());
    }

    public function test_return_window_uses_original_completion_and_not_cod_confirmation(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        OrderHistory::create(['order_id' => $order->id, 'status_changed' => 'completed', 'changed_by' => $user->id, 'note' => 'Đã giao', 'created_at' => now()->subDays(8)]);
        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Yêu cầu trả hàng này'])->assertStatus(409);
        $order->histories()->delete(); $order->forceFill(['updated_at' => now()->subDays(8)])->save();
        $order->payment->update(['payment_method' => 'cod', 'payment_status' => 'pending']);
        $this->actingAs($this->administrator(), 'sanctum')->postJson("/api/admin/orders/{$order->id}/confirm-cod", ['reference' => 'COD001', 'confirmed_collected' => true])->assertOk();
        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
    }

    public function test_cod_requires_actual_collection_confirmation_and_reference(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed');
        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
        $this->actingAs($this->administrator(), 'sanctum');
        $this->postJson("/api/admin/orders/{$order->id}/confirm-cod", [])->assertUnprocessable();
        $payload = ['reference' => 'COD001', 'confirmed_collected' => true];
        $this->postJson("/api/admin/orders/{$order->id}/confirm-cod", $payload)->assertOk();
        $this->postJson("/api/admin/orders/{$order->id}/confirm-cod", $payload)->assertOk();
        $this->assertSame(1, OrderHistory::count());
        $this->actingAs($user, 'sanctum')->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', true);
    }

    public function test_pending_shipping_unpaid_or_mismatched_payment_orders_are_ineligible(): void
    {
        $user = $this->account(); $this->actingAs($user, 'sanctum');
        foreach (['pending', 'shipping'] as $status) {
            $order = $this->purchase($user, $status, true, 'paid');
            $this->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
        }
        $order = $this->purchase($user, 'completed');
        $this->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
        $order->payment->update(['payment_status' => 'paid', 'amount' => 1]);
        $this->getJson("/api/orders/{$order->id}/return-request")->assertOk()->assertJsonPath('eligibility.eligible', false);
    }

    public function test_evidence_and_reason_validation(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'short', 'evidence_urls' => ['javascript:alert(1)']])->assertUnprocessable()->assertJsonValidationErrors(['reason', 'evidence_urls.0']);
        $this->postJson("/api/orders/{$order->id}/return-request", ['reason' => 'Yêu cầu trả hàng này', 'evidence_urls' => array_fill(0, 6, 'https://example.test/evidence')])->assertUnprocessable();
    }

    public function test_refund_needs_manual_confirmation_reference_and_prior_receipt(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($user, 'sanctum'); $return = $this->requestReturn($order);
        $this->actingAs($this->administrator(), 'sanctum');
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve'])->assertOk();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'receive', 'restock' => false])->assertUnprocessable();
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'refund'])->assertUnprocessable();
        $this->assertSame('paid', Payment::first()->payment_status);
    }

    public function test_refund_failure_rolls_back_payment_and_request(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'cancelled', false, 'paid');
        $this->actingAs($user, 'sanctum'); $return = $this->requestReturn($order);
        $this->actingAs($this->administrator(), 'sanctum')->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'approve'])->assertOk();
        Event::listen('eloquent.creating: ' . ReturnRequestEvent::class, function () { throw new \RuntimeException('Simulated audit failure'); });
        $this->putJson("/api/admin/return-requests/{$return->id}", ['action' => 'refund', 'confirmed_paid_back' => true, 'refund_reference' => 'REF001'])->assertStatus(500);
        $this->assertSame('paid', Payment::first()->payment_status); $this->assertSame('approved', $return->fresh()->status);
    }

    public function test_financial_report_excludes_refunded_orders_but_keeps_status_count(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed', true, 'paid');
        $this->actingAs($this->administrator(), 'sanctum');
        $this->getJson('/api/admin/analytics/financial')->assertOk()->assertJsonPath('data.total_revenue', 20000000);
        $order->payment->update(['payment_status' => 'refunded']);
        $this->getJson('/api/admin/analytics/financial')->assertOk()->assertJsonPath('data.total_revenue', 0)->assertJsonPath('data.status_breakdown.completed', 1)->assertJsonCount(0, 'data.top_products');
    }
}
