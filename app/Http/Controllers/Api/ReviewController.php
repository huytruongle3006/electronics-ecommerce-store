<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Order;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    // Lấy danh sách đánh giá + kiểm tra quyền đánh giá của user
    public function index(Request $request, $productId)
    {
        $reviews = Review::with('user:id,full_name')
            ->where('product_id', $productId)
            ->latest()
            ->get();

        $avgRating = $reviews->avg('rating') ?: 5;
        $totalReviews = $reviews->count();

        // Kiểm tra xem user hiện tại đã mua sản phẩm này và đơn đã completed chưa
        $canReview = false;
        $user = $request->user('sanctum');

        if ($user) {
            $hasPurchased = Order::where('user_id', $user->id)
                ->where('status', 'completed')
                ->whereHas('details', function ($q) use ($productId) {
                    $q->where('product_id', $productId);
                })
                ->exists();

            $canReview = $hasPurchased;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'reviews'       => $reviews,
                'avg_rating'    => round($avgRating, 1),
                'total_reviews' => $totalReviews,
                'can_review'    => $canReview, // true nếu đủ điều kiện
            ]
        ]);
    }

    // Lưu đánh giá
    public function store(Request $request, $productId)
    {
        $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        $user = $request->user();

        // Kiểm tra điều kiện mua hàng trước khi cho lưu
        $hasPurchased = Order::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereHas('details', function ($q) use ($productId) {
                $q->where('product_id', $productId);
            })
            ->exists();

        if (!$hasPurchased) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và đơn hàng ở trạng thái Hoàn thành!'
            ], 403);
        }

        $review = Review::updateOrCreate(
            [
                'product_id' => $productId,
                'user_id'    => $user->id,
            ],
            [
                'rating'  => $request->rating,
                'comment' => $request->comment,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Đánh giá sản phẩm thành công!',
            'data'    => $review->load('user:id,full_name')
        ], 201);
    }
}