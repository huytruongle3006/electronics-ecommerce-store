<?php
namespace App\Services;

use App\Models\StoreNotification;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\Warranty;
use App\Models\WarrantyServiceRequest;

class StoreNotifier
{
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
            "Đơn {$order->maDH} ".($labels[$order->status] ?? 'đã được cập nhật').'.', 'order', $order->id);
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
