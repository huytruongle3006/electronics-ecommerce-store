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
        $data = $request->validate([
            'search'=>'nullable|string|max:100','category_id'=>'nullable|integer|min:1',
            'min_price'=>'nullable|numeric|min:0|max:9999999999999.99|decimal:0,2',
            'max_price'=>'nullable|numeric|min:0|max:9999999999999.99|decimal:0,2',
            'in_stock'=>'nullable|boolean','min_warranty_months'=>'nullable|integer|min:0|max:120',
            'sort'=>'nullable|in:newest,price_asc,price_desc,warranty_desc,name_asc',
            'page'=>'nullable|integer|min:1|max:1000000','limit'=>'nullable|integer|min:1|max:48',
        ]);
        if (isset($data['min_price'],$data['max_price']) && (float)$data['min_price'] > (float)$data['max_price']) {
            throw \Illuminate\Validation\ValidationException::withMessages(['max_price'=>'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.']);
        }
        $query = Product::with(['category', 'supplier'])->where('status', 'active');

        // Tìm kiếm theo tên sản phẩm
        $search = trim($data['search'] ?? '');
        if ($search !== '') {
            $query->where(fn($q)=>$q->where('tenSP','like','%'.$search.'%')->orWhere('maSP','like','%'.$search.'%'));
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
        if ($request->boolean('in_stock')) $query->where('quantity','>',0);
        if ($request->filled('min_warranty_months')) $query->where('warranty_months','>=',$data['min_warranty_months']);

        // Sắp xếp
        if ($request->get('sort') === 'price_asc') {
            $query->orderBy('price', 'asc');
        } elseif ($request->get('sort') === 'price_desc') {
            $query->orderBy('price', 'desc');
        } elseif ($request->get('sort') === 'warranty_desc') {
            $query->orderBy('warranty_months','desc');
        } elseif ($request->get('sort') === 'name_asc') {
            $query->orderBy('tenSP','asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }
        $query->orderByDesc('id');

        // Phân trang mặc định 12 sản phẩm/trang (hoặc nhận từ param limit)
        $limit = $data['limit'] ?? 12;
        $products = $query->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách sản phẩm thành công',
            'data' => $products
        ], 200);
    }

    /**
     * Lấy chi tiết 1 sản phẩm kèm thông số kỹ thuật (specifications),
     * danh mục và nhà cung cấp. Đánh giá lấy qua API phân trang riêng.
     */
    public function show($id)
    {
        $product = Product::with(['category', 'supplier'])->find($id);

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
