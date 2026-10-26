<?php

namespace Tests\Feature;

use App\Models\{Cart, CartItem, Order, OrderDetail, Payment, Product, Voucher};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Tests\Support\OrderTestCase;

class CustomerVoucherTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::table('vouchers', function (Blueprint $t) {
            $t->decimal('discount_percent',5,2)->default(10);$t->decimal('min_order_amount',15,2)->default(0);
            $t->decimal('max_discount_amount',15,2)->default(0);$t->dateTime('expired_at')->nullable();
        });
        (require __DIR__.'/../../database/migrations/2026_10_26_180000_add_per_user_limit_to_vouchers.php')->up();
        Schema::create('carts',function(Blueprint $t){$t->id();$t->unsignedBigInteger('user_id');$t->timestamps();});
        Schema::create('cart_items',function(Blueprint $t){$t->id();$t->unsignedBigInteger('cart_id');$t->unsignedBigInteger('product_id');$t->integer('quantity');});
    }
    private function voucher(array $fields=[]): Voucher
    {
        return Voucher::create(array_merge(['maVoucher'=>'SALE'.Voucher::count(),'quantity'=>5,'status'=>'active','discount_percent'=>10,'min_order_amount'=>100000,'max_discount_amount'=>50000,'per_user_limit'=>1,'expired_at'=>now()->addDay()],$fields));
    }
    private function basket($user, string $price='200000.00', int $qty=2): Product
    {
        $p=Product::create(['maSP'=>'SP'.Product::count(),'tenSP'=>'Laptop','price'=>$price,'quantity'=>10,'status'=>'active']);
        $cart=Cart::firstOrCreate(['user_id'=>$user->id]);CartItem::create(['cart_id'=>$cart->id,'product_id'=>$p->id,'quantity'=>$qty]);return $p;
    }
    private function fields(array $extra=[]): array
    {
        return array_merge(['recipient_name'=>'Khách','recipient_phone'=>'0912345678','shipping_address'=>'TP HCM','payment_method'=>'cod'],$extra);
    }
    private function quote(Voucher $v): array
    {
        return $this->postJson('/api/vouchers/preview',['code'=>strtolower($v->maVoucher)])->assertOk()->json('data');
    }
    private function checkout(Voucher $v, array $q)
    {
        return $this->postJson('/api/checkout',$this->fields(['voucher_code'=>$v->maVoucher,'voucher_quote'=>$q['quote_token']]));
    }

    public function test_requires_login_and_customer_cannot_manage_admin_vouchers(): void
    {
        $this->getJson('/api/vouchers')->assertUnauthorized();$this->postJson('/api/vouchers/preview',['code'=>'X'])->assertUnauthorized();
        $this->actingAs($this->account(),'sanctum')->postJson('/api/admin/vouchers',[])->assertForbidden();
    }
    public function test_lists_only_live_codes_with_conditions_and_own_usage(): void
    {
        $user=$this->account();$this->basket($user);$v=$this->voucher();
        $this->voucher(['status'=>'inactive']);$this->voucher(['quantity'=>0]);$this->voucher(['expired_at'=>now()->subSecond()]);
        $other=$this->account('other@test.test');$order=$this->purchase($other,'completed',false);$order->update(['voucher_id'=>$v->id]);
        $this->actingAs($user,'sanctum')->getJson('/api/vouchers')->assertOk()->assertJsonPath('data.total',1)
            ->assertJsonPath('data.data.0.code',$v->maVoucher)->assertJsonPath('data.data.0.eligible',true)
            ->assertJsonPath('data.data.0.used_count',0)->assertJsonPath('data.data.0.remaining_for_user',1)
            ->assertJsonPath('data.data.0.estimated_discount','40000.00')->assertJsonPath('subtotal','400000.00');
    }
    public function test_preview_normalizes_code_calculates_cap_and_does_not_consume_anything(): void
    {
        $u=$this->account();$p=$this->basket($u);$v=$this->voucher(['discount_percent'=>50]);$this->actingAs($u,'sanctum');
        $q=$this->postJson('/api/vouchers/preview',['code'=>'  '.strtolower($v->maVoucher).'  ','subtotal'=>1])->assertOk()->json('data');
        $this->assertSame('50000.00',$q['discount_amount']);$this->assertSame('350000.00',$q['final_amount']);
        $this->assertSame(64,strlen($q['quote_token']));$this->assertArrayNotHasKey('_model',$q);
        $this->assertSame(5,$v->fresh()->quantity);$this->assertSame(10,$p->fresh()->quantity);$this->assertDatabaseCount('orders',0);$this->assertDatabaseCount('cart_items',1);
    }
    public function test_invalid_codes_are_actionable_422_without_side_effects(): void
    {
        $u=$this->account();$this->basket($u);$this->actingAs($u,'sanctum');
        foreach([['status'=>'inactive'],['quantity'=>0],['expired_at'=>now()],['min_order_amount'=>400001]] as $fields){
            $v=$this->voucher($fields);$this->postJson('/api/vouchers/preview',['code'=>$v->maVoucher])->assertUnprocessable()->assertJsonValidationErrors('voucher_code');
        }
        foreach(['MISSING','',str_repeat('A',21)] as $code)$this->postJson('/api/vouchers/preview',compact('code'))->assertUnprocessable();
        $this->assertDatabaseCount('orders',0);$this->assertDatabaseCount('cart_items',1);
    }
    public function test_checkout_uses_quote_and_records_discount_once(): void
    {
        $u=$this->account();$p=$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');$q=$this->quote($v);
        $this->checkout($v,$q)->assertCreated()->assertJsonPath('data.discount_amount','40000.00')->assertJsonPath('data.final_amount','360000.00');
        $this->assertSame(4,$v->fresh()->quantity);$this->assertSame(8,$p->fresh()->quantity);$this->assertDatabaseCount('cart_items',0);
        $this->assertDatabaseHas('payments',['amount'=>360000]);$this->checkout($v,$q)->assertUnprocessable();$this->assertDatabaseCount('orders',1);$this->assertSame(4,$v->fresh()->quantity);
    }
    public function test_per_account_limit_and_cancel_restore_both_limits_exactly_once(): void
    {
        $u=$this->account();$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');$q=$this->quote($v);
        $id=$this->checkout($v,$q)->assertCreated()->json('data.id');$this->basket($u);
        $this->postJson('/api/vouchers/preview',['code'=>$v->maVoucher])->assertUnprocessable();
        $this->getJson('/api/vouchers')->assertJsonPath('data.data.0.remaining_for_user',0)->assertJsonPath('data.data.0.eligible',false);
        $this->postJson("/api/orders/$id/cancel",['reason'=>'Đặt nhầm'])->assertOk();
        $this->postJson("/api/orders/$id/cancel",['reason'=>'Thử lại'])->assertOk();$this->assertSame(5,$v->fresh()->quantity);
        $q=$this->quote($v);$this->checkout($v,$q)->assertCreated();$this->assertSame(4,$v->fresh()->quantity);
    }
    public function test_server_rejects_old_quote_when_cart_or_policy_changes(): void
    {
        $u=$this->account();$p=$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');$q=$this->quote($v);
        $p->update(['price'=>210000]);$this->checkout($v,$q)->assertConflict();
        $q=$this->quote($v);CartItem::first()->update(['quantity'=>1]);$this->checkout($v,$q)->assertConflict();
        $q=$this->quote($v);$v->update(['discount_percent'=>20]);$this->checkout($v,$q)->assertConflict();
        $this->assertDatabaseCount('orders',0);$this->assertSame(10,$p->fresh()->quantity);$this->assertSame(5,$v->fresh()->quantity);
    }
    public function test_revalidates_expiry_usage_and_stock_at_checkout(): void
    {
        $u=$this->account();$p=$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');$q=$this->quote($v);
        $v->update(['quantity'=>0]);$this->checkout($v,$q)->assertUnprocessable();$v->update(['quantity'=>5]);
        $v->update(['expired_at'=>now()->subSecond()]);$this->checkout($v,$q)->assertUnprocessable();$v->update(['expired_at'=>now()->addDay()]);
        $p->update(['quantity'=>1]);$this->checkout($v,$q)->assertUnprocessable();$p->update(['quantity'=>10,'status'=>'inactive']);$this->checkout($v,$q)->assertUnprocessable();
        $this->assertDatabaseCount('orders',0);$this->assertSame(5,$v->fresh()->quantity);
    }
    public function test_no_forged_quote_or_client_discount_is_trusted(): void
    {
        $u=$this->account();$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');
        $this->postJson('/api/checkout',$this->fields(['voucher_code'=>$v->maVoucher,'discount_amount'=>400000]))->assertConflict();
        $this->checkout($v,['quote_token'=>str_repeat('0',64)])->assertConflict();
        $q=$this->quote($v);$other=$this->account('other@test.test');$this->basket($other);$this->actingAs($other,'sanctum');$this->checkout($v,$q)->assertConflict();
        $this->assertDatabaseCount('orders',0);
    }
    public function test_checkout_failure_rolls_back_coupon_stock_and_cart(): void
    {
        $u=$this->account();$p=$this->basket($u);$v=$this->voucher();$this->actingAs($u,'sanctum');$q=$this->quote($v);
        Event::listen('eloquent.creating: '.OrderDetail::class,function(){throw new \RuntimeException('simulated write failure');});
        try{$this->checkout($v,$q)->assertStatus(500);}finally{Event::forget('eloquent.creating: '.OrderDetail::class);}
        $this->assertDatabaseCount('orders',0);$this->assertDatabaseCount('cart_items',1);$this->assertSame(5,$v->fresh()->quantity);$this->assertSame(10,$p->fresh()->quantity);
    }
    public function test_percentage_rounding_and_no_cap_never_exceed_subtotal(): void
    {
        $u=$this->account();$this->basket($u,'1.05',1);$v=$this->voucher(['discount_percent'=>10,'min_order_amount'=>0,'max_discount_amount'=>0]);$this->actingAs($u,'sanctum');
        $q=$this->quote($v);$this->assertSame('0.11',$q['discount_amount']);$this->assertSame('0.94',$q['final_amount']);
        $v->update(['discount_percent'=>100]);$q=$this->quote($v);$this->assertSame('1.05',$q['discount_amount']);$this->assertSame('0.00',$q['final_amount']);
    }
    public function test_empty_cart_can_browse_codes_but_not_apply_and_pagination_is_bounded(): void
    {
        $u=$this->account();$v=$this->voucher();$this->actingAs($u,'sanctum');
        $this->getJson('/api/vouchers')->assertOk()->assertJsonPath('data.data.0.eligible',false);
        $this->postJson('/api/vouchers/preview',['code'=>$v->maVoucher])->assertUnprocessable();
        foreach(range(1,13) as $n)$this->voucher();$this->getJson('/api/vouchers')->assertJsonPath('data.per_page',12)->assertJsonPath('data.last_page',2);
        $this->getJson('/api/vouchers?page=0')->assertUnprocessable();
    }
    public function test_admin_manages_limits_normalizes_codes_and_preserves_used_history(): void
    {
        $admin=$this->administrator();$this->actingAs($admin,'sanctum');
        $fields=['maVoucher'=>'  welcome  ','discount_percent'=>10,'min_order_amount'=>0,'max_discount_amount'=>0,'quantity'=>10,'status'=>'active','per_user_limit'=>2];
        $id=$this->postJson('/api/admin/vouchers',$fields)->assertCreated()->assertJsonPath('data.maVoucher','WELCOME')->assertJsonPath('data.per_user_limit',2)->json('data.id');
        $this->postJson('/api/admin/vouchers',$fields)->assertUnprocessable();
        $this->putJson("/api/admin/vouchers/$id",array_merge($fields,['per_user_limit'=>0]))->assertUnprocessable();
        $this->putJson("/api/admin/vouchers/$id",array_merge($fields,['per_user_limit'=>3]))->assertOk()->assertJsonPath('data.per_user_limit',3);
        $order=$this->purchase($admin,'completed',false);$order->update(['voucher_id'=>$id]);
        $this->deleteJson("/api/admin/vouchers/$id")->assertUnprocessable();$this->assertDatabaseHas('vouchers',['id'=>$id]);
        $unused=$this->voucher();$this->deleteJson("/api/admin/vouchers/{$unused->id}")->assertOk();$this->assertDatabaseMissing('vouchers',['id'=>$unused->id]);
    }
    public function test_legacy_checkout_without_coupon_remains_available(): void
    {
        $u=$this->account();$this->basket($u);$this->actingAs($u,'sanctum')->postJson('/api/checkout',$this->fields())->assertCreated()->assertJsonPath('data.discount_amount','0.00')->assertJsonPath('data.final_amount','400000.00');
    }
}
