<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class CartMergeController extends Controller
{
    public function merge(Request $request)
    {
        $data = $request->validate(['batch_id' => 'required|uuid', 'items' => 'required|array|min:1|max:100',
            'items.*.product_id' => 'required|integer|min:1|distinct', 'items.*.quantity' => 'required|integer|between:1,999']);
        $lines = collect($data['items'])->map(fn ($item) => ['product_id' => (int) $item['product_id'], 'quantity' => (int) $item['quantity']])->sortBy('product_id')->values()->all();
        $fingerprint = hash('sha256', json_encode($lines));
        return DB::transaction(function () use ($request, $data, $lines, $fingerprint) {
            $userId = $request->user()->id;
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            $cart = Cart::firstOrCreate(['user_id' => $userId]);
            $receipt = DB::table('guest_cart_merges')->where('user_id', $userId)->where('batch_id', $data['batch_id'])->first();
            if ($receipt) {
                abort_unless(hash_equals($receipt->fingerprint, $fingerprint), 409, 'Giỏ khách đã thay đổi. Vui lòng tải lại trang.');
                $result = json_decode($receipt->result, true);
            } else {
                $result = ['added' => [], 'skipped' => [], 'retry_batch_id' => (string) \Illuminate\Support\Str::uuid()];
                foreach ($lines as $line) {
                    $product = Product::whereKey($line['product_id'])->lockForUpdate()->first();
                    $item = CartItem::where('cart_id', $cart->id)->where('product_id', $line['product_id'])->first();
                    $quantity = ($item?->quantity ?? 0) + $line['quantity'];
                    if (!$product || $product->status !== 'active' || $quantity > min(999, $product->quantity)) {
                        $result['skipped'][] = array_merge($line, ['reason' => 'Ngừng bán hoặc không đủ tồn kho cho tổng số lượng trong giỏ.']); continue;
                    }
                    if ($item) $item->update(['quantity' => $quantity]);
                    else CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => $quantity]);
                    $result['added'][] = $line;
                }
                DB::table('guest_cart_merges')->insert(['user_id' => $userId, 'batch_id' => $data['batch_id'], 'fingerprint' => $fingerprint, 'result' => json_encode($result), 'created_at' => now()]);
            }
            return response()->json(['success' => true, 'items' => CartItem::with('product')->where('cart_id', $cart->id)->get(), 'merge' => $result]);
        }, 3);
    }
}
