<?php

namespace Tests\Feature;

use App\Models\ImportDetail;
use App\Models\ImportReceipt;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\AccountTestCase;

class InventoryManagementTest extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id(); $table->string('maNCC', 20); $table->string('tenNCC', 100);
            $table->string('phone', 20)->nullable(); $table->string('email', 100)->nullable(); $table->text('address')->nullable();
        });
        Schema::create('products', function (Blueprint $table) {
            $table->id(); $table->string('maSP'); $table->string('tenSP'); $table->unsignedBigInteger('supplier_id');
            $table->unsignedBigInteger('category_id')->nullable(); $table->integer('quantity'); $table->decimal('price', 15, 2);
            $table->integer('warranty_months')->default(12); $table->text('description')->nullable(); $table->text('specifications')->nullable();
            $table->string('status')->default('active'); $table->timestamps();
        });
        Schema::create('import_receipts', function (Blueprint $table) {
            $table->id(); $table->string('maPN', 20); $table->unsignedBigInteger('supplier_id'); $table->unsignedBigInteger('created_by');
            $table->decimal('total_amount', 15, 2); $table->text('note')->nullable(); $table->timestamp('created_at')->nullable();
        });
        Schema::create('import_details', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('import_receipt_id'); $table->unsignedBigInteger('product_id');
            $table->integer('quantity'); $table->decimal('import_price', 15, 2); $table->decimal('total_line', 15, 2);
        });
    }

    private function admin(): User
    {
        $user = $this->account('admin@example.test');
        $role = DB::table('roles')->insertGetId(['maRole' => 'ADMIN', 'tenRole' => 'Quản trị viên']);
        DB::table('users_roles')->insert(['user_id' => $user->id, 'role_id' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    private function supplier(): Supplier
    {
        return Supplier::create(['maNCC' => 'NCC' . Supplier::count(), 'tenNCC' => 'Nhà cung cấp']);
    }

    private function product(Supplier $supplier, int $quantity = 3): Product
    {
        return Product::create(['maSP' => 'SP' . Product::count(), 'tenSP' => 'Laptop', 'supplier_id' => $supplier->id, 'quantity' => $quantity, 'price' => 9999, 'status' => 'inactive']);
    }

    private function payload(Supplier $supplier, Product $product): array
    {
        return ['request_id' => (string) Str::uuid(), 'supplier_id' => $supplier->id, 'note' => 'Nhập đợt 1', 'items' => [['product_id' => $product->id, 'quantity' => 3, 'import_price' => '1200.10']]];
    }

    public function test_inventory_requires_admin_role(): void
    {
        $this->getJson('/api/admin/inventory/summary')->assertUnauthorized();
        $this->actingAs($this->account(), 'sanctum');
        foreach (['/api/admin/suppliers', '/api/admin/inventory/summary', '/api/admin/inventory/products', '/api/admin/import-receipts'] as $url) $this->getJson($url)->assertForbidden();
        $this->postJson('/api/admin/import-receipts', [])->assertForbidden();
        $this->postJson('/api/admin/suppliers', [])->assertForbidden();
    }

    public function test_supplier_creation_update_validation_and_duplicate_code(): void
    {
        $this->admin();
        $data = ['maNCC' => 'ASUS_VN', 'tenNCC' => 'Asus Việt Nam', 'phone' => '0281234567', 'email' => 'contact@example.test', 'address' => 'HCM'];
        $response = $this->postJson('/api/admin/suppliers', $data)->assertCreated();
        $id = $response->json('data.id');
        $this->postJson('/api/admin/suppliers', $data)->assertUnprocessable()->assertJsonValidationErrors('maNCC');
        $this->putJson("/api/admin/suppliers/{$id}", array_merge($data, ['tenNCC' => 'Tên mới']))->assertOk()->assertJsonPath('data.tenNCC', 'Tên mới');
        $this->postJson('/api/admin/suppliers', ['maNCC' => 'BAD CODE', 'tenNCC' => ' ', 'email' => 'bad'])->assertUnprocessable()->assertJsonValidationErrors(['maNCC', 'tenNCC', 'email']);
        $this->getJson('/api/admin/suppliers')->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/admin/suppliers/{$id}")->assertStatus(405);
    }

    public function test_receipt_computes_money_and_restores_stock_without_changing_sale_price_or_visibility(): void
    {
        $admin = $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier); $second = $this->product($supplier, 0);
        $data = $this->payload($supplier, $product);
        $data['items'][] = ['product_id' => $second->id, 'quantity' => 2, 'import_price' => '2.55'];
        $data['total_amount'] = 1; $data['created_by'] = 999;
        $response = $this->postJson('/api/admin/import-receipts', $data)->assertCreated()->assertJsonPath('data.total_amount', '3605.40')->assertJsonPath('data.created_by', $admin->id);
        $this->assertSame(6, $product->fresh()->quantity);
        $this->assertSame(2, $second->fresh()->quantity);
        $this->assertSame('9999.00', $product->fresh()->price);
        $this->assertSame('inactive', $product->fresh()->status);
        $this->assertSame(20, strlen($response->json('data.maPN')));
        $this->assertDatabaseHas('import_details', ['product_id' => $product->id, 'total_line' => 3600.30]);
    }

    public function test_receipt_retry_is_idempotent_and_changed_payload_conflicts(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier); $data = $this->payload($supplier, $product);
        $id = $this->postJson('/api/admin/import-receipts', $data)->assertCreated()->json('data.id');
        $this->postJson('/api/admin/import-receipts', $data)->assertOk()->assertJsonPath('data.id', $id);
        $changed = $data; $changed['items'][0]['quantity'] = 4;
        $this->postJson('/api/admin/import-receipts', $changed)->assertStatus(409);
        $this->assertSame(1, ImportReceipt::count()); $this->assertSame(1, ImportDetail::count()); $this->assertSame(6, $product->fresh()->quantity);
    }

    public function test_new_request_can_create_a_second_receipt(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier); $data = $this->payload($supplier, $product);
        $this->postJson('/api/admin/import-receipts', $data)->assertCreated();
        $data['request_id'] = (string) Str::uuid();
        $this->postJson('/api/admin/import-receipts', $data)->assertCreated();
        $this->assertSame(2, ImportReceipt::count()); $this->assertSame(9, $product->fresh()->quantity);
    }

    public function test_invalid_quantities_prices_duplicate_products_and_missing_supplier_are_rejected(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier); $data = $this->payload($supplier, $product);
        foreach ([0, -1, 1.5, 1000001] as $quantity) {
            $bad = $data; $bad['items'][0]['quantity'] = $quantity;
            $this->postJson('/api/admin/import-receipts', $bad)->assertUnprocessable()->assertJsonValidationErrors('items.0.quantity');
        }
        foreach (['-1', '1.001', '1000000000'] as $price) {
            $bad = $data; $bad['items'][0]['import_price'] = $price;
            $this->postJson('/api/admin/import-receipts', $bad)->assertUnprocessable()->assertJsonValidationErrors('items.0.import_price');
        }
        $bad = $data; $bad['items'][] = $bad['items'][0];
        $this->postJson('/api/admin/import-receipts', $bad)->assertUnprocessable();
        $bad = $data; $bad['supplier_id'] = 999;
        $this->postJson('/api/admin/import-receipts', $bad)->assertUnprocessable()->assertJsonValidationErrors('supplier_id');
        $this->assertSame(0, ImportReceipt::count()); $this->assertSame(3, $product->fresh()->quantity);
    }

    public function test_overflow_of_total_value_and_stock_is_rejected(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier); $data = $this->payload($supplier, $product);
        $data['items'][0]['quantity'] = 1000000; $data['items'][0]['import_price'] = '999999999.99';
        $this->postJson('/api/admin/import-receipts', $data)->assertUnprocessable();
        $product->update(['quantity' => 2147483647]);
        $this->postJson('/api/admin/import-receipts', $this->payload($supplier, $product))->assertUnprocessable();
        $this->assertSame(0, ImportReceipt::count()); $this->assertSame(2147483647, $product->fresh()->quantity);
    }

    public function test_failure_rolls_back_receipt_lines_and_stock(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier);
        Event::listen('eloquent.created: ' . ImportDetail::class, function () { throw new \RuntimeException('Simulated import failure'); });
        $this->postJson('/api/admin/import-receipts', $this->payload($supplier, $product))->assertStatus(500);
        $this->assertSame(0, ImportReceipt::count()); $this->assertSame(0, ImportDetail::count()); $this->assertSame(3, $product->fresh()->quantity);
    }

    public function test_stock_filters_summary_and_search(): void
    {
        $this->admin(); $supplier = $this->supplier(); $this->product($supplier, 0); $low = $this->product($supplier, 3); $this->product($supplier, 20);
        $this->getJson('/api/admin/inventory/summary')->assertOk()->assertJsonPath('data.total_units', 23)->assertJsonPath('data.low_stock_count', 1)->assertJsonPath('data.out_of_stock_count', 1);
        $this->getJson('/api/admin/inventory/products?stock=low')->assertOk()->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.id', $low->id);
        $this->getJson('/api/admin/inventory/products?stock=out')->assertOk()->assertJsonCount(1, 'data.data');
        $this->getJson('/api/admin/inventory/products?search=' . $low->maSP)->assertOk()->assertJsonCount(1, 'data.data');
    }

    public function test_receipt_filters_detail_and_immutability(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier);
        $id = $this->postJson('/api/admin/import-receipts', $this->payload($supplier, $product))->assertCreated()->json('data.id');
        $this->getJson('/api/admin/import-receipts?to=' . now()->format('Y-m-d'))->assertOk()->assertJsonPath('data.total', 1);
        $this->getJson('/api/admin/import-receipts?from=2099-01-01')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/admin/import-receipts?from=2026-10-19&to=2026-01-01')->assertUnprocessable();
        $this->getJson("/api/admin/import-receipts/{$id}")->assertOk()->assertJsonPath('data.details.0.import_price', '1200.10')->assertJsonPath('data.supplier.id', $supplier->id);
        $this->putJson("/api/admin/import-receipts/{$id}", [])->assertStatus(405);
        $this->deleteJson("/api/admin/import-receipts/{$id}")->assertStatus(405);
    }

    public function test_editing_product_cannot_overwrite_stock_from_an_old_form(): void
    {
        $this->admin(); $supplier = $this->supplier(); $product = $this->product($supplier);
        $this->putJson("/api/admin/products/{$product->id}", ['tenSP' => 'Tên mới', 'price' => 5000, 'quantity' => 999, 'warranty_months' => 12, 'status' => 'active'])->assertOk();
        $this->assertSame(3, $product->fresh()->quantity); $this->assertSame('Tên mới', $product->fresh()->tenSP);
    }
}
