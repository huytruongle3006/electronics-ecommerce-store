<?php
namespace Tests\Support;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
abstract class OrderTestCase extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('products', function (Blueprint $table) {
            $table->id(); $table->string('maSP'); $table->string('tenSP');
            $table->decimal('price', 15, 2); $table->integer('quantity');
            $table->integer('warranty_months')->default(12); $table->string('status')->default('active'); $table->timestamps();
        });
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id(); $table->string('maVoucher'); $table->integer('quantity');
            $table->string('status')->default('active');
        });
        Schema::create('orders', function (Blueprint $table) {
            $table->id(); $table->string('maDH'); $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('voucher_id')->nullable();
            $table->string('recipient_name'); $table->string('recipient_phone');
            $table->text('shipping_address'); $table->decimal('total_amount', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0); $table->decimal('final_amount', 15, 2);
            $table->text('note')->nullable(); $table->string('status'); $table->timestamps();
        });
        Schema::create('order_details', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('order_id'); $table->unsignedBigInteger('product_id');
            $table->integer('quantity'); $table->decimal('price', 15, 2); $table->decimal('total_line', 15, 2);
        });
        (require __DIR__.'/../../database/migrations/2026_10_27_100000_add_delivery_fields_to_orders.php')->up();
        Schema::create('order_history', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('order_id'); $table->string('status_changed');
            $table->unsignedBigInteger('changed_by'); $table->string('note', 255)->nullable(); $table->timestamp('created_at')->nullable();
        });
        Schema::create('warranties', function (Blueprint $table) {
            $table->id(); $table->string('maBH', 20); $table->string('serial_number', 100)->unique();
            $table->unsignedBigInteger('product_id'); $table->unsignedBigInteger('order_id')->nullable();
            $table->string('customer_name'); $table->string('customer_phone'); $table->date('start_date'); $table->date('end_date'); $table->string('status');
        });
        Schema::create('payments', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('order_id'); $table->string('payment_method');
            $table->string('transaction_code')->nullable(); $table->decimal('amount', 15, 2);
            $table->string('payment_status'); $table->timestamp('paid_at')->nullable();
        });
    }

    protected function purchase(User $user, string $status = 'pending', bool $withVoucher = true, string $paymentStatus = 'pending'): Order
    {
        $product = Product::create(['maSP' => 'SP' . Product::count(), 'tenSP' => 'Laptop', 'price' => 10000000, 'quantity' => 5, 'status' => 'inactive']);
        $voucher = $withVoucher ? Voucher::create(['maVoucher' => 'SALE' . Voucher::count(), 'quantity' => 4, 'status' => 'inactive']) : null;
        $order = Order::create([
            'maDH' => 'DH' . Order::count(), 'user_id' => $user->id, 'voucher_id' => $voucher?->id,
            'recipient_name' => 'Khách hàng', 'recipient_phone' => '0912345678', 'shipping_address' => 'Địa chỉ',
            'total_amount' => 20000000, 'discount_amount' => 0, 'final_amount' => 20000000, 'status' => $status,
        ]);
        OrderDetail::create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 2, 'price' => 10000000, 'total_line' => 20000000]);
        Payment::create(['order_id' => $order->id, 'payment_method' => $paymentStatus === 'paid' ? 'bank_transfer' : 'cod', 'amount' => 20000000, 'payment_status' => $paymentStatus]);
        return $order;
    }

    protected function administrator(): User
    {
        $user = $this->account('admin@example.test');
        $role = DB::table('roles')->insertGetId(['maRole' => 'ADMIN', 'tenRole' => 'Quản trị viên']);
        DB::table('users_roles')->insert(['user_id' => $user->id, 'role_id' => $role]);
        return $user;
    }

}
