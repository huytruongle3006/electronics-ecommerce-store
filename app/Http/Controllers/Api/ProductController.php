<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Lấy danh sách sản phẩm có hỗ trợ:
     * - Tìm kiếm theo tên (search)
     * - Lọc theo danh mục (category_id)
     * - Lọc theo khoảng giá (min_price, max_price)
     * - Sắp xếp theo giá (sort: price_asc, price_desc)
     * - Phân trang (paginate)
     */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'supplier'])->where('status', 'active');

        // Tìm kiếm theo tên sản phẩm
        if ($request->filled('search')) {
            $query->where('tenSP', 'like', '%' . $request->search . '%');
        }

        // Lọc theo danh mục
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Lọc theo khoảng giá
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Sắp xếp
        if ($request->get('sort') === 'price_asc') {
            $query->orderBy('price', 'asc');
        } elseif ($request->get('sort') === 'price_desc') {
            $query->orderBy('price', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Phân trang mặc định 12 sản phẩm/trang (hoặc nhận từ param limit)
        $limit = $request->get('limit', 12);
        $products = $query->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách sản phẩm thành công',
            'data' => $products
        ], 200);
    }

    /**
     * Lấy chi tiết 1 sản phẩm kèm thông số kỹ thuật (specifications),
     * danh mục, nhà cung cấp và đánh giá.
     */
    public function show($id)
    {
        $product = Product::with(['category', 'supplier', 'reviews.user'])->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy chi tiết sản phẩm thành công',
            'data' => $product
        ], 200);
    }

    /**
     * Thêm mới sản phẩm (Dành cho Quản trị viên/Admin)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'maSP' => 'required|string|unique:products,maSP',
            'tenSP' => 'required|string|max:255',
            'description' => 'nullable|string',
            'specifications' => 'nullable|array', // Dạng JSON
            'img_url' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'warranty_months' => 'nullable|integer|min:0',
            'supplier_id' => 'required|exists:suppliers,id',
            'category_id' => 'required|exists:categories,id',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] ?? 'active';

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tạo sản phẩm mới thành công',
            'data' => $product
        ], 201);
    }
}