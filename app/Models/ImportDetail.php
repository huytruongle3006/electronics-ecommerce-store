<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportDetail extends Model
{
    use HasFactory;

    protected $table = 'import_details';
    public $timestamps = false;

    protected $fillable = [
        'import_receipt_id',
        'product_id',
        'import_price',
        'quantity',
        'total_line',
    ];

    protected $casts = [
        'import_price' => 'decimal:2',
        'quantity' => 'integer',
        'total_line' => 'decimal:2',
    ];

    public function receipt()
    {
        return $this->belongsTo(ImportReceipt::class, 'import_receipt_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}