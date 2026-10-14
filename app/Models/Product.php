<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';

    protected $fillable = [
        'maSP',
        'tenSP',
        'description',
        'specifications',
        'status',
        'img_url',
        'price',
        'quantity',
        'warranty_months',
        'supplier_id',
        'category_id',
    ];

    protected $casts = [
        'specifications' => 'array', // Tự động decode/encode JSON cấu hình thiết bị
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'warranty_months' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'product_id');
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class, 'product_id');
    }

    public function orderDetails()
    {
        return $this->hasMany(OrderDetail::class, 'product_id');
    }

    public function importDetails()
    {
        return $this->hasMany(ImportDetail::class, 'product_id');
    }

    public function warranties()
    {
        return $this->hasMany(Warranty::class, 'product_id');
    }
}