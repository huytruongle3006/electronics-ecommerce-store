<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportDetail;
use App\Models\ImportReceipt;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    private const MAX_CENTS = 999999999999999;

    public function suppliers()
    {
        return response()->json(['success' => true, 'data' => Supplier::orderBy('tenNCC')->get()]);
    }

    public function saveSupplier(Request $request, ?int $id = null)
    {
        $supplier = $id ? Supplier::findOrFail($id) : new Supplier;
        $data = $request->validate([
            'maNCC' => ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('suppliers', 'maNCC')->ignore($supplier->id)],
            'tenNCC' => ['required', 'string', 'max:100', 'regex:/\S/u'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9][0-9\s().-]{7,19}$/'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:1000'],
        ], [
            'required' => 'Vui lòng nhập :attribute.',
            'unique' => ':attribute đã tồn tại.',
            'regex' => ':attribute không hợp lệ.',
            'email' => 'Email không hợp lệ.',
            'max.string' => ':attribute tối đa :max ký tự.',
        ], ['maNCC' => 'Mã nhà cung cấp', 'tenNCC' => 'Tên nhà cung cấp', 'phone' => 'Số điện thoại', 'address' => 'Địa chỉ']);
        $supplier->fill($data)->save();
        return response()->json(['success' => true, 'message' => 'Đã lưu nhà cung cấp.', 'data' => $supplier], $id ? 200 : 201);
    }

    public function summary()
    {
        return response()->json(['success' => true, 'data' => [
            'product_count' => Product::count(),
            'total_units' => (int) Product::sum('quantity'),
            'low_stock_count' => Product::whereBetween('quantity', [1, 5])->count(),
            'out_of_stock_count' => Product::where('quantity', '<=', 0)->count(),
        ]]);
    }

    public function products(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'stock' => ['nullable', Rule::in(['all', 'low', 'out'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = Product::with('supplier:id,maNCC,tenNCC')->orderBy('tenSP')->orderBy('id');
        if (!empty($data['search'])) {
            $query->where(fn ($q) => $q->where('tenSP', 'like', '%' . $data['search'] . '%')->orWhere('maSP', 'like', '%' . $data['search'] . '%'));
        }
        if (($data['stock'] ?? '') === 'low') $query->whereBetween('quantity', [1, 5]);
        if (($data['stock'] ?? '') === 'out') $query->where('quantity', '<=', 0);
        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function receipts(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('from'), 'after_or_equal:from')],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = ImportReceipt::with(['supplier:id,maNCC,tenNCC', 'creator:id,full_name'])->withCount('details')->orderByDesc('created_at')->orderByDesc('id');
        if (!empty($data['search'])) $query->where('maPN', 'like', '%' . $data['search'] . '%');
        if (!empty($data['supplier_id'])) $query->where('supplier_id', $data['supplier_id']);
        if (!empty($data['from'])) $query->whereDate('created_at', '>=', $data['from']);
        if (!empty($data['to'])) $query->whereDate('created_at', '<=', $data['to']);
        return response()->json(['success' => true, 'data' => $query->paginate(15)]);
    }

    public function showReceipt(int $id)
    {
        return response()->json(['success' => true, 'data' => $this->loadReceipt(ImportReceipt::findOrFail($id))]);
    }

    public function storeReceipt(Request $request)
    {
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.import_price' => ['required', 'numeric', 'min:0', 'regex:/^\d{1,9}(\.\d{1,2})?$/'],
        ], [
            'supplier_id.required' => 'Vui lòng chọn nhà cung cấp.',
            'supplier_id.exists' => 'Nhà cung cấp không tồn tại.',
            'request_id.uuid' => 'Mã yêu cầu không hợp lệ. Hãy mở phiếu mới.',
            'items.required' => 'Hãy thêm sản phẩm vào phiếu nhập.',
            'items.max' => 'Mỗi phiếu nhập tối đa 100 sản phẩm.',
            'items.*.product_id.exists' => 'Sản phẩm không còn tồn tại.',
            'items.*.product_id.distinct' => 'Mỗi sản phẩm chỉ xuất hiện một lần trên phiếu.',
            'items.*.quantity.integer' => 'Số lượng nhập phải là số nguyên.',
            'items.*.quantity.min' => 'Số lượng nhập phải từ 1 trở lên.',
            'items.*.quantity.max' => 'Số lượng một dòng tối đa 1.000.000.',
            'items.*.import_price.regex' => 'Giá nhập tối đa 999.999.999,99 và có tối đa 2 số thập phân.',
            'items.*.import_price.min' => 'Giá nhập không được âm.',
        ]);
        $items = collect($data['items'])->map(fn ($item) => [
            'product_id' => (int) $item['product_id'], 'quantity' => (int) $item['quantity'],
            'cents' => $this->cents($item['import_price']),
        ])->sortBy('product_id')->values()->all();
        $total = 0;
        foreach ($items as $item) {
            $line = $item['cents'] * $item['quantity'];
            if ($line > self::MAX_CENTS || $total > self::MAX_CENTS - $line) {
                throw ValidationException::withMessages(['items' => ['Tổng giá trị phiếu nhập vượt giới hạn cho phép.']]);
            }
            $total += $line;
        }
        $actor = $request->user();
        $code = 'PN' . strtoupper(substr(hash('sha256', $actor->id . '|' . $data['request_id']), 0, 18));

        return DB::transaction(function () use ($data, $items, $actor, $code, $total) {
            // Serialize imports by the same administrator, including retries with the same request id.
            DB::table('users')->where('id', $actor->id)->lockForUpdate()->first();
            $existing = ImportReceipt::where('maPN', $code)->where('created_by', $actor->id)->first();
            if ($existing) {
                $storedItems = $existing->details()->orderBy('product_id')->get()->map(fn ($detail) => [
                    'product_id' => (int) $detail->product_id, 'quantity' => (int) $detail->quantity, 'cents' => $this->cents($detail->import_price),
                ])->all();
                if ((int) $existing->supplier_id !== (int) $data['supplier_id'] || trim($existing->note ?? '') !== trim($data['note'] ?? '') || $storedItems !== $items) {
                    return response()->json(['success' => false, 'message' => 'Yêu cầu này đã tạo phiếu với nội dung khác. Hãy mở phiếu mới.'], 409);
                }
                return response()->json(['success' => true, 'message' => 'Phiếu đã được ghi nhận trước đó, không cộng kho lần nữa.', 'data' => $this->loadReceipt($existing)]);
            }

            $products = Product::whereIn('id', array_column($items, 'product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                if (!$product || (int) $product->quantity + $item['quantity'] > 2147483647) {
                    throw ValidationException::withMessages(['items' => ['Sản phẩm không còn tồn tại hoặc số lượng tồn vượt giới hạn.']]);
                }
            }
            $receipt = ImportReceipt::create([
                'maPN' => $code, 'supplier_id' => $data['supplier_id'], 'created_by' => $actor->id,
                'total_amount' => $this->money($total), 'note' => $data['note'] ?? null, 'created_at' => now(),
            ]);
            foreach ($items as $item) {
                ImportDetail::create([
                    'import_receipt_id' => $receipt->id, 'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'], 'import_price' => $this->money($item['cents']),
                    'total_line' => $this->money($item['cents'] * $item['quantity']),
                ]);
                Product::whereKey($item['product_id'])->increment('quantity', $item['quantity']);
            }
            return response()->json(['success' => true, 'message' => 'Đã tạo phiếu nhập và cộng tồn kho.', 'data' => $this->loadReceipt($receipt)], 201);
        }, 3);
    }

    private function loadReceipt(ImportReceipt $receipt): ImportReceipt
    {
        return $receipt->load(['supplier', 'creator:id,full_name', 'details.product:id,maSP,tenSP']);
    }

    private function cents($value): int
    {
        $parts = explode('.', (string) $value);
        return (int) $parts[0] * 100 + (int) str_pad($parts[1] ?? '', 2, '0');
    }

    private function money(int $cents): string
    {
        return intdiv($cents, 100) . '.' . str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
