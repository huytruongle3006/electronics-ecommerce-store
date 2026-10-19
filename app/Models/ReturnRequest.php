<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['evidence_urls' => 'array', 'amount' => 'decimal:2', 'restocked' => 'boolean', 'received_at' => 'datetime', 'refunded_at' => 'datetime'];

    public function order() { return $this->belongsTo(Order::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function events() { return $this->hasMany(ReturnRequestEvent::class)->orderBy('id'); }
}
