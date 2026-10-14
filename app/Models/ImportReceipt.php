<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportReceipt extends Model
{
    use HasFactory;

    protected $table = 'import_receipts';
    public $timestamps = false;

    protected $fillable = [
        'maPN',
        'supplier_id',
        'created_by',
        'total_amount',
        'note',
        'created_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function details()
    {
        return $this->hasMany(ImportDetail::class, 'import_receipt_id');
    }
}