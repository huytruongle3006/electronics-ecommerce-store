<?php
namespace App\Services;

use App\Models\StoreNotification;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\Warranty;
use App\Models\WarrantyServiceRequest;

class StoreNotifier
{
    public static function supportMessage(\App\Models\SupportThread $thread, \App\Models\SupportMessage $message): void
    {
        $body='Yêu cầu #'.$thread->id.': '.$thread->subject.'. '.mb_substr($message->body,0,160);
        if($message->sender_role==='admin'){
            self::send($thread->user_id,"support-message:{$message->id}:customer",'Cửa hàng đã phản hồi hỗ trợ',$body,'support',$thread->id);
        }else{
            \App\Models\User::where('status','active')->where('id','!=',$message->sender_id)
                ->whereHas('roles',fn($q)=>$q->where('maRole','ADMIN'))->select('id')->chunkById(100,function($admins)use($thread,$message,$body){
                    foreach($admins as $admin)self::send($admin->id,"support-message:{$message->id}:admin:{$admin->id}",'Tin nhắn hỗ trợ từ khách',$body,'support',$thread->id);
                });
        }
    }

    public static function supportStatus(\App\Models\SupportThread $thread): void
    {
        $labels=['open'=>'Chờ xử lý','in_progress'=>'Đang xử lý','resolved'=>'Đã giải quyết'];
        self::send($thread->user_id,"support-status:{$thread->id}:{$thread->version}",'Cập nhật yêu cầu hỗ trợ',
            'Yêu cầu #'.$thread->id.' — '.$thread->subject.': '.$labels[$thread->status].'.','support',$thread->id);
    }

    // Called inside the business transaction: a failed update cannot leave a notification.
    private static function send(int $userId, string $event, string $title, string $body, string $type, int $target): void
    {
        StoreNotification::firstOrCreate(['event_key' => $event], [
            'user_id' => $userId, 'title' => $title, 'body' => $body,
            'target_type' => $type, 'target_id' => $target, 'created_at' => now(),
        ]);
    }

    public static function order(Order $order): void
    {
        $labels = ['confirmed' => 'đã được xác nhận', 'shipping' => 'đang được giao', 'completed' => 'đã hoàn tất', 'cancelled' => 'đã bị hủy'];
        self::send($order->user_id, "order:{$order->id}:{$order->status}", 'Cập nhật đơn hàng',
            "Đơn {$order->maDH} ".($labels[$order->status] ?? 'đã được cập nhật').'.'
                .($order->status === 'shipping' ? self::deliveryText($order) : '')
                .($order->status === 'completed' && $order->delivered_at ? ' Ghi nhận giao thành công lúc '.$order->delivered_at->copy()->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i').' (giờ Việt Nam).' : ''), 'order', $order->id);
    }

    private static function deliveryText(Order $order): string
    {
        return ($order->carrier_name ? ' Đơn vị: '.$order->carrier_name.'.' : '')
            .($order->tracking_number ? ' Mã vận đơn: '.$order->tracking_number.'.' : '')
            .($order->estimated_delivery_date ? ' Dự kiến giao: '.$order->estimated_delivery_date->format('d/m/Y').'.' : '');
    }

    public static function delivery(Order $order): void
    {
        self::send($order->user_id, "delivery:{$order->id}:{$order->delivery_version}", 'Cập nhật vận chuyển',
            "Thông tin giao hàng đơn {$order->maDH} đã được cập nhật.".self::deliveryText($order), 'order', $order->id);
    }

    public static function returned(ReturnRequest $return, Order $order): void
    {
        $labels = ['approved' => 'đã được chấp thuận', 'rejected' => 'đã bị từ chối', 'received' => 'đã được cửa hàng ghi nhận nhận lại hàng', 'refunded' => 'đã được cửa hàng xác nhận hoàn tiền'];
        self::send($order->user_id, "return:{$return->id}:{$return->status}", 'Cập nhật đổi trả / hoàn tiền',
            "Yêu cầu của đơn {$order->maDH} ".($labels[$return->status] ?? 'đã được cập nhật').'. Mở đơn để xem chi tiết.', 'order', $order->id);
    }

    public static function warranty(Warranty $warranty, int $eventId, string $action): void
    {
        $owner = $warranty->order?->user_id;
        if (!$owner) return; // Legacy standalone warranty has no authenticated owner.
        $label = ['created' => 'đã được cấp bảo hành điện tử', 'valid' => 'đã được cập nhật trạng thái bảo hành còn hiệu lực', 'expired' => 'đã được cập nhật trạng thái bảo hành hết hiệu lực'][$action] ?? 'đã được cập nhật bảo hành';
        self::send($owner, "warranty-event:$eventId", 'Cập nhật bảo hành', "Thiết bị {$warranty->serial_number} $label. Hiệu lực thực tế còn phụ thuộc ngày hết hạn và tình trạng đơn hàng.", 'warranty', $warranty->id);
    }

    public static function service(WarrantyServiceRequest $service): void
    {
        $labels = ['accepted' => 'đã được tiếp nhận', 'rejected' => 'đã bị từ chối', 'repairing' => 'đang được sửa chữa', 'ready' => 'đã xử lý xong, sẵn sàng trả thiết bị', 'closed' => 'đã kết thúc'];
        self::send($service->user_id, "warranty-service:{$service->id}:{$service->status}", 'Cập nhật xử lý bảo hành',
            "Hồ sơ bảo hành thiết bị {$service->warranty->serial_number} ".($labels[$service->status] ?? 'đã được cập nhật').'.', 'warranty', $service->warranty_id);
    }
}
