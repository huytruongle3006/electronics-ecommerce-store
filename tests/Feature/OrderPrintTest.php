<?php

namespace Tests\Feature;

use App\Models\{Order, Payment, Product};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\OrderTestCase;

class OrderPrintTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('settings',function(Blueprint $t){$t->id();$t->string('key');$t->text('value')->nullable();$t->timestamps();});
    }
    public function test_requires_login_and_only_owner_can_print_customer_route(): void
    {
        $u=$this->account();$order=$this->purchase($u);
        $this->get("/api/orders/$order->id/print")->assertUnauthorized();
        $this->actingAs($this->account('other@test.test'),'sanctum')->get("/api/orders/$order->id/print")->assertNotFound();
        $this->actingAs($u,'sanctum')->get("/api/orders/$order->id/print")->assertOk()->assertSee('PHIẾU THÔNG TIN ĐƠN HÀNG');
        $this->get('/api/orders/9999/print')->assertNotFound();
    }
    public function test_only_admin_can_print_other_customers_orders_via_admin_route(): void
    {
        $u=$this->account();$order=$this->purchase($u);
        $this->actingAs($u,'sanctum')->get("/api/admin/orders/$order->id/print")->assertForbidden();
        $this->actingAs($this->administrator(),'sanctum')->get("/api/admin/orders/$order->id/print")->assertOk()->assertSee($order->maDH);
        $this->get("/api/orders/$order->id/print")->assertNotFound();
    }
    public function test_print_uses_stored_order_prices_and_amounts_not_current_catalog_or_query(): void
    {
        $u=$this->account();$order=$this->purchase($u,'completed');$order->update(['discount_amount'=>500000,'final_amount'=>19500000]);
        $product=$order->details->first()->product;$product->update(['price'=>99000000,'quantity'=>0,'status'=>'inactive']);
        $response=$this->actingAs($u,'sanctum')->get("/api/orders/$order->id/print?final_amount=1&discount_amount=99999999")->assertOk();
        $response->assertSee('10.000.000,00 đ')->assertSee('20.000.000,00 đ')->assertSee('500.000,00 đ')->assertSee('19.500.000,00 đ')->assertDontSee('99.000.000,00 đ');
        $this->assertSame('19500000.00',$order->fresh()->final_amount);$this->assertSame(0,$product->fresh()->quantity);
    }
    public function test_print_escapes_customer_product_settings_and_notes(): void
    {
        $u=$this->account();$order=$this->purchase($u);$attack='<script>alert("bad")</script>';
        $order->update(['recipient_name'=>$attack,'shipping_address'=>$attack,'note'=>$attack]);
        $order->details->first()->product->update(['tenSP'=>$attack]);
        DB::table('settings')->insert(['key'=>'store_name','value'=>$attack]);
        $response=$this->actingAs($u,'sanctum')->get("/api/orders/$order->id/print")->assertOk();
        $response->assertDontSee($attack,false)->assertSee(e($attack),false);
        $this->assertSame(1,substr_count($response->getContent(),'<script nonce='));
        $response->assertHeader('X-Content-Type-Options','nosniff')->assertHeader('Referrer-Policy','no-referrer');
        $this->assertStringContainsString("default-src 'none'",$response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('no-store',$response->headers->get('Cache-Control'));
    }
    public function test_only_public_store_contact_and_order_fields_are_printed(): void
    {
        $u=$this->account();$o=$this->purchase($u);DB::table('settings')->insert([
            ['key'=>'store_name','value'=>'TECH DEMO'],['key'=>'store_phone','value'=>'0123456789'],
            ['key'=>'store_email','value'=>'shop@example.test'],['key'=>'store_address','value'=>'Địa chỉ cửa hàng'],
            ['key'=>'bank_info','value'=>'SECRET-BANK-INFO'],['key'=>'mail_password','value'=>'SECRET-MAIL-PASSWORD'],
        ]);
        $this->actingAs($u,'sanctum')->get("/api/orders/$o->id/print")->assertOk()->assertSee('TECH DEMO')->assertSee('shop@example.test')
            ->assertDontSee('SECRET-BANK-INFO')->assertDontSee('SECRET-MAIL-PASSWORD')->assertDontSee($u->email)->assertDontSee($u->password);
    }
    public function test_cancelled_order_and_payment_are_unambiguous_and_render_is_read_only(): void
    {
        $u=$this->account();$o=$this->purchase($u,'cancelled',true,'pending');$before=$o->fresh()->getAttributes();$payment=Payment::first()->getAttributes();$stock=Product::first()->quantity;
        $this->actingAs($u,'sanctum')->get("/api/orders/$o->id/print")->assertOk()->assertSee('ĐƠN ĐÃ HỦY')->assertSee('Chưa xác nhận thanh toán')->assertSee('không thay thế hóa đơn điện tử');
        $this->assertSame($before,$o->fresh()->getAttributes());$this->assertSame($payment,Payment::first()->getAttributes());$this->assertSame($stock,Product::first()->quantity);
        $this->assertDatabaseCount('order_history',0);$this->assertDatabaseCount('store_notifications',0);
    }
    public function test_deleted_products_missing_payment_and_empty_settings_have_safe_fallbacks(): void
    {
        $u=$this->account();$o=$this->purchase($u,'pending',false);Product::first()->delete();Payment::first()->delete();
        $this->actingAs($u,'sanctum')->get("/api/orders/$o->id/print")->assertOk()->assertSee('không còn trong danh mục')->assertSee('TECHSTORE')->assertSee('Chưa có thông tin')->assertSee('10.000.000,00 đ');
    }
    public function test_print_includes_delivery_fields_vietnam_timestamps_and_print_layout(): void
    {
        $u=$this->account();$o=$this->purchase($u,'completed',false);$o->update(['carrier_name'=>'GHN','tracking_number'=>'GHN-PRINT-001','estimated_delivery_date'=>'2026-11-01','delivered_at'=>'2026-10-27 05:00:00']);
        $response=$this->actingAs($u,'sanctum')->get("/api/orders/$o->id/print")->assertOk();
        $response->assertSee('GHN-PRINT-001')->assertSee('01/11/2026')->assertSee('27/10/2026 12:00')->assertSee('@page',false)->assertSee('@media print',false)->assertSee('window.print()',false);
        $this->assertStringContainsString('text/html',$response->headers->get('Content-Type'));
    }
}
