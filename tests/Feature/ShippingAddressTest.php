<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingAddress;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\OrderTestCase;

class ShippingAddressTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (require __DIR__.'/../../database/migrations/2026_10_26_100000_create_shipping_addresses_table.php')->up();
        Schema::create('carts', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('user_id'); $table->timestamps(); });
        Schema::create('cart_items', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('cart_id'); $table->unsignedBigInteger('product_id'); $table->integer('quantity'); });
    }

    private function fields(array $extra = []): array
    {
        return array_replace(['label' => 'Nhà riêng', 'recipient_name' => 'Nguyễn Văn A', 'recipient_phone' => '0912345678', 'shipping_address' => '123 Đường Nguyễn Trãi, phường 1, TP HCM'], $extra);
    }

    private function fillCart($user): void
    {
        $cart = Cart::firstOrCreate(['user_id' => $user->id]);
        $product = Product::create(['maSP' => 'SP'.Product::count(), 'tenSP' => 'Laptop', 'price' => '100000.00', 'quantity' => 10, 'status' => 'active']);
        CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);
    }

    public function test_all_address_endpoints_require_authentication(): void
    {
        $this->getJson('/api/addresses')->assertUnauthorized();
        $this->postJson('/api/addresses', $this->fields())->assertUnauthorized();
        $this->putJson('/api/addresses/1', $this->fields())->assertUnauthorized();
        $this->putJson('/api/addresses/1/default')->assertUnauthorized();
        $this->deleteJson('/api/addresses/1')->assertUnauthorized();
    }

    public function test_first_default_normalization_owner_and_switching_default(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        $this->actingAs($user, 'sanctum');
        $first = $this->postJson('/api/addresses', $this->fields(['recipient_name' => '  Người nhận  ', 'user_id' => $other->id, 'is_default' => false]))
            ->assertCreated()->assertJsonPath('data.is_default', true)->assertJsonPath('data.recipient_name', 'Người nhận')->json('data.id');
        $second = $this->postJson('/api/addresses', $this->fields(['label' => 'Công ty']))->assertCreated()->assertJsonPath('data.is_default', false)->json('data.id');
        $this->putJson("/api/addresses/$second/default")->assertOk()->assertJsonPath('data.is_default', true);
        $this->assertFalse(ShippingAddress::find($first)->is_default);
        $this->putJson("/api/addresses/$second", $this->fields(['is_default' => false]))->assertOk()->assertJsonPath('data.is_default', true);
        $this->assertDatabaseHas('shipping_addresses', ['id' => $first, 'user_id' => $user->id]);
        $this->getJson('/api/addresses')->assertJsonCount(2, 'data')->assertJsonMissingPath('data.0.user_id')->assertJsonPath('data.0.id', $second);
    }

    public function test_other_users_cannot_read_edit_delete_default_or_checkout_with_address(): void
    {
        $owner = $this->account(); $other = $this->account('other@example.test');
        $id = $this->actingAs($owner, 'sanctum')->postJson('/api/addresses', $this->fields())->json('data.id');
        $this->actingAs($other, 'sanctum')->getJson('/api/addresses')->assertJsonCount(0, 'data');
        $this->putJson("/api/addresses/$id", $this->fields())->assertNotFound();
        $this->deleteJson("/api/addresses/$id")->assertNotFound();
        $this->putJson("/api/addresses/$id/default")->assertNotFound();
        $this->fillCart($other);
        $this->postJson('/api/checkout', ['address_id' => $id, 'payment_method' => 'cod'])->assertUnprocessable();
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_validation_rejects_blank_oversized_and_invalid_phone(): void
    {
        $this->actingAs($this->account(), 'sanctum');
        $this->postJson('/api/addresses', $this->fields(['recipient_name' => '   ', 'recipient_phone' => 'hello', 'shipping_address' => '   ', 'is_default' => 'yes']))
            ->assertUnprocessable()->assertJsonValidationErrors(['recipient_name', 'recipient_phone', 'shipping_address', 'is_default']);
        $this->postJson('/api/addresses', $this->fields(['label' => str_repeat('a', 51), 'recipient_name' => str_repeat('b', 101), 'shipping_address' => str_repeat('c', 1001)]))
            ->assertUnprocessable()->assertJsonValidationErrors(['label', 'recipient_name', 'shipping_address']);
        $this->postJson('/api/addresses', $this->fields(['recipient_phone' => '+84 912 345 678']))->assertCreated();
        $this->postJson('/api/addresses', $this->fields(['recipient_phone' => ['bad']]))->assertUnprocessable()->assertJsonValidationErrors('recipient_phone');
        $this->postJson('/api/addresses', $this->fields(['recipient_phone' => '1------2']))->assertUnprocessable()->assertJsonValidationErrors('recipient_phone');
    }

    public function test_limit_of_twenty_and_updating_at_limit(): void
    {
        $this->actingAs($this->account(), 'sanctum');
        for ($i = 0; $i < 20; $i++) $this->postJson('/api/addresses', $this->fields(['label' => 'Địa chỉ '.$i]))->assertCreated();
        $this->postJson('/api/addresses', $this->fields())->assertUnprocessable();
        $this->putJson('/api/addresses/1', $this->fields(['label' => 'Đã sửa']))->assertOk();
        $this->assertDatabaseCount('shipping_addresses', 20);
    }

    public function test_delete_default_promotes_oldest_remaining_and_delete_last_is_allowed(): void
    {
        $this->actingAs($this->account(), 'sanctum');
        $first = $this->postJson('/api/addresses', $this->fields())->json('data.id');
        $second = $this->postJson('/api/addresses', $this->fields(['is_default' => true]))->json('data.id');
        $third = $this->postJson('/api/addresses', $this->fields())->json('data.id');
        $this->deleteJson("/api/addresses/$third")->assertOk();
        $this->assertTrue(ShippingAddress::find($second)->is_default);
        $this->deleteJson("/api/addresses/$second")->assertOk();
        $this->assertTrue(ShippingAddress::find($first)->is_default);
        $this->deleteJson("/api/addresses/$first")->assertOk();
        $this->getJson('/api/addresses')->assertJsonCount(0, 'data');
        $this->postJson('/api/addresses', $this->fields())->assertJsonPath('data.is_default', true);
    }

    public function test_checkout_uses_server_snapshot_and_later_edits_and_deletes_do_not_change_order(): void
    {
        $user = $this->account(); $this->actingAs($user, 'sanctum');
        $id = $this->postJson('/api/addresses', $this->fields())->json('data.id');
        $this->fillCart($user);
        $orderId = $this->postJson('/api/checkout', ['address_id' => $id, 'recipient_name' => 'Client tampering', 'shipping_address' => 'Fake', 'payment_method' => 'cod'])
            ->assertCreated()->assertJsonPath('data.recipient_name', 'Nguyễn Văn A')->assertJsonPath('data.shipping_address', $this->fields()['shipping_address'])->json('data.id');
        $this->putJson("/api/addresses/$id", $this->fields(['shipping_address' => 'Địa chỉ mới']))->assertOk();
        $this->deleteJson("/api/addresses/$id")->assertOk();
        $this->assertSame($this->fields()['shipping_address'], Order::find($orderId)->shipping_address);
        $this->fillCart($user);
        $this->postJson('/api/checkout', ['address_id' => $id, 'payment_method' => 'cod'])->assertUnprocessable();
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_manual_checkout_remains_available_and_does_not_create_saved_address(): void
    {
        $user = $this->account(); $this->actingAs($user, 'sanctum'); $this->fillCart($user);
        $this->postJson('/api/checkout', ['payment_method' => 'cod'])->assertUnprocessable()->assertJsonValidationErrors(['recipient_name', 'recipient_phone', 'shipping_address']);
        $this->postJson('/api/checkout', array_merge($this->fields(), ['payment_method' => 'cod']))->assertCreated();
        $this->assertDatabaseCount('shipping_addresses', 0);
    }
}
