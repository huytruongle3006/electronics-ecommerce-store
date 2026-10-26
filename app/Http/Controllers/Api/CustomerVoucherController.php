<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Order, Voucher};
use App\Services\CustomerVoucher;
use Illuminate\Http\Request;

class CustomerVoucherController extends Controller
{
    public function index(Request $request, CustomerVoucher $service)
    {
        $request->validate(['page' => 'sometimes|integer|min:1|max:100000']);
        // Browsing codes remains available with an empty/invalid cart.
        $cartError = null; $total = 0;
        try { $total = $service->cart($request->user())['total']; }
        catch (\Illuminate\Validation\ValidationException $e) { $cartError = $e->validator->errors()->first(); }
        $rows = Voucher::where('status', 'active')->where('quantity', '>', 0)
            ->where(fn ($q) => $q->whereNull('expired_at')->orWhere('expired_at', '>', now()))
            ->orderBy('expired_at')->orderBy('id')->paginate(12);
        $counts = Order::where('user_id', $request->user()->id)->whereIn('voucher_id', $rows->pluck('id'))
            ->where('status', '!=', 'cancelled')->selectRaw('voucher_id, COUNT(*) AS uses')->groupBy('voucher_id')->pluck('uses', 'voucher_id');
        $rows->getCollection()->transform(function ($v) use ($service, $total, $counts, $cartError) {
            $row = $service->describe($v, $total, (int) ($counts[$v->id] ?? 0));
            if ($cartError) { $row['eligible'] = false; $row['reason'] = $cartError; $row['estimated_discount'] = '0.00'; }
            return $row;
        });
        return response()->json(['data' => $rows, 'subtotal' => $service->money($total), 'cart_error' => $cartError]);
    }

    public function preview(Request $request, CustomerVoucher $service)
    {
        $data = $request->validate(['code' => 'required|string|max:20|regex:/\S/u']);
        $quote = $service->quote($request->user(), $service->cart($request->user()), $data['code']);
        unset($quote['_model']);
        return response()->json(['success' => true, 'data' => $quote]);
    }
}
