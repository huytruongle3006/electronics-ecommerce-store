<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SupportThread extends Model
{
    protected $guarded=[];
    protected $attributes=['status'=>'open','version'=>1,'customer_read_id'=>0,'admin_read_id'=>0];
    protected $hidden=['fingerprint','client_id'];
    protected $casts=['user_id'=>'integer','order_id'=>'integer','version'=>'integer','customer_read_id'=>'integer','admin_read_id'=>'integer','last_message_at'=>'datetime'];
    public function messages(){return $this->hasMany(SupportMessage::class,'thread_id');}
    public function customer(){return $this->belongsTo(User::class,'user_id');}
    public function order(){return $this->belongsTo(Order::class);}
}
