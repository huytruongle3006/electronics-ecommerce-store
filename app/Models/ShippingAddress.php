<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingAddress extends Model
{
    protected $fillable = ['label', 'recipient_name', 'recipient_phone', 'shipping_address', 'is_default'];
    protected $hidden = ['user_id'];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }
}
