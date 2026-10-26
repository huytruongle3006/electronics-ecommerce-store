<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Order, OrderHistory};
use App\Services\StoreNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OrderDeliveryController extends Controller
{
    public function show(int $id)
    {
        return $this->result(Order::findOrFail($id), 'Thông tin giao hàng hiện tại.');
    }
    public function update(Request $request, int $id)
    {
        foreach (['carrier_name','tracking_number'] as $field) {
            if (is_string($request->input($field))) $request->merge([$field => trim($request->input($field))]);
        }
        $data = $request->validate([
            'carrier_name' => ['required','string','max:100','regex:/^[^\r\n<>]+$/u'],
            'tracking_number' => ['required','string','max:100','regex:/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/D'],
            'estimated_delivery_date' => ['required','date_format:Y-m-d'],
            'expected_version' => ['required','integer','min:0'],
        ], ['tracking_number.regex'=>'Mã vận đơn chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới hoặc gạch chéo.']);
        return DB::transaction(function () use ($request, $id, $data) {
            $order = Order::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless(in_array($order->status, ['confirmed','shipping'], true), 409, 'Chỉ cập nhật vận chuyển cho đơn đã xác nhận hoặc đang giao.');
            $same = $order->carrier_name === $data['carrier_name'] && $order->tracking_number === $data['tracking_number']
                && $order->estimated_delivery_date?->format('Y-m-d') === $data['estimated_delivery_date'];
            if ($same) return $this->result($order, 'Thông tin vận chuyển không đổi.');
            abort_unless((int) $order->delivery_version === (int) $data['expected_version'], 409, 'Đơn đã được cập nhật ở nơi khác. Tải lại đơn trước khi sửa.');
            if ($data['estimated_delivery_date'] < Carbon::now('Asia/Ho_Chi_Minh')->toDateString()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['estimated_delivery_date'=>'Ngày giao dự kiến mới phải từ hôm nay theo giờ Việt Nam.']);
            }
            $order->update([
                'carrier_name'=>$data['carrier_name'],'tracking_number'=>$data['tracking_number'],
                'estimated_delivery_date'=>$data['estimated_delivery_date'],'delivery_version'=>$order->delivery_version + 1,
            ]);
            OrderHistory::create(['order_id'=>$order->id,'status_changed'=>$order->status,'changed_by'=>$request->user()->id,
                'note'=>mb_substr('Cập nhật vận chuyển: '.$order->carrier_name.'; mã '.$order->tracking_number.'; dự kiến '.$order->estimated_delivery_date->format('d/m/Y').'.',0,255),'created_at'=>now()]);
            StoreNotifier::delivery($order);
            return $this->result($order, 'Đã lưu thông tin vận chuyển và thông báo cho khách hàng.');
        }, 3);
    }

    public function receive(Request $request, int $id)
    {
        $request->validate(['confirm_received'=>'required|accepted']);
        return DB::transaction(function () use ($request, $id) {
            $order = Order::where('user_id',$request->user()->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'completed' && $order->receipt_confirmed_at) return $this->result($order, 'Bạn đã xác nhận nhận hàng trước đó.');
            abort_unless($order->status === 'shipping', 409, 'Chỉ xác nhận nhận hàng khi đơn đang giao. Vui lòng tải lại đơn hàng.');
            $order->update(['status'=>'completed','delivered_at'=>now(),'receipt_confirmed_at'=>now()]);
            OrderHistory::create(['order_id'=>$order->id,'status_changed'=>'completed','changed_by'=>$request->user()->id,
                'note'=>'Khách hàng xác nhận đã nhận hàng.','created_at'=>now()]);
            StoreNotifier::order($order);
            return $this->result($order, 'Đã xác nhận nhận hàng. Đơn hàng đã hoàn tất.');
        }, 3);
    }

    private function result(Order $order, string $message)
    {
        return response()->json(['success'=>true,'message'=>$message,'data'=>$order->load(['details.product','payment','histories','voucher'])]);
    }
}
