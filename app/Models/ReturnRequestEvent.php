<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequestEvent extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];
    protected $casts = ['created_at' => 'datetime'];
}
