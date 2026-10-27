<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Order, Setting};
use Illuminate\Http\Request;

class OrderPrintController extends Controller
{
    public function customer(Request $request, int $id)
    {
        return $this->render(Order::where('user_id', $request->user()->id)->findOrFail($id));
    }

    public function admin(int $id)
    {
        return $this->render(Order::findOrFail($id));
    }

    private function render(Order $order)
    {
        $order->load(['details.product:id,maSP,tenSP','payment']);
        // Only public contact fields: never expose bank settings or arbitrary configuration.
        $store = Setting::whereIn('key', ['store_name','store_phone','store_email','store_address'])->pluck('value','key');
        $nonce = base64_encode(random_bytes(24));
        $policy = "default-src 'none'; style-src 'nonce-$nonce'; script-src 'nonce-$nonce'; base-uri 'none'; form-action 'none'; object-src 'none'";
        return response()->view('orders.print', compact('order','store','nonce','policy'), 200, [
            'Content-Type'=>'text/html; charset=UTF-8',
            'Cache-Control'=>'private, no-store, max-age=0',
            'Pragma'=>'no-cache', 'X-Content-Type-Options'=>'nosniff',
            'Referrer-Policy'=>'no-referrer', 'Content-Security-Policy'=>$policy."; frame-ancestors 'none'",
        ]);
    }
}
