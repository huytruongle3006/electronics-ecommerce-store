<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderCancellation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderCancellationController extends Controller
{
    public function cancel(Request $request, int $id, OrderCancellation $cancellation)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:200', 'regex:/\S/u'],
        ], [
            'reason.required' => 'Vui lòng nhập lý do hủy đơn.',
            'reason.max' => 'Lý do hủy tối đa 200 ký tự.',
            'reason.regex' => 'Lý do hủy không được chỉ có khoảng trắng.',
        ]);

        return DB::transaction(function () use ($request, $id, $data, $cancellation) {
            $order = Order::where('user_id', $request->user()->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'cancelled') {
                return $this->result($order, 'Đơn hàng này đã được hủy trước đó.');
            }
            if ($order->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ được hủy đơn đang chờ xác nhận. Vui lòng tải lại đơn hàng hoặc liên hệ cửa hàng.',
                ], 409);
            }

            $cancellation->cancelLocked($order, $request->user(), 'Khách hàng hủy đơn: ' . trim($data['reason']));
            return $this->result($order, 'Hủy đơn hàng thành công.');
        }, 3);
    }

    private function result(Order $order, string $message)
    {
        $order->load(['details.product', 'payment', 'histories', 'voucher']);
        $refundRequired = $order->payment?->payment_status === 'paid';
        return response()->json([
            'success' => true,
            'message' => $refundRequired ? $message . ' Đơn đã thanh toán; vui lòng liên hệ cửa hàng để xử lý hoàn tiền.' : $message,
            'refund_required' => $refundRequired,
            'data' => $order,
        ]);
    }
}
