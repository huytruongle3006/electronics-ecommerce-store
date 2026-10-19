<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderHistory;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;

class OrderCancellation
{
    // Caller must hold the order row lock inside a database transaction.
    public function cancelLocked(Order $order, User $actor, string $note): Order
    {
        if ($order->status === 'cancelled') {
            return $order;
        }

        foreach ($order->details()->orderBy('product_id')->get() as $detail) {
            // Atomic increments also work for products hidden from the storefront.
            Product::whereKey($detail->product_id)->increment('quantity', $detail->quantity);
        }
        if ($order->voucher_id) {
            Voucher::whereKey($order->voucher_id)->increment('quantity');
        }

        $order->update(['status' => 'cancelled']);
        OrderHistory::create([
            'order_id' => $order->id,
            'status_changed' => 'cancelled',
            'changed_by' => $actor->id,
            'note' => $note,
            'created_at' => now(),
        ]);

        // A paid transaction stays paid until an actual refund is performed.
        return $order;
    }
}
