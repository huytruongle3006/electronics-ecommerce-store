<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Tests\Support\OrderTestCase;

class OrderCancellationTest extends OrderTestCase
{
    public function test_user_cancels_pending_order_and_restores_stock_voucher_and_history_once(): void
    {
        $user = $this->account(); $order = $this->purchase($user);
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => '  Đặt nhầm sản phẩm  '])
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('refund_required', false);
        $this->assertSame(7, Product::first()->quantity);
        $this->assertSame(5, Voucher::first()->quantity);
        $this->assertSame('inactive', Voucher::first()->status);
        $this->assertSame('inactive', Product::first()->status);
        $this->assertDatabaseHas('order_history', ['order_id' => $order->id, 'changed_by' => $user->id, 'note' => 'Khách hàng hủy đơn: Đặt nhầm sản phẩm']);
        $this->assertNotNull(OrderHistory::first()->created_at);
        $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Thử lại sau mất mạng'])->assertOk();
        $this->assertSame(7, Product::first()->quantity);
        $this->assertSame(5, Voucher::first()->quantity);
        $this->assertSame(1, OrderHistory::count());
        $this->getJson('/api/orders/my-orders')->assertOk()->assertJsonPath('data.0.histories.0.note', 'Khách hàng hủy đơn: Đặt nhầm sản phẩm');
    }

    public function test_cancellation_requires_login_and_ownership(): void
    {
        $owner = $this->account(); $other = $this->account('other@example.test'); $order = $this->purchase($owner);
        $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm'])->assertUnauthorized();
        $this->actingAs($other, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm'])->assertNotFound();
        $this->assertSame('pending', $order->fresh()->status);
        $this->assertSame(5, Product::first()->quantity);
        $this->assertSame(0, OrderHistory::count());
    }

    public function test_customer_cannot_cancel_processed_orders(): void
    {
        $user = $this->account(); $this->actingAs($user, 'sanctum');
        foreach (['confirmed', 'shipping', 'completed'] as $status) {
            $order = $this->purchase($user, $status);
            $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm'])->assertStatus(409);
            $this->assertSame($status, $order->fresh()->status);
        }
        $this->assertSame(0, OrderHistory::count());
        $this->assertSame([5, 5, 5], Product::pluck('quantity')->all());
    }

    public function test_reason_is_required_and_limited_to_200_characters(): void
    {
        $user = $this->account(); $order = $this->purchase($user);
        $this->actingAs($user, 'sanctum');
        foreach (['', '   ', str_repeat('a', 201)] as $reason) {
            $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => $reason])->assertUnprocessable()->assertJsonValidationErrors('reason');
        }
        $this->assertSame('pending', $order->fresh()->status);
        $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => str_repeat('ệ', 200)])->assertOk();
        $this->assertLessThanOrEqual(255, mb_strlen(OrderHistory::first()->note));
    }

    public function test_paid_order_is_not_falsely_marked_refunded(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'pending', false, 'paid');
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Thay đổi nhu cầu'])
            ->assertOk()->assertJsonPath('refund_required', true)->assertJsonPath('data.payment.payment_status', 'paid');
        $this->assertSame('paid', Payment::first()->payment_status);
        $this->assertSame(7, Product::first()->quantity);
    }

    public function test_transaction_rolls_back_stock_voucher_status_if_history_write_fails(): void
    {
        $user = $this->account(); $order = $this->purchase($user);
        Event::listen('eloquent.creating: ' . OrderHistory::class, function () { throw new \RuntimeException('Simulated history failure'); });
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm'])->assertStatus(500);
        $this->assertSame('pending', $order->fresh()->status);
        $this->assertSame(5, Product::first()->quantity);
        $this->assertSame(4, Voucher::first()->quantity);
    }

    public function test_customer_cannot_bypass_cancellation_policy_through_admin_api(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'confirmed');
        $this->actingAs($user, 'sanctum')->putJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertForbidden();
        $this->putJson("/api/admin/users/{$user->id}/role", ['role_id' => 1])->assertForbidden();
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_admin_and_customer_cannot_double_restore_or_reopen_cancelled_order(): void
    {
        $user = $this->account(); $order = $this->purchase($user); $admin = $this->administrator();
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Đặt nhầm'])->assertOk();
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();
        foreach (['pending', 'confirmed', 'shipping', 'completed'] as $status) {
            $this->putJson("/api/admin/orders/{$order->id}/status", ['status' => $status])->assertStatus(409);
        }
        $this->assertSame(7, Product::first()->quantity);
        $this->assertSame(5, Voucher::first()->quantity);
        $this->assertSame(1, OrderHistory::count());
        $this->getJson('/api/admin/orders')->assertOk()->assertJsonPath('data.data.0.histories.0.note', 'Khách hàng hủy đơn: Đặt nhầm');
    }

    public function test_admin_cancellation_uses_same_stock_and_voucher_restoration(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'confirmed'); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertOk();
        $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Thử lại'])->assertOk();
        $this->assertSame(7, Product::first()->quantity);
        $this->assertSame(5, Voucher::first()->quantity);
        $this->assertDatabaseHas('order_history', ['changed_by' => $admin->id, 'note' => 'Quản trị viên hủy đơn.']);
        $this->assertSame(1, OrderHistory::count());
    }

    public function test_admin_must_follow_forward_status_transitions(): void
    {
        $user = $this->account(); $order = $this->purchase($user); $admin = $this->administrator();
        $this->actingAs($admin, 'sanctum');
        $this->putJson("/api/admin/orders/{$order->id}/status", ['status' => 'shipping'])->assertStatus(409);
        foreach (['confirmed', 'shipping', 'completed'] as $status) {
            $this->putJson("/api/admin/orders/{$order->id}/status", ['status' => $status])->assertOk();
        }
        $this->putJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertStatus(409);
        $this->assertSame(5, Product::first()->quantity);
        $this->assertSame(4, Voucher::first()->quantity);
    }
}
