<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountTestCase;

class WishlistTest extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('products', function (Blueprint $table) {
            $table->id(); $table->string('maSP'); $table->string('tenSP');
            $table->string('status'); $table->decimal('price', 15, 2);
            $table->integer('quantity'); $table->string('img_url')->nullable();
            $table->integer('warranty_months')->default(12); $table->text('specifications')->nullable();
            $table->timestamps();
        });
        Schema::create('carts', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('user_id'); $table->timestamps();
        });
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('cart_id');
            $table->unsignedBigInteger('product_id'); $table->integer('quantity');
        });
        (require __DIR__.'/../../database/migrations/2026_10_19_180000_create_wishlist_items_table.php')->up();
    }

    private function product(array $attributes = []): Product
    {
        return Product::create(array_merge(['maSP' => 'SP001', 'tenSP' => 'Laptop',
            'status' => 'active', 'price' => '1000000.00', 'quantity' => 2], $attributes));
    }

    public function test_guests_cannot_read_or_write_favorites(): void
    {
        $this->getJson('/api/wishlist')->assertUnauthorized();
        $this->putJson('/api/wishlist/1')->assertUnauthorized();
        $this->deleteJson('/api/wishlist/1')->assertUnauthorized();
    }

    public function test_save_is_idempotent_and_scoped_to_authenticated_account(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test'); $product = $this->product();
        $this->actingAs($user, 'sanctum')->putJson("/api/wishlist/{$product->id}", ['user_id' => $other->id])->assertOk();
        $this->putJson("/api/wishlist/{$product->id}")->assertOk();
        $this->assertDatabaseCount('wishlist_items', 1);
        $this->assertDatabaseHas('wishlist_items', ['user_id' => $user->id, 'product_id' => $product->id]);
        $this->getJson('/api/wishlist')->assertOk()->assertJsonCount(1, 'items')->assertJsonPath('items.0.product.id', $product->id);
        $this->actingAs($other, 'sanctum')->getJson('/api/wishlist')->assertJsonCount(0, 'items');
        $this->deleteJson("/api/wishlist/{$product->id}")->assertOk();
        $this->assertDatabaseCount('wishlist_items', 1);
        $this->putJson("/api/wishlist/{$product->id}")->assertOk();
        $this->assertDatabaseCount('wishlist_items', 2);
    }

    public function test_remove_is_idempotent_and_never_removes_another_users_item(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test'); $product = $this->product();
        $this->actingAs($user, 'sanctum')->putJson("/api/wishlist/{$product->id}")->assertOk();
        $this->actingAs($other, 'sanctum')->putJson("/api/wishlist/{$product->id}")->assertOk();
        $this->actingAs($user, 'sanctum')->deleteJson("/api/wishlist/{$product->id}")->assertOk();
        $this->deleteJson("/api/wishlist/{$product->id}")->assertOk();
        $this->getJson('/api/wishlist')->assertJsonCount(0, 'items');
        $this->assertDatabaseHas('wishlist_items', ['user_id' => $other->id, 'product_id' => $product->id]);
    }

    public function test_out_of_stock_can_be_saved_but_hidden_and_missing_products_cannot(): void
    {
        $this->actingAs($this->account(), 'sanctum');
        $empty = $this->product(['quantity' => 0]); $hidden = $this->product(['status' => 'inactive']);
        $this->putJson("/api/wishlist/{$empty->id}")->assertOk();
        $this->putJson("/api/wishlist/{$hidden->id}")->assertNotFound();
        $this->putJson('/api/wishlist/99999')->assertNotFound();
        $this->assertDatabaseCount('wishlist_items', 1);
    }

    public function test_hidden_or_deleted_favorites_remain_removable_without_leaking_product_fields(): void
    {
        $this->actingAs($this->account(), 'sanctum'); $product = $this->product();
        $this->putJson("/api/wishlist/{$product->id}")->assertOk();
        $product->update(['status' => 'inactive', 'tenSP' => 'Private draft']);
        $this->getJson('/api/wishlist')->assertJsonPath('items.0.product', null)->assertJsonMissing(['tenSP' => 'Private draft']);
        $product->delete();
        $this->getJson('/api/wishlist')->assertJsonPath('items.0.product_id', $product->id)->assertJsonPath('items.0.product', null);
        $this->deleteJson("/api/wishlist/{$product->id}")->assertOk();
        $this->assertDatabaseCount('wishlist_items', 0);
    }

    public function test_current_price_and_stock_are_returned_and_cart_revalidates_availability(): void
    {
        $this->actingAs($this->account(), 'sanctum'); $product = $this->product();
        $this->putJson("/api/wishlist/{$product->id}")->assertOk();
        $product->update(['price' => '2500000.00', 'quantity' => 0]);
        $this->getJson('/api/wishlist')->assertJsonPath('items.0.product.price', '2500000.00')->assertJsonPath('items.0.product.quantity', 0);
        $this->postJson('/api/cart/add', ['product_id' => $product->id, 'quantity' => 1])->assertStatus(400);
        $product->update(['quantity' => 2, 'status' => 'inactive']);
        $this->postJson('/api/cart/add', ['product_id' => $product->id, 'quantity' => 1])->assertUnprocessable();
        $product->update(['status' => 'active']);
        $this->postJson('/api/cart/add', ['product_id' => $product->id, 'quantity' => 1])->assertOk();
        $this->assertDatabaseHas('cart_items', ['product_id' => $product->id, 'quantity' => 1]);
        $this->assertDatabaseCount('wishlist_items', 1);
    }

    public function test_limit_preserves_existing_saves_and_allows_removal_then_new_save(): void
    {
        $user = $this->account(); $product = $this->product();
        for ($i = 1000; $i < 1200; $i++) {
            DB::table('wishlist_items')->insert(['user_id' => $user->id, 'product_id' => $i, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->actingAs($user, 'sanctum')->putJson('/api/wishlist/1000')->assertOk();
        $this->putJson("/api/wishlist/{$product->id}")->assertUnprocessable()->assertJsonValidationErrors('wishlist');
        $this->assertDatabaseCount('wishlist_items', 200);
        $this->deleteJson('/api/wishlist/1000')->assertOk();
        $this->putJson("/api/wishlist/{$product->id}")->assertOk();
        $this->assertDatabaseCount('wishlist_items', 200);
    }
}
