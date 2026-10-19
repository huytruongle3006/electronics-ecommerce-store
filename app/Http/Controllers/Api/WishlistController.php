<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $items = DB::table('wishlist_items')->where('user_id', $request->user()->id)
            ->orderByDesc('id')->get();
        $products = Product::whereIn('id', $items->pluck('product_id'))
            ->where('status', 'active')
            ->get(['id', 'maSP', 'tenSP', 'price', 'quantity', 'img_url', 'warranty_months', 'specifications'])
            ->keyBy('id');

        return response()->json(['items' => $items->map(fn ($item) => [
            'product_id' => (int) $item->product_id,
            'saved_at' => $item->created_at,
            'product' => $products->get($item->product_id),
        ]), 'limit' => 200]);
    }

    public function store(Request $request, int $productId)
    {
        DB::transaction(function () use ($request, $productId) {
            // Serialize writes for this account: idempotent PUT and the limit remain consistent.
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $query = DB::table('wishlist_items')->where('user_id', $request->user()->id);
            if ((clone $query)->where('product_id', $productId)->exists()) {
                return;
            }
            abort_unless(Product::whereKey($productId)->where('status', 'active')->exists(), 404,
                'Sản phẩm không còn được mở bán.');
            if ($query->count() >= 200) {
                throw ValidationException::withMessages(['wishlist' => 'Bạn đã lưu tối đa 200 sản phẩm. Hãy bỏ bớt trước khi thêm.']);
            }
            DB::table('wishlist_items')->insert([
                'user_id' => $request->user()->id, 'product_id' => $productId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });

        return response()->json(['message' => 'Đã lưu vào danh sách yêu thích.']);
    }

    public function destroy(Request $request, int $productId)
    {
        DB::transaction(function () use ($request, $productId) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            DB::table('wishlist_items')->where('user_id', $request->user()->id)
                ->where('product_id', $productId)->delete();
        });

        return response()->json(['message' => 'Đã bỏ yêu thích.']);
    }
}
