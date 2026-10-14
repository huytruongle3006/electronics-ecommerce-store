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
            'serial_number' => 'required|string',
        ]);

        $warranty = Warranty::with(['product', 'order'])
            ->where('serial_number', $request->serial_number)
            ->first();

        if (!$warranty) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thông tin bảo hành với số Serial này.'
            ], 404);
        }

        $isExpired = $warranty->end_date < now();

        return response()->json([
            'success' => true,
            'data' => [
                'serial_number' => $warranty->serial_number,
                'product_name' => $warranty->product->tenSP ?? null,
                'customer_name' => $warranty->customer_name,
                'start_date' => $warranty->start_date,
                'end_date' => $warranty->end_date,
                'status' => $warranty->status,
                'is_expired' => $isExpired,
            ]
        ], 200);
    }
}