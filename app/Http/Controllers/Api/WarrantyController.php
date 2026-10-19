<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warranty;
use Illuminate\Http\Request;

class WarrantyController extends Controller
{
    // Tra cứu thông tin bảo hành bằng Serial Number
    public function check(Request $request)
    {
        $request->validate([
            'serial_number' => 'required|string|min:4|max:100|regex:/^[A-Za-z0-9_.-]+$/',
        ]);

        $warranty = Warranty::with(['product', 'order'])
            ->whereRaw('LOWER(serial_number) = ?', [strtolower(trim($request->serial_number))])
            ->first();

        if (!$warranty) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin bảo hành với số Serial này.'
            ], 404);
        }

        $effective = app(\App\Services\WarrantyPolicy::class)->effectiveStatus($warranty);

        return response()->json([
            'success' => true,
            'data' => [
                'serial_number' => $warranty->serial_number,
                'product_name' => $warranty->product->tenSP ?? null,
                'start_date' => $warranty->start_date->toDateString(),
                'end_date' => $warranty->end_date->toDateString(),
                'status' => $warranty->status,
                'effective_status' => $effective,
                'is_expired' => $effective === 'expired',
            ]
        ], 200);
    }
}
