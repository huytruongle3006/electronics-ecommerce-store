<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreNotification extends Model
{
    public $timestamps = false;
    protected $guarded = [];
    protected $hidden = ['user_id', 'event_key'];
    protected function casts(): array { return ['target_id' => 'integer', 'read_at' => 'datetime', 'created_at' => 'datetime']; }
}
