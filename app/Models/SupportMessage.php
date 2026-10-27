<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    public $timestamps=false;
    protected $guarded=[];
    protected $hidden=['fingerprint','client_id'];
    protected $casts=['created_at'=>'datetime'];
    public function sender(){return $this->belongsTo(User::class,'sender_id');}
}
