<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    private function purchases(int $userId, int $productId)
    {
        return Order::where('user_id', $userId)->whereIn('status', ['confirmed', 'shipping', 'completed'])
            ->whereHas('details', fn ($query) => $query->where('product_id', $productId));
    }

    private function payload(Request $request): array
    {
        if (is_string($request->input('comment'))) {
            $request->merge(['comment' => trim($request->input('comment'))]);
        }
        return $request->validate([
            'rating' => 'required|integer|between:1,5',
            'comment' => 'required|string|min:3|max:1000',
        ], [
            'rating.required' => 'Vui lòng chọn số sao.',
            'rating.integer' => 'Số sao phải là số nguyên từ 1 đến 5.',
            'rating.between' => 'Số sao phải từ 1 đến 5.',
            'comment.required' => 'Vui lòng nhập nhận xét.',
            'comment.string' => 'Nhận xét phải là văn bản.',
            'comment.min' => 'Nhận xét cần ít nhất 3 ký tự.',
            'comment.max' => 'Nhận xét không được vượt quá 1000 ký tự.',
        ]);
    }

    public function index(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $request->validate(['rating' => 'nullable|integer|between:1,5', 'page' => 'nullable|integer|min:1']);
        $base = Review::where('product_id', $productId);
        $total = (clone $base)->count();
        $average = (clone $base)->avg('rating');
        $list = (clone $base)->with('user:id,full_name')->when($request->filled('rating'),
            fn ($query) => $query->where('rating', $request->integer('rating')))
            ->orderByDesc('id')->paginate(5);
        $verifiedUsers = Order::where('status', 'completed')->whereIn('user_id', $list->pluck('user_id'))
            ->whereHas('details', fn ($query) => $query->where('product_id', $productId))
            ->pluck('user_id')->all();
        $reviews = $list->getCollection()->map(fn ($review) => [
            'id' => $review->id, 'rating' => $review->rating, 'comment' => $review->comment,
            'created_at' => $review->created_at, 'user' => $review->user?->only(['id', 'full_name']),
            'verified_purchase' => in_array($review->user_id, $verifiedUsers),
        ]);
        $user = $request->user('sanctum');
        $mine = $user ? (clone $base)->where('user_id', $user->id)->orderByDesc('id')->first() : null;

        return response()->json(['success' => true, 'data' => [
            'reviews' => $reviews, 'avg_rating' => round($average ?? 0, 1), 'total_reviews' => $total,
            'pagination' => ['current_page' => $list->currentPage(), 'last_page' => $list->lastPage(), 'total' => $list->total()],
            'my_review' => $mine?->only(['id', 'rating', 'comment', 'created_at']),
            'can_review' => $user && ($mine || $this->purchases($user->id, $productId)->exists()),
        ]]);
    }

    public function mine(Request $request)
    {
        $request->validate(['page' => 'nullable|integer|min:1']);
        $reviews = Review::where('user_id', $request->user()->id)->with('product:id,tenSP')
            ->orderByDesc('id')->paginate(10);
        return response()->json(['data' => $reviews]);
    }

    public function store(Request $request, int $productId)
    {
        Product::findOrFail($productId);
        $data = $this->payload($request);
        $created = false;
        $review = DB::transaction(function () use ($request, $productId, $data, &$created) {
            // Legacy SQL lacks a unique user/product key. Serialize all review writes per account.
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $review = Review::where('user_id', $request->user()->id)->where('product_id', $productId)->orderByDesc('id')->first();
            if (!$review) {
                abort_unless($this->purchases($request->user()->id, $productId)->exists(), 403,
                    'Bạn chỉ có thể đánh giá sản phẩm trong đơn đã xác nhận, đang giao hoặc hoàn tất.');
                $created = true;
                $review = new Review(['user_id' => $request->user()->id, 'product_id' => $productId, 'created_at' => now()]);
            }
            $review->fill($data)->save();
            return $review;
        });
        return response()->json(['success' => true, 'message' => $created ? 'Đã gửi đánh giá.' : 'Đã cập nhật đánh giá.', 'data' => $review], $created ? 201 : 200);
    }

    public function update(Request $request, int $id)
    {
        // Scope before validation, so another user's id never exposes their record.
        Review::where('user_id', $request->user()->id)->findOrFail($id);
        $data = $this->payload($request);
        $review = DB::transaction(function () use ($request, $id, $data) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            $review = Review::where('user_id', $request->user()->id)->findOrFail($id);
            $review->fill($data)->save();
            return $review;
        });
        return response()->json(['success' => true, 'message' => 'Đã cập nhật đánh giá.', 'data' => $review]);
    }

    public function destroy(Request $request, int $id)
    {
        DB::transaction(function () use ($request, $id) {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            Review::where('user_id', $request->user()->id)->findOrFail($id)->delete();
        });
        return response()->json(['success' => true, 'message' => 'Đã xóa đánh giá.']);
    }
}
