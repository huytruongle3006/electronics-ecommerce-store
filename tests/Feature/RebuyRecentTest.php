<?php
namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\OrderDetail;
use App\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\OrderTestCase;

class RebuyRecentTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::table('products',fn(Blueprint $t)=>$t->text('img_url')->nullable());
        Schema::create('carts',function(Blueprint $t){$t->id();$t->unsignedBigInteger('user_id');$t->timestamps();});
        Schema::create('cart_items',function(Blueprint $t){$t->id();$t->unsignedBigInteger('cart_id');$t->unsignedBigInteger('product_id');$t->integer('quantity');});
        (require __DIR__.'/../../database/migrations/2026_10_26_160000_create_order_rebuy_batches_table.php')->up();
    }
    private function requestFor($product, array $extra=[]): array
    {
        return array_merge(['batch_id'=>(string)Str::uuid(),'items'=>[['product_id'=>$product->id,'quantity'=>2,'price'=>(string)$product->price]]],$extra);
    }

    public function test_rebuy_requires_login_and_ownership(): void
    {
        $user=$this->account();$other=$this->account('other@example.test');$order=$this->purchase($user);$p=$order->details->first()->product;
        $this->getJson("/api/orders/$order->id/rebuy")->assertUnauthorized();
        $this->postJson("/api/orders/$order->id/rebuy",$this->requestFor($p))->assertUnauthorized();
        $this->actingAs($other,'sanctum')->getJson("/api/orders/$order->id/rebuy")->assertNotFound();
        $this->postJson("/api/orders/$order->id/rebuy",$this->requestFor($p))->assertNotFound();
        $this->assertDatabaseCount('cart_items',0);
    }

    public function test_preview_uses_current_prices_and_remaining_stock_including_existing_cart(): void
    {
        $user=$this->account();$order=$this->purchase($user,'completed');$p=$order->details->first()->product;$p->update(['status'=>'active','quantity'=>2,'price'=>9000000]);
        $cart=Cart::create(['user_id'=>$user->id]);CartItem::create(['cart_id'=>$cart->id,'product_id'=>$p->id,'quantity'=>1]);
        $this->actingAs($user,'sanctum')->getJson("/api/orders/$order->id/rebuy")->assertOk()->assertJsonPath('data.lines.0.original_quantity',2)
            ->assertJsonPath('data.lines.0.old_price','10000000.00')->assertJsonPath('data.lines.0.price','9000000.00')->assertJsonPath('data.lines.0.suggested_quantity',1)->assertJsonPath('data.lines.0.cart_quantity',1);
        $this->assertDatabaseCount('orders',1);$this->assertSame(2,$p->fresh()->quantity);
    }

    public function test_preview_explains_discontinued_missing_and_out_of_stock_products(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;
        $this->actingAs($user,'sanctum')->getJson("/api/orders/$order->id/rebuy")->assertJsonPath('data.lines.0.max_quantity',0)->assertJsonPath('data.lines.0.reason','Sản phẩm đã ngừng bán.');
        $p->update(['status'=>'active','quantity'=>0]);$this->getJson("/api/orders/$order->id/rebuy")->assertJsonPath('data.lines.0.reason','Sản phẩm tạm hết hàng.');
        $p->delete();$this->getJson("/api/orders/$order->id/rebuy")->assertJsonPath('data.lines.0.reason','Sản phẩm đã bị xóa.');
    }

    public function test_rebuy_merges_cart_at_current_price_without_changing_order_or_stock(): void
    {
        $user=$this->account();$order=$this->purchase($user,'cancelled');$p=$order->details->first()->product;$p->update(['status'=>'active','quantity'=>10,'price'=>8500000]);
        $cart=Cart::create(['user_id'=>$user->id]);CartItem::create(['cart_id'=>$cart->id,'product_id'=>$p->id,'quantity'=>1]);
        $this->actingAs($user,'sanctum')->postJson("/api/orders/$order->id/rebuy",$this->requestFor($p))->assertOk()->assertJsonPath('replayed',false)->assertJsonPath('items.0.quantity',3)->assertJsonPath('rebuy.added.0.price','8500000.00');
        $this->assertSame(10,$p->fresh()->quantity);$this->assertSame('cancelled',$order->fresh()->status);$this->assertDatabaseCount('orders',1);$this->assertDatabaseCount('payments',1);
        $this->assertSame('10000000.00',$order->details()->first()->price);
    }

    public function test_lost_response_retry_is_idempotent_even_after_price_changes(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;$p->update(['status'=>'active']);$body=$this->requestFor($p);
        $this->actingAs($user,'sanctum')->postJson("/api/orders/$order->id/rebuy",$body)->assertOk();
        $p->update(['price'=>11000000]);
        $this->postJson("/api/orders/$order->id/rebuy",$body)->assertOk()->assertJsonPath('replayed',true)->assertJsonPath('items.0.quantity',2)->assertJsonPath('items.0.product.price','11000000.00');
        $this->assertDatabaseCount('order_rebuy_batches',1);
        $body['items'][0]['quantity']=1;$this->postJson("/api/orders/$order->id/rebuy",$body)->assertStatus(409);
    }

    public function test_changed_price_and_stock_require_preview_again_and_do_not_add(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;$p->update(['status'=>'active']);$body=$this->requestFor($p);$p->update(['price'=>12000000]);
        $this->actingAs($user,'sanctum')->postJson("/api/orders/$order->id/rebuy",$body)->assertStatus(409);$this->assertDatabaseCount('cart_items',0);
        $body=$this->requestFor($p);$p->update(['quantity'=>1]);$this->postJson("/api/orders/$order->id/rebuy",$body)->assertStatus(409);
        $this->assertDatabaseCount('cart_items',0);$this->assertDatabaseCount('order_rebuy_batches',0);
    }

    public function test_multiple_selected_lines_roll_back_together_if_one_fails(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;$p->update(['status'=>'active']);
        $other=Product::create(['maSP'=>'SECOND','tenSP'=>'Chuột','price'=>100000,'quantity'=>0,'status'=>'active']);
        OrderDetail::create(['order_id'=>$order->id,'product_id'=>$other->id,'quantity'=>1,'price'=>100000,'total_line'=>100000]);
        $body=$this->requestFor($p);$body['items'][]=['product_id'=>$other->id,'quantity'=>1,'price'=>'100000.00'];
        $this->actingAs($user,'sanctum')->postJson("/api/orders/$order->id/rebuy",$body)->assertStatus(409);$this->assertDatabaseCount('cart_items',0);$this->assertDatabaseCount('order_rebuy_batches',0);
    }

    public function test_request_rejects_foreign_product_quantity_and_invalid_batch(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;$p->update(['status'=>'active']);$this->actingAs($user,'sanctum');
        $this->postJson("/api/orders/$order->id/rebuy",$this->requestFor($p,['batch_id'=>'bad']))->assertUnprocessable();
        $body=$this->requestFor($p);$body['items'][0]['quantity']=3;$this->postJson("/api/orders/$order->id/rebuy",$body)->assertUnprocessable();
        $body=$this->requestFor($p);$body['items'][0]['product_id']=999;$this->postJson("/api/orders/$order->id/rebuy",$body)->assertUnprocessable();
        $body=$this->requestFor($p);$body['items'][]=$body['items'][0];$this->postJson("/api/orders/$order->id/rebuy",$body)->assertUnprocessable();
        $this->assertDatabaseCount('cart_items',0);
    }

    public function test_duplicate_historical_product_lines_are_aggregated(): void
    {
        $user=$this->account();$order=$this->purchase($user);$p=$order->details->first()->product;$p->update(['status'=>'active','quantity'=>10]);
        OrderDetail::create(['order_id'=>$order->id,'product_id'=>$p->id,'quantity'=>2,'price'=>9000000,'total_line'=>18000000]);
        $this->actingAs($user,'sanctum')->getJson("/api/orders/$order->id/rebuy")->assertJsonCount(1,'data.lines')->assertJsonPath('data.lines.0.original_quantity',4)->assertJsonPath('data.lines.0.old_price',null);
    }

    public function test_recently_viewed_returns_requested_order_current_prices_and_placeholders(): void
    {
        $user=$this->account();$order=$this->purchase($user);$hidden=$order->details->first()->product;
        $active=Product::create(['maSP'=>'ACTIVE','tenSP'=>'Hiện bán','price'=>150000,'quantity'=>0,'status'=>'active']);
        $this->postJson('/api/products/recently-viewed',['ids'=>[$active->id,$hidden->id,999]])->assertOk()->assertJsonCount(3,'data')->assertJsonPath('data.0.id',$active->id)->assertJsonPath('data.0.product.price','150000.00')->assertJsonPath('data.0.product.quantity',0)->assertJsonPath('data.1.product',null)->assertJsonPath('data.2.product',null)->assertJsonMissingPath('data.0.product.supplier');
    }

    public function test_recent_api_validates_limit_and_duplicate_ids(): void
    {
        $this->postJson('/api/products/recently-viewed',['ids'=>[]])->assertOk()->assertJsonCount(0,'data');
        $this->postJson('/api/products/recently-viewed',['ids'=>range(1,13)])->assertUnprocessable();
        $this->postJson('/api/products/recently-viewed',['ids'=>[1,1]])->assertUnprocessable();
        $this->postJson('/api/products/recently-viewed',['ids'=>[-1]])->assertUnprocessable();
    }
}
