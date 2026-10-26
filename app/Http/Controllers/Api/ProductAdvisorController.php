<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductAdvisor;
use Illuminate\Http\Request;

class ProductAdvisorController extends Controller
{
    public function options(ProductAdvisor $advisor)
    {
        return response()->json(['ready' => $advisor->ready(), 'categories' => $advisor->categories()]);
    }

    public function chat(Request $request, ProductAdvisor $advisor)
    {
        $data = $request->validate([
            'messages' => 'required|array|min:1|max:8',
            'messages.*.role' => 'required|in:user,assistant', 'messages.*.content' => 'required|string|max:1000',
            'category_id' => 'nullable|integer|exists:categories,id', 'max_price' => 'nullable|numeric|min:0|max:1000000000000',
            'previous_product_ids' => 'sometimes|array|max:3', 'previous_product_ids.*' => 'integer|min:1|distinct',
        ]);
        abort_unless(end($data['messages'])['role'] === 'user', 422, 'Tin nhắn cuối phải là nhu cầu mới của khách hàng.');
        $data['messages'] = array_map(fn ($message) => ['role' => $message['role'], 'content' => $message['content']], $data['messages']);
        return response()->json(['data' => $advisor->advise($data)]);
    }
}
