<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';

    protected $fillable = [
        'maDH',
        'user_id',
        'voucher_id',
        'recipient_name',
        'recipient_phone',
        'shipping_address',
        'total_amount',
        'discount_amount',
        'final_amount',
        'note',
        'status',
        'carrier_name', 'tracking_number', 'estimated_delivery_date',
        'dispatched_at', 'delivered_at', 'receipt_confirmed_at', 'delivery_version',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'estimated_delivery_date' => 'date:Y-m-d',
        'dispatched_at' => 'datetime', 'delivered_at' => 'datetime', 'receipt_confirmed_at' => 'datetime',
        'delivery_version' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeWithoutRefunds($query)
    {
        return $query->whereDoesntHave('payment', fn ($payment) => $payment->where('payment_status', 'refunded'));
    }

    public function completedAt()
    {
        if ($this->delivered_at) return $this->delivered_at;
        $date = $this->histories()->where('status_changed', 'completed')
            ->where(fn ($history) => $history->whereNull('note')->orWhere('note', 'not like', 'Xác nhận đã thu COD.%'))
            ->oldest('created_at')->value('created_at') ?? $this->updated_at;
        return \Illuminate\Support\Carbon::parse($date);
    }

    public function voucher()
    {
        return $this->belongsTo(Voucher::class, 'voucher_id');
    }

    public function details()
    {
        return $this->hasMany(OrderDetail::class, 'order_id');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'order_id');
    }

    public function histories()
    {
        return $this->hasMany(OrderHistory::class, 'order_id');
    }

    public function warranties()
    {
        return $this->hasMany(Warranty::class, 'order_id');
    }
}
