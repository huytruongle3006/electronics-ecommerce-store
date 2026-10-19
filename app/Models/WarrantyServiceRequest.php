<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarrantyServiceRequest extends Model
{
    protected $guarded = ['id'];
    public function warranty() { return $this->belongsTo(Warranty::class); }
    public function user() { return $this->belongsTo(User::class); }
    public function events() { return $this->hasMany(WarrantyServiceEvent::class)->orderBy('id'); }
}
