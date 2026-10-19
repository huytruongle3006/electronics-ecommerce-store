<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarrantyServiceEvent extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];
    protected $casts = ['created_at' => 'datetime'];
}
