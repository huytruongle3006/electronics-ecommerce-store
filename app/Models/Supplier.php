<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $table = 'suppliers';
    public $timestamps = false;

    protected $fillable = [
        'maNCC',
        'tenNCC',
        'phone',
        'address',
        'email',
    ];

    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id');
    }

    public function importReceipts()
    {
        return $this->hasMany(ImportReceipt::class, 'supplier_id');
    }
}