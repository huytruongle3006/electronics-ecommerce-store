<?php

namespace App\Http\Controllers\Api;
use App\Models\Role;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\OrderHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    // 1. Thống kê tổng quan
    public function dashboardStats()
    {
        $totalRevenue = Order::withoutRefunds()->where('status', 'completed')->sum('final_amount');
        $totalOrders = Order::count();
        $totalCustomers = User::whereHas('roles', function($q) {
            $q->where('maRole', 'CUSTOMER');
        })->count();
        $lowStockProducts = Product::where('quantity', '<=', 5)->count();

        $recentOrders = Order::with('details.product')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_revenue'      => $totalRevenue,
                'total_orders'       => $totalOrders,
                'total_customers'    => $totalCustomers,
                'low_stock_products' => $lowStockProducts,
                'recent_orders'      => $recentOrders,
            ]
        ]);
    }

    // 2. Danh sách tất cả đơn hàng cho Admin
    public function getOrders(Request $request)
    {
        $status = $request->query('status');
        $query = Order::with(['details.product', 'payment', 'user', 'histories'])->latest();

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->paginate(15)
        ]);
    }

    // 3. Cập nhật trạng thái đơn hàng (Duyệt đơn, Đang giao, Đã giao, Hủy)
    public function updateOrderStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,shipping,completed,cancelled',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $order = Order::whereKey($id)->lockForUpdate()->firstOrFail();
            $newStatus = $request->status;
            if ($order->status === $newStatus) {
                return response()->json(['success' => true, 'message' => 'Trạng thái không đổi', 'data' => $order]);
            }
            $allowed = [
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['shipping', 'cancelled'],
                'shipping' => ['completed'],
                'completed' => [],
                'cancelled' => [],
            ];
            if (!in_array($newStatus, $allowed[$order->status] ?? [], true)) {
                return response()->json(['success' => false, 'message' => 'Không thể chuyển trạng thái này. Đơn đã hủy hoặc hoàn tất không được mở lại.'], 409);
            }
            if ($newStatus === 'cancelled') {
                app(\App\Services\OrderCancellation::class)->cancelLocked($order, $request->user(), 'Quản trị viên hủy đơn.');
            } else {
                $order->update(['status' => $newStatus]);
                OrderHistory::create([
                    'order_id' => $order->id,
                    'status_changed' => $newStatus,
                    'changed_by' => $request->user()->id,
                    'note' => "Quản trị viên cập nhật trạng thái sang {$newStatus}",
                    'created_at' => now(),
                ]);
            }
            return response()->json([
                'success' => true,
                'message' => 'Cập nhật trạng thái đơn hàng thành công!',
                'data' => $order->load(['details.product', 'payment', 'histories']),
            ]);
        }, 3);
    }

    // 4. Quản lý sản phẩm: Thêm mới
    public function storeProduct(Request $request)
    {
        $request->validate([
            'maSP'            => 'required|unique:products,maSP',
            'tenSP'           => 'required|string|max:255',
            'category_id'     => 'required|exists:categories,id',
            'price'           => 'required|numeric|min:0',
            'quantity'        => 'required|integer|min:0',
            'warranty_months' => 'required|integer|min:0',
            'description'     => 'nullable|string',
            'specifications'  => 'nullable|array',
        ]);

        $product = Product::create([
            'maSP'            => $request->maSP,
            'tenSP'           => $request->tenSP,
            'category_id'     => $request->category_id,
            'supplier_id'     => $request->supplier_id ?? 1,
            'price'           => $request->price,
            'quantity'        => $request->quantity,
            'warranty_months' => $request->warranty_months,
            'description'     => $request->description,
            'specifications'  => $request->specifications,
            'status'          => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm sản phẩm mới thành công!',
            'data'    => $product
        ], 201);
    }

    // 5. Quản lý sản phẩm: Cập nhật
    public function updateProduct(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'tenSP'           => 'required|string|max:255',
            'price'           => 'required|numeric|min:0',
            'warranty_months' => 'required|integer|min:0',
            'status'          => 'required|in:active,inactive',
        ]);

        $product->update($request->only([
            'tenSP', 'category_id', 'price', 
            'warranty_months', 'description', 'specifications', 'status'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật sản phẩm thành công!',
            'data'    => $product
        ]);
    }

    // 6. Xóa / Ẩn sản phẩm
    public function deleteProduct($id)
    {
        $product = Product::findOrFail($id);
        $product->update(['status' => 'inactive']); // Soft hide

        return response()->json([
            'success' => true,
            'message' => 'Đã chuyển trạng thái sản phẩm sang Ngừng kinh doanh (Inactive)'
        ]);
    }
    public function getUsers(Request $request)
    {
        $search = $request->query('search', '');
        $roleId = $request->query('role_id', 'all');

        $query = User::with('roles')->latest();

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($roleId && $roleId !== 'all') {
            $query->whereHas('roles', function ($q) use ($roleId) {
                $q->where('roles.id', $roleId);
            });
        }

        return response()->json([
            'success' => true,
            'data'    => $query->paginate(10)
        ]);
    }

    /**
     * 2. Lấy danh sách tất cả các Role có trong DB để hiển thị lên dropdown
     */
    public function getAllRoles()
    {
        $roles = Role::select('id', 'maRole', 'tenRole')->get();

        return response()->json([
            'success' => true,
            'data'    => $roles
        ]);
    }

    /**
     * 3. Cập nhật Vai trò (Role) cho Người dùng
     */
    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role_id' => 'required|exists:roles,id'
        ]);

        $user = User::findOrFail($id);

        // Ngăn chặn tự tước quyền Admin của chính mình nếu chỉ có 1 tài khoản
        if ($user->id === $request->user()->id && $request->role_id != 1) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không thể tự hạ quyền Admin của chính mình!'
            ], 400);
        }

        // Cập nhật quan hệ users_roles qua bảng trung gian
        $user->roles()->sync([$request->role_id]);

        return response()->json([
            'success' => true,
            'message' => "Đã cập nhật vai trò cho người dùng {$user->full_name}!",
            'data'    => $user->load('roles')
        ]);
    }

    /**
     * 4. Khóa / Mở khóa tài khoản (Active / Inactive)
     */
    public function toggleUserStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không thể tự khóa tài khoản của chính mình!'
            ], 400);
        }

        $user->status = ($user->status === 'active') ? 'inactive' : 'active';
        $user->save();

        return response()->json([
            'success' => true,
            'message' => "Đã chuyển trạng thái tài khoản sang " . ($user->status === 'active' ? 'Hoạt động' : 'Đã khóa'),
            'data'    => $user
        ]);
    }
    // Lấy danh sách sản phẩm quản trị (kèm phân trang, lọc, tìm kiếm)
    public function getAdminProducts(Request $request)
    {
        $search = $request->query('search', '');
        $categoryId = $request->query('category_id', 'all');
        $status = $request->query('status', 'all');

        $query = Product::with('category')->latest();

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('tenSP', 'like', "%{$search}%")
                  ->orWhere('maSP', 'like', "%{$search}%");
            });
        }

        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', $categoryId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->paginate(10)
        ]);
    }
    /**
     * Báo cáo & Thống kê tài chính nâng cao
     */
    public function financialReport(Request $request)
    {
        // 1. Tổng doanh thu hoàn tất
        $completedOrders = \App\Models\Order::withoutRefunds()->where('status', 'completed');
        $totalRevenue = (clone $completedOrders)->sum('final_amount');
        $completedCount = (clone $completedOrders)->count();

        // 2. Doanh thu đang trên đường giao (tiềm năng)
        $shippingRevenue = \App\Models\Order::where('status', 'shipping')->sum('final_amount');

        // 3. Tỷ lệ hủy đơn
        $totalOrdersCount = \App\Models\Order::count();
        $cancelledCount = \App\Models\Order::where('status', 'cancelled')->count();
        $cancelRate = $totalOrdersCount > 0 ? round(($cancelledCount / $totalOrdersCount) * 100, 1) : 0;

        // 4. Giá trị đơn hàng trung bình (AOV)
        $aov = $completedCount > 0 ? round($totalRevenue / $completedCount) : 0;

        // 5. Doanh thu 7 ngày gần nhất
        $revenueLast7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $dayName = now()->subDays($i)->format('d/m');
            $dayRevenue = \App\Models\Order::withoutRefunds()->where('status', 'completed')
                ->whereDate('created_at', $date)
                ->sum('final_amount');

            $revenueLast7Days[] = [
                'date'    => $dayName,
                'revenue' => (float)$dayRevenue,
            ];
        }

        // 6. Cơ cấu đơn hàng theo trạng thái
        $statusBreakdown = [
            'pending'   => \App\Models\Order::where('status', 'pending')->count(),
            'confirmed' => \App\Models\Order::where('status', 'confirmed')->count(),
            'shipping'  => \App\Models\Order::where('status', 'shipping')->count(),
            'completed' => \App\Models\Order::where('status', 'completed')->count(),
            'cancelled' => $cancelledCount,
        ];

        // 7. Top 5 sản phẩm bán chạy nhất
        $topProducts = \Illuminate\Support\Facades\DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->join('products', 'order_details.product_id', '=', 'products.id')
            ->where('orders.status', 'completed')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))->from('payments')->whereColumn('payments.order_id', 'orders.id')->where('payments.payment_status', 'refunded');
            })
            ->select(
                'products.id',
                'products.maSP',
                'products.tenSP',
                \Illuminate\Support\Facades\DB::raw('SUM(order_details.quantity) as total_sold'),
                \Illuminate\Support\Facades\DB::raw('SUM(order_details.quantity * order_details.price) as total_revenue')
            )
            ->groupBy('products.id', 'products.maSP', 'products.tenSP')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_revenue'      => $totalRevenue,
                'shipping_revenue'   => $shippingRevenue,
                'completed_orders'   => $completedCount,
                'cancel_rate'        => $cancelRate,
                'average_order_val'  => $aov,
                'revenue_chart'      => $revenueLast7Days,
                'status_breakdown'   => $statusBreakdown,
                'top_products'       => $topProducts,
            ]
        ]);
    }
    /**
     * 1. Lấy danh sách Voucher (Admin)
     */
    /**
     * Lấy danh sách Voucher (Admin)
     */
    public function getVouchers(Request $request)
    {
        try {
            $search = $request->query('search', '');
            $status = $request->query('status', 'all');

            $query = \App\Models\Voucher::query()->orderBy('id', 'desc');

            if (!empty($search)) {
                $query->where('maVoucher', 'like', "%{$search}%");
            }

            if ($status === 'active') {
                $query->where('status', 'active')
                      ->where(function ($q) {
                          $q->whereNull('expired_at')->orWhere('expired_at', '>=', now());
                      });
            } elseif ($status === 'inactive') {
                $query->where('status', 'inactive');
            } elseif ($status === 'expired') {
                $query->where('expired_at', '<', now());
            }

            return response()->json([
                'success' => true,
                'data'    => $query->paginate(10)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi nạp voucher: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Thêm Voucher mới
     */
    public function storeVoucher(Request $request)
    {
        $request->validate([
            'maVoucher'           => 'required|string|max:50|unique:vouchers,maVoucher',
            'discount_percent'    => 'required|numeric|min:1|max:100',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount'    => 'nullable|numeric|min:0',
            'quantity'            => 'required|integer|min:1',
            'expired_at'          => 'nullable|date',
            'status'              => 'nullable|in:active,inactive'
        ]);

        $voucher = \App\Models\Voucher::create([
            'maVoucher'           => strtoupper(trim($request->maVoucher)),
            'discount_percent'    => $request->discount_percent,
            'max_discount_amount' => $request->max_discount_amount ?? 0,
            'min_order_amount'    => $request->min_order_amount ?? 0,
            'quantity'            => $request->quantity,
            'expired_at'          => $request->expired_at,
            'status'              => $request->status ?? 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tạo mã voucher thành công!',
            'data'    => $voucher
        ], 201);
    }

    /**
     * Cập nhật Voucher
     */
    public function updateVoucher(Request $request, $id)
    {
        $voucher = \App\Models\Voucher::findOrFail($id);

        $request->validate([
            'maVoucher'           => 'required|string|max:50|unique:vouchers,maVoucher,' . $id,
            'discount_percent'    => 'required|numeric|min:1|max:100',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_order_amount'    => 'nullable|numeric|min:0',
            'quantity'            => 'required|integer|min:0',
            'expired_at'          => 'nullable|date',
            'status'              => 'required|in:active,inactive'
        ]);

        $voucher->update([
            'maVoucher'           => strtoupper(trim($request->maVoucher)),
            'discount_percent'    => $request->discount_percent,
            'max_discount_amount' => $request->max_discount_amount ?? 0,
            'min_order_amount'    => $request->min_order_amount ?? 0,
            'quantity'            => $request->quantity,
            'expired_at'          => $request->expired_at,
            'status'              => $request->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật voucher thành công!',
            'data'    => $voucher
        ]);
    }

    /**
     * Bật / Tắt trạng thái Voucher
     */
    public function toggleVoucherStatus($id)
    {
        $voucher = \App\Models\Voucher::findOrFail($id);
        $voucher->status = ($voucher->status === 'active') ? 'inactive' : 'active';
        $voucher->save();

        return response()->json([
            'success' => true,
            'message' => $voucher->status === 'active' ? 'Đã kích hoạt voucher' : 'Đã tạm ngưng voucher',
            'data'    => $voucher
        ]);
    }

    /**
     * Xóa Voucher
     */
    public function deleteVoucher($id)
    {
        $voucher = \App\Models\Voucher::findOrFail($id);
        $voucher->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa mã voucher thành công!'
        ]);
    }
    public function getSettings()
    {
        try {
            $settings = \App\Models\Setting::pluck('value', 'key')->toArray();

            return response()->json([
                'success' => true,
                'data'    => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi tải thiết lập: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật các thiết lập hệ thống
     */
    public function updateSettings(Request $request)
    {
        try {
            $data = $request->except(['_token']);

            foreach ($data as $key => $value) {
                \App\Models\Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => is_bool($value) ? ($value ? '1' : '0') : (string)$value]
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã lưu cấu hình hệ thống thành công!'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi lưu cấu hình: ' . $e->getMessage()
            ], 500);
        }
    }
}