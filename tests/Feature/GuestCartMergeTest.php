<?php
namespace Tests\Feature;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\AccountTestCase;
class GuestCartMergeTest extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('products', function (Blueprint $table) { $table->id(); $table->string('maSP'); $table->string('tenSP'); $table->decimal('price', 15, 2); $table->integer('quantity'); $table->string('status'); $table->integer('warranty_months')->default(12); $table->timestamps(); });
        Schema::create('carts', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('user_id'); $table->timestamps(); });
        Schema::create('cart_items', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('cart_id'); $table->unsignedBigInteger('product_id'); $table->integer('quantity'); });
        (require __DIR__.'/../../database/migrations/2026_10_19_230000_create_guest_cart_merges_table.php')->up();
    }
    private function product(array $extra = []): Product { return Product::create(array_merge(['maSP' => 'SP'.Str::random(5), 'tenSP' => 'Laptop', 'price' => '12000.00', 'quantity' => 10, 'status' => 'active'], $extra)); }
    public function test_guest_merge_requires_login_and_rejects_invalid_batches(): void
    {
        $this->postJson('/api/cart/merge', [])->assertUnauthorized();
        $this->actingAs($this->account(), 'sanctum')->postJson('/api/cart/merge', ['batch_id' => 'invalid', 'items' => []])->assertUnprocessable();
        $this->postJson('/api/cart/merge', ['batch_id' => (string) Str::uuid(), 'items' => [['product_id' => 1, 'quantity' => 0]]])->assertUnprocessable();
        $this->postJson('/api/cart/merge', ['batch_id' => (string) Str::uuid(), 'items' => [['product_id' => 1, 'quantity' => 1], ['product_id' => 1, 'quantity' => 2]]])->assertUnprocessable();
    }
    public function test_merges_into_existing_cart_with_server_product_prices_and_owner(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test'); $product = $this->product();
        $cart = Cart::create(['user_id' => $user->id]); CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', ['batch_id' => (string) Str::uuid(), 'user_id' => $other->id, 'items' => [['product_id' => $product->id, 'quantity' => 2, 'price' => 1]]])
            ->assertOk()->assertJsonPath('items.0.quantity', 3)->assertJsonPath('items.0.product.price', '12000.00')->assertJsonCount(1, 'merge.added')->assertJsonCount(0, 'merge.skipped');
        $this->assertSame(10, $product->fresh()->quantity); $this->assertDatabaseCount('carts', 1);
        $this->actingAs($other, 'sanctum')->getJson('/api/cart')->assertJsonCount(0, 'items');
    }
    public function test_replaying_same_batch_after_lost_response_never_adds_twice(): void
    {
        $user = $this->account(); $product = $this->product();
        $body = ['batch_id' => (string) Str::uuid(), 'items' => [['product_id' => $product->id, 'quantity' => 2]]];
        $first = $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', $body)->assertOk()->json();
        $this->postJson('/api/cart/merge', $body)->assertOk()->assertExactJson($first);
        $this->assertSame(2, CartItem::firstOrFail()->quantity); $this->assertDatabaseCount('guest_cart_merges', 1);
        $body['items'][0]['quantity'] = 3; $this->postJson('/api/cart/merge', $body)->assertStatus(409);
        $this->assertSame(2, CartItem::firstOrFail()->quantity);
    }
    public function test_unavailable_and_insufficient_products_are_reported_without_partial_quantity_or_rollback_of_valid_lines(): void
    {
        $user = $this->account(); $good = $this->product(); $hidden = $this->product(['status' => 'inactive']); $low = $this->product(['quantity' => 1]);
        $body = ['batch_id' => (string) Str::uuid(), 'items' => [['product_id' => $good->id, 'quantity' => 2], ['product_id' => $hidden->id, 'quantity' => 2], ['product_id' => $low->id, 'quantity' => 2], ['product_id' => 9999, 'quantity' => 1]]];
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', $body)->assertOk()->assertJsonCount(1, 'merge.added')->assertJsonCount(3, 'merge.skipped')->assertJsonCount(1, 'items');
        $this->assertDatabaseCount('cart_items', 1); $this->assertDatabaseHas('cart_items', ['product_id' => $good->id, 'quantity' => 2]);
    }
    public function test_existing_quantity_is_included_in_stock_check_and_skipped_batch_can_be_retried_as_new_batch(): void
    {
        $user = $this->account(); $product = $this->product(['quantity' => 3]); $cart = Cart::create(['user_id' => $user->id]); CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 2]);
        $body = ['batch_id' => (string) Str::uuid(), 'items' => [['product_id' => $product->id, 'quantity' => 2]]];
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/merge', $body)->assertJsonCount(1, 'merge.skipped')->assertJsonPath('items.0.quantity', 2);
        $product->update(['quantity' => 10]); $body['batch_id'] = (string) Str::uuid();
        $this->postJson('/api/cart/merge', $body)->assertJsonPath('items.0.quantity', 4)->assertJsonCount(0, 'merge.skipped');
    }
    public function test_cart_mutations_do_not_edit_or_delete_another_accounts_items(): void
    {
        $owner = $this->account(); $other = $this->account('other@example.test'); $product = $this->product();
        $cart = Cart::create(['user_id' => $owner->id]); $item = CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 2]);
        $this->actingAs($other, 'sanctum')->putJson('/api/cart/items/'.$item->id, ['quantity' => 1])->assertNotFound();
        $this->deleteJson('/api/cart/items/'.$item->id)->assertNotFound(); $this->assertDatabaseHas('cart_items', ['id' => $item->id, 'quantity' => 2]);
    }
}
