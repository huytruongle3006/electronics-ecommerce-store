<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    // Đặt hàng (Checkout)
    public function checkout(Request $request)
{
    $request->validate([
        'address_id' => 'nullable|integer|min:1',
        'recipient_name'  => 'required_without:address_id|nullable|string|max:100',
        'recipient_phone' => 'required_without:address_id|nullable|string|max:20',
        'shipping_address'=> 'required_without:address_id|nullable|string|max:1000',
        'payment_method'  => 'required|in:cod,bank_transfer,vnpay,momo',
        'voucher_code'    => 'nullable|string|max:20',
        'voucher_quote'   => 'nullable|string|size:64',
        'note'            => 'nullable|string',
    ]);

    $user = $request->user();
    return DB::transaction(function () use ($request, $user) {
        \App\Models\User::whereKey($user->id)->lockForUpdate()->firstOrFail();
        $pricing = app(\App\Services\CustomerVoucher::class);
        $snapshot = $pricing->cart($user, true);
        $cart = $snapshot['cart']; $cartItems = $snapshot['items'];
        // Copy recipient fields into the order, never store a live address reference.
        $shipping = $request->only(['recipient_name', 'recipient_phone', 'shipping_address']);
        if ($request->filled('address_id')) {
            $saved = \App\Models\ShippingAddress::where('user_id', $user->id)
                ->where('id', $request->integer('address_id'))->lockForUpdate()->first();
            abort_unless($saved, 422, 'Địa chỉ đã bị xóa hoặc không thuộc tài khoản của bạn. Vui lòng chọn lại.');
            $shipping = $saved->only(['recipient_name', 'recipient_phone', 'shipping_address']);
        }
        $totalAmount = $pricing->money($snapshot['total']);

        // 2. Xử lý Voucher (nếu có)
        $discountAmount = '0.00';
        $voucherId = null;
        $finalAmount = $totalAmount;

        if ($request->filled('voucher_code')) {
            $quote = $pricing->quote($user, $snapshot, $request->voucher_code, true);
            if (!$request->filled('voucher_quote') || !hash_equals($quote['quote_token'], $request->voucher_quote)) {
                return response()->json(['success' => false, 'message' => 'Giỏ hàng hoặc điều kiện mã đã thay đổi. Vui lòng áp dụng mã lại để xác nhận tổng tiền.'], 409);
            }
            $discountAmount = $quote['discount_amount']; $finalAmount = $quote['final_amount'];
            $voucher = $quote['_model']; $voucherId = $voucher->id;
            $voucher->decrement('quantity');
        }

        // 3. Tạo Đơn hàng (Order)
        $order = Order::create([
            'maDH'             => 'DH' . date('YmdHis') . rand(10, 99),
            'user_id'          => $user->id,
            'voucher_id'       => $voucherId,
            'recipient_name'   => $shipping['recipient_name'],
            'recipient_phone'  => $shipping['recipient_phone'],
            'shipping_address' => $shipping['shipping_address'],
            'total_amount'     => $totalAmount,
            'discount_amount'  => $discountAmount,
            'final_amount'     => $finalAmount,
            'note'             => $request->note,
            'status'           => 'pending',
        ]);

        // 4. Tạo Order Details & Trừ tồn kho
        foreach ($cartItems as $item) {
            OrderDetail::create([
                'order_id'   => $order->id,
                'product_id' => $item->product_id,
                'price'      => $item->product->price,
                'quantity'   => $item->quantity,
                'total_line' => $pricing->money($item->quantity * $pricing->cents($item->product->price)),
            ]);

            $item->product->decrement('quantity', $item->quantity);
        }

        // 5. Ghi lịch sử trạng thái đơn
        OrderHistory::create([
            'order_id'       => $order->id,
            'status_changed' => 'pending',
            'changed_by'     => $user->id,
            'note'           => 'Khách hàng tạo đơn và chờ xác nhận',
        ]);

        // 6. Ghi nhận giao dịch Thanh toán (Payment)
        Payment::create([
            'order_id'         => $order->id,
            'payment_method'   => $request->payment_method,
            'transaction_code' => $request->payment_method === 'cod' ? null : ('TXN_' . time()),
            'amount'           => $finalAmount,
            'payment_status'   => $request->payment_method === 'cod' ? 'pending' : 'paid',
            'paid_at'          => $request->payment_method === 'cod' ? null : now(),
        ]);

        // 7. Làm rỗng giỏ hàng
        CartItem::where('cart_id', $cart->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đặt hàng thành công!',
            'data'    => $order->load(['details.product', 'payment', 'voucher'])
        ], 201);
    });
}
   

    // Danh sách đơn hàng của tôi
    public function myOrders(Request $request)
    {
        $orders = Order::with(['details.product', 'payment', 'histories'])
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ], 200);
    }

    // Xem chi tiết một đơn hàng
    public function show($id, Request $request)
    {
        $order = Order::with(['details.product', 'payment', 'histories', 'voucher'])
            ->where('user_id', $request->user()->id)
            ->where('id', $id)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ], 200);
    }
}
