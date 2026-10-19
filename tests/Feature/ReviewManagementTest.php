<?php

namespace Tests\Feature;

use App\Models\Review;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\OrderTestCase;

class ReviewManagementTest extends OrderTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('reviews', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('user_id'); $table->unsignedBigInteger('product_id');
            $table->integer('rating'); $table->text('comment')->nullable(); $table->timestamp('created_at')->nullable();
        });
    }

    private function reviewedPurchase($user): array
    {
        $order = $this->purchase($user, 'completed');
        $productId = $order->details()->first()->product_id;
        $this->actingAs($user, 'sanctum')->postJson("/api/products/$productId/reviews", ['rating' => 4, 'comment' => 'Sản phẩm dùng tốt'])->assertCreated();
        return [$order, $productId, Review::firstOrFail()];
    }

    public function test_guest_can_read_but_cannot_manage_reviews(): void
    {
        $user = $this->account(); $order = $this->purchase($user); $id = $order->details()->first()->product_id;
        $this->getJson("/api/products/$id/reviews")->assertOk()->assertJsonPath('data.avg_rating', 0)->assertJsonPath('data.can_review', false)->assertJsonPath('data.my_review', null);
        $this->getJson('/api/reviews/my')->assertUnauthorized();
        $this->postJson("/api/products/$id/reviews", [])->assertUnauthorized();
        $this->putJson('/api/reviews/1', [])->assertUnauthorized();
        $this->deleteJson('/api/reviews/1')->assertUnauthorized();
    }

    public function test_create_requires_own_confirmed_or_later_order_for_exact_product(): void
    {
        $owner = $this->account(); $other = $this->account('other@example.test');
        $order = $this->purchase($owner, 'pending'); $id = $order->details()->first()->product_id;
        $data = ['rating' => 5, 'comment' => 'Sản phẩm tốt'];
        $this->actingAs($owner, 'sanctum')->postJson("/api/products/$id/reviews", $data)->assertForbidden();
        foreach (['cancelled'] as $status) {
            $order->update(['status' => $status]);
            $this->postJson("/api/products/$id/reviews", $data)->assertForbidden();
        }
        $order->update(['status' => 'completed']);
        $this->actingAs($other, 'sanctum')->postJson("/api/products/$id/reviews", $data)->assertForbidden();
        $otherOrder = $this->purchase($owner, 'completed'); $otherId = $otherOrder->details()->first()->product_id;
        $this->actingAs($other, 'sanctum')->postJson("/api/products/$otherId/reviews", $data)->assertForbidden();
        $this->actingAs($owner, 'sanctum')->postJson("/api/products/$id/reviews", $data)->assertCreated();
        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_repeat_submission_updates_same_review_and_ignores_injected_ids(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        [, $productId, $review] = $this->reviewedPurchase($user); $createdAt = $review->created_at;
        $this->postJson("/api/products/$productId/reviews", ['rating' => 2, 'comment' => '  Nội dung đã sửa  ', 'user_id' => $other->id, 'product_id' => 999, 'created_at' => '2000-01-01'])
            ->assertOk()->assertJsonPath('data.id', $review->id);
        $this->assertDatabaseCount('reviews', 1);
        $this->assertDatabaseHas('reviews', ['user_id' => $user->id, 'product_id' => $productId, 'rating' => 2, 'comment' => 'Nội dung đã sửa']);
        $this->assertTrue($review->fresh()->created_at->equalTo($createdAt));
        $this->getJson("/api/products/$productId/reviews")->assertJsonPath('data.my_review.id', $review->id)->assertJsonPath('data.can_review', true);
    }

    public function test_owner_edits_and_deletes_but_other_accounts_cannot(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        [, $productId, $review] = $this->reviewedPurchase($user);
        $this->actingAs($other, 'sanctum')->putJson("/api/reviews/$review->id", ['rating' => 1, 'comment' => 'Unauthorized'])->assertNotFound();
        $this->deleteJson("/api/reviews/$review->id")->assertNotFound();
        $this->getJson('/api/reviews/my')->assertJsonCount(0, 'data.data');
        $this->actingAs($user, 'sanctum')->putJson("/api/reviews/$review->id", ['rating' => 3, 'comment' => 'Đã sửa nhận xét', 'user_id' => $other->id, 'product_id' => 999])->assertOk();
        $this->getJson('/api/reviews/my')->assertJsonPath('data.data.0.product.id', $productId)->assertJsonPath('data.data.0.rating', 3);
        $this->assertDatabaseHas('reviews', ['id' => $review->id, 'user_id' => $user->id, 'product_id' => $productId]);
        $this->deleteJson("/api/reviews/$review->id")->assertOk();
        $this->getJson("/api/products/$productId/reviews")->assertJsonPath('data.total_reviews', 0)->assertJsonPath('data.avg_rating', 0)->assertJsonPath('data.my_review', null);
    }

    public function test_validation_rejects_blank_short_oversized_and_invalid_rating(): void
    {
        $user = $this->account(); [, $productId, $review] = $this->reviewedPurchase($user);
        foreach ([0, 6, 1.5, 'invalid'] as $rating) {
            $this->postJson("/api/products/$productId/reviews", ['rating' => $rating, 'comment' => 'Nội dung hợp lệ'])->assertUnprocessable()->assertJsonValidationErrors('rating');
        }
        foreach (['   ', 'ab', str_repeat('x', 1001)] as $comment) {
            $this->putJson("/api/reviews/$review->id", ['rating' => 4, 'comment' => $comment])->assertUnprocessable()->assertJsonValidationErrors('comment');
        }
        $this->assertDatabaseHas('reviews', ['id' => $review->id, 'rating' => 4, 'comment' => 'Sản phẩm dùng tốt']);
    }

    public function test_public_pagination_filter_and_aggregate_are_independent_and_private(): void
    {
        $user = $this->account(); $order = $this->purchase($user, 'completed'); $productId = $order->details()->first()->product_id;
        for ($i = 0; $i < 7; $i++) {
            $reviewer = $i === 0 ? $user : $this->account("reviewer$i@example.test");
            Review::create(['user_id' => $reviewer->id, 'product_id' => $productId, 'rating' => $i < 5 ? 5 : 1, 'comment' => 'Nhận xét '.$i, 'created_at' => now()]);
        }
        $this->getJson("/api/products/$productId/reviews")->assertJsonCount(5, 'data.reviews')->assertJsonPath('data.total_reviews', 7)->assertJsonPath('data.avg_rating', 3.9)
            ->assertJsonMissingPath('data.reviews.0.user.email')->assertJsonMissingPath('data.reviews.0.user.password')->assertJsonPath('data.pagination.last_page', 2);
        $this->getJson("/api/products/$productId/reviews?page=2")->assertJsonCount(2, 'data.reviews')->assertJsonPath('data.reviews.1.verified_purchase', true);
        $this->getJson("/api/products/$productId/reviews?rating=1")->assertJsonCount(2, 'data.reviews')->assertJsonPath('data.avg_rating', 3.9)->assertJsonPath('data.total_reviews', 7)->assertJsonPath('data.pagination.total', 2)->assertJsonPath('data.reviews.0.verified_purchase', false);
        $this->getJson("/api/products/$productId/reviews?rating=6")->assertUnprocessable();
        $this->getJson("/api/products/$productId/reviews?page=-1")->assertUnprocessable();
    }

    public function test_my_reviews_are_paginated_and_existing_reviews_remain_editable_after_refund(): void
    {
        $user = $this->account(); [$order, $productId, $review] = $this->reviewedPurchase($user);
        $order->payment->update(['payment_status' => 'refunded']);
        $this->putJson("/api/reviews/$review->id", ['rating' => 1, 'comment' => 'Đã trả hàng do lỗi'])->assertOk();
        for ($i = 0; $i < 10; $i++) {
            Review::create(['user_id' => $user->id, 'product_id' => $productId + $i + 1, 'rating' => 3, 'comment' => 'Nhận xét cũ', 'created_at' => now()]);
        }
        $this->getJson('/api/reviews/my')->assertJsonCount(10, 'data.data')->assertJsonPath('data.total', 11)->assertJsonPath('data.last_page', 2)->assertJsonPath('data.data.0.product', null);
        $this->getJson('/api/reviews/my?page=2')->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.rating', 1);
        $this->getJson('/api/reviews/my?page=0')->assertUnprocessable();
        $this->deleteJson("/api/reviews/$review->id")->assertOk();
    }

    public function test_product_detail_does_not_embed_unpaginated_reviewers_private_accounts(): void
    {
        $user = $this->account(); [, $productId] = $this->reviewedPurchase($user);
        $this->getJson("/api/products/$productId")->assertOk()->assertJsonMissingPath('data.reviews')
            ->assertJsonMissing(['email' => $user->email]);
    }
    public function test_confirmed_shipping_and_completed_orders_can_review_and_pending_users_cannot_borrow_permission(): void
    {
        $user = $this->account(); $other = $this->account('other@example.test');
        foreach (['confirmed', 'shipping', 'completed'] as $status) {
            $order = $this->purchase($user, $status); $productId = $order->details()->first()->product_id;
            $this->actingAs($user, 'sanctum')->getJson("/api/products/$productId/reviews")->assertOk()->assertJsonPath('data.can_review', true);
            $this->postJson("/api/products/$productId/reviews", ['rating' => 5, 'comment' => 'Nhận xét từ đơn đã xác nhận'])->assertCreated();
            $this->getJson("/api/products/$productId/reviews")->assertJsonPath('data.my_review.rating', 5)->assertJsonPath('data.reviews.0.verified_purchase', $status === 'completed');
            $this->actingAs($other, 'sanctum')->getJson("/api/products/$productId/reviews")->assertJsonPath('data.can_review', false)->assertJsonPath('data.my_review', null);
            $this->postJson("/api/products/$productId/reviews", ['rating' => 1, 'comment' => 'Không được mượn quyền'])->assertForbidden();
        }
    }

}
