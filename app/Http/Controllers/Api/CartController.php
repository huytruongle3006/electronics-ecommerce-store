<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $cart = Cart::where('user_id', $request->user()->id)->first();
        $items = $cart ? CartItem::with('product')->where('cart_id', $cart->id)->get() : collect();
        return response()->json(['success' => true, 'cart_id' => $cart?->id, 'items' => $items,
            'total_amount' => $items->sum(fn ($item) => $item->quantity * ($item->product?->price ?? 0))]);
    }
    public function addToCart(Request $request)
    {
        $data = $request->validate(['product_id' => 'required|integer', 'quantity' => 'required|integer|between:1,999']);
        return DB::transaction(function () use ($request, $data) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $product = Product::findOrFail($data['product_id']);
            abort_unless($product->status === 'active', 422, 'Sản phẩm không còn mở bán.');
            $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);
            $item = CartItem::where('cart_id', $cart->id)->where('product_id', $product->id)->first();
            $quantity = ($item?->quantity ?? 0) + $data['quantity'];
            abort_if($quantity > min(999, $product->quantity), 400, 'Số lượng vượt tồn kho hoặc giới hạn 999 sản phẩm.');
            if ($item) $item->update(['quantity' => $quantity]);
            else $item = CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => $quantity]);
            return response()->json(['success' => true, 'data' => $item->load('product')]);
        }, 3);
    }
    public function updateQuantity(Request $request, int $id)
    {
        $data = $request->validate(['quantity' => 'required|integer|between:1,999']);
        return DB::transaction(function () use ($request, $id, $data) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $item = CartItem::whereHas('cart', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);
            $product = $item->product;
            abort_unless($product && $product->status === 'active' && $product->quantity >= $data['quantity'], 422, 'Sản phẩm ngừng bán hoặc không đủ tồn kho.');
            $item->update($data);
            return response()->json(['success' => true, 'data' => $item]);
        }, 3);
    }
    public function removeItem(Request $request, int $id)
    {
        return DB::transaction(function () use ($request, $id) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            CartItem::whereHas('cart', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id)->delete();
            return response()->json(['success' => true, 'message' => 'Đã xóa khỏi giỏ.']);
        }, 3);
    }
}
