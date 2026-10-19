<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\Warranty;
use App\Models\WarrantyServiceRequest;

class WarrantyPolicy
{
    public const OPEN_STATUSES = ['requested', 'accepted', 'repairing', 'ready'];

    public function hasReturn(Order $order): bool
    {
        return ReturnRequest::where('order_id', $order->id)->where('status', '!=', 'rejected')->exists();
    }

    public function hasOpenService(Order $order): bool
    {
        return WarrantyServiceRequest::whereIn('status', self::OPEN_STATUSES)
            ->whereHas('warranty', fn ($q) => $q->where('order_id', $order->id))->exists();
    }

    public function effectiveStatus(Warranty $warranty): string
    {
        $order = $warranty->order;
        if ($order && ($order->status === 'cancelled' || $order->payment?->payment_status === 'refunded' || $this->hasReturn($order))) return 'invalid';
        if ($warranty->serviceRequests()->whereIn('status', self::OPEN_STATUSES)->exists()) return 'in_service';
        $today = now(config('warranty.timezone'))->toDateString();
        if ($warranty->status === 'expired' || $warranty->end_date->toDateString() < $today) return 'expired';
        if ($warranty->start_date->toDateString() > $today) return 'not_started';
        if ($warranty->status === 'claimed') return 'claimed';
        return 'valid';
    }
}
