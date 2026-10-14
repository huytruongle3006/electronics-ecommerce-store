<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    use HasFactory;

    protected $table = 'vouchers';
    public $timestamps = false;

    protected $fillable = [
        'maVoucher',
        'discount_percent',
        'max_discount_amount',
        'min_order_amount',
        'quantity',
        'expired_at',
        'status',
    ];

    protected $casts = [
        'discount_percent' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'quantity' => 'integer',
        'expired_at' => 'datetime',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class, 'voucher_id');
    }
}