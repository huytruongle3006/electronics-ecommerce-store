<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Lấy danh sách tất cả danh mục sản phẩm kèm số lượng sản phẩm
     */
    public function index()
    {
        try {
            $categories = Category::withCount('products')->get();

            return response()->json([
                'success' => true,
                'data'    => $categories
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi nạp danh mục: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy chi tiết một danh mục kèm danh sách sản phẩm thuộc danh mục đó
     */
    public function show($id)
    {
        $category = Category::with('products')->find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy danh mục'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $category
        ], 200);
    }

    /**
     * Thêm danh mục mới (dành cho Admin)
     */
    public function store(Request $request)
    {
        $request->validate([
            'tenLoai' => 'required|string|max:100|unique:categories,tenLoai',
            'mota'    => 'nullable|string',
        ]);

        $category = Category::create([
            'tenLoai' => $request->tenLoai,
            'mota'    => $request->mota,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm danh mục thành công',
            'data'    => $category
        ], 201);
    }

    /**
     * Cập nhật danh mục
     */
    public function update(Request $request, $id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy danh mục'
            ], 404);
        }

        $request->validate([
            'tenLoai' => 'required|string|max:100|unique:categories,tenLoai,' . $id,
            'mota'    => 'nullable|string',
        ]);

        $category->update($request->only('tenLoai', 'mota'));

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật danh mục thành công',
            'data'    => $category
        ], 200);
    }

    /**
     * Xóa danh mục
     */
    public function destroy($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy danh mục'
            ], 404);
        }

        // Kiểm tra nếu danh mục đang chứa sản phẩm
        if ($category->products()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa danh mục đang có sản phẩm'
            ], 400);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa danh mục'
        ], 200);
    }
}