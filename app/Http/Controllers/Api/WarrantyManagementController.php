<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Warranty;
use App\Models\WarrantyServiceRequest;
use App\Models\WarrantyServiceEvent;
use App\Services\WarrantyPolicy;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WarrantyManagementController extends Controller
{
    public function mine(Request $request, WarrantyPolicy $policy)
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);
        $rows = Warranty::with(['product:id,tenSP', 'order:id,maDH,status', 'serviceRequests.events'])
            ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))->orderByDesc('id')->paginate(10);
        $rows->getCollection()->each(fn ($row) => $row->setAttribute('effective_status', $policy->effectiveStatus($row)));
        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function mineDetail(Request $request, int $id, WarrantyPolicy $policy)
    {
        $row = Warranty::with(['product:id,tenSP', 'order:id,maDH,status', 'serviceRequests.events'])
            ->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);
        $row->setAttribute('effective_status', $policy->effectiveStatus($row));
        return response()->json(['data' => $row]);
    }

    public function index(Request $request, WarrantyPolicy $policy)
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = Warranty::with(['product:id,tenSP', 'order:id,maDH,status'])->orderByDesc('id');
        if (!empty($data['search'])) $query->where(fn ($q) => $q->where('serial_number', 'like', '%' . $data['search'] . '%')->orWhere('customer_name', 'like', '%' . $data['search'] . '%')->orWhereHas('order', fn ($order) => $order->where('maDH', 'like', '%' . $data['search'] . '%')));
        $rows = $query->paginate(15);
        $rows->getCollection()->each(fn ($row) => $row->setAttribute('effective_status', $policy->effectiveStatus($row)));
        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function orders(Request $request)
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = Order::with(['details.product', 'warranties:id,order_id,product_id'])->where('status', 'completed')->withoutRefunds()
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('return_requests')->whereColumn('return_requests.order_id', 'orders.id')->where('return_requests.status', '!=', 'rejected'))->orderByDesc('id');
        if (!empty($data['search'])) $query->where('maDH', 'like', '%' . $data['search'] . '%');
        return response()->json(['success' => true, 'data' => $query->paginate(10)]);
    }

    public function store(Request $request, WarrantyPolicy $policy)
    {
        $data = $request->validate(['order_id' => ['required', 'integer'], 'product_id' => ['required', 'integer'], 'serial_number' => ['required', 'string', 'min:4', 'max:100', 'regex:/^[A-Za-z0-9_.-]+$/']]);
        $serial = strtoupper(trim($data['serial_number']));
        try {
            return DB::transaction(function () use ($request, $data, $serial, $policy) {
                $order = Order::with(['details.product', 'payment'])->whereKey($data['order_id'])->lockForUpdate()->firstOrFail();
                $existing = Warranty::whereRaw('LOWER(serial_number) = ?', [strtolower($serial)])->first();
                if ($existing) {
                    if ((int) $existing->order_id === $order->id && (int) $existing->product_id === (int) $data['product_id']) return response()->json(['success' => true, 'message' => 'Serial đã được cấp cho đơn này.', 'data' => $existing]);
                    throw ValidationException::withMessages(['serial_number' => ['Serial đã thuộc một thiết bị khác.']]);
                }
                if ($order->status !== 'completed' || $order->payment?->payment_status === 'refunded' || $policy->hasReturn($order)) abort(409, 'Chỉ cấp bảo hành cho đơn hoàn tất, chưa hoàn tiền và không có yêu cầu trả hàng.');
                $lines = $order->details->where('product_id', (int) $data['product_id']);
                $product = $lines->first()?->product;
                if (!$product || $product->warranty_months < 1 || $product->warranty_months > 120) abort(422, 'Sản phẩm không thuộc đơn hoặc chưa có thời hạn bảo hành hợp lệ (1–120 tháng).');
                if (Warranty::where('order_id', $order->id)->where('product_id', $product->id)->count() >= $lines->sum('quantity')) abort(409, 'Đã cấp đủ serial theo số lượng sản phẩm trong đơn.');
                $start = $order->completedAt()->timezone(config('warranty.timezone'))->startOfDay();
                if ($start->isFuture()) abort(409, 'Ngày hoàn tất đơn không hợp lệ.');
                $warranty = Warranty::create([
                    'maBH' => 'BH' . Str::upper(Str::random(18)), 'serial_number' => $serial, 'order_id' => $order->id, 'product_id' => $product->id,
                    'customer_name' => $order->recipient_name, 'customer_phone' => $order->recipient_phone,
                    'start_date' => $start, 'end_date' => $start->copy()->addMonthsNoOverflow($product->warranty_months), 'status' => 'valid',
                ]);
                $this->auditWarranty($warranty->id, $request->user()->id, 'created', 'Cấp serial theo đơn ' . $order->maDH);
                return response()->json(['success' => true, 'message' => 'Đã tạo bảo hành điện tử.', 'data' => $warranty], 201);
            }, 3);
        } catch (QueryException $exception) {
            if (in_array($exception->getCode(), ['23000', '23505'], true) && Warranty::whereRaw('LOWER(serial_number) = ?', [strtolower($serial)])->exists()) throw ValidationException::withMessages(['serial_number' => ['Serial đã tồn tại. Vui lòng tải lại danh sách.']]);
            throw $exception;
        }
    }

    public function status(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['valid', 'expired'])], 'note' => ['required', 'string', 'min:3', 'max:500']]);
        return DB::transaction(function () use ($request, $id, $data) {
            $identity = Warranty::findOrFail($id);
            if ($identity->order_id) Order::whereKey($identity->order_id)->lockForUpdate()->firstOrFail();
            $warranty = Warranty::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($warranty->serviceRequests()->whereIn('status', WarrantyPolicy::OPEN_STATUSES)->exists()) abort(409, 'Đang có hồ sơ bảo hành mở. Hoàn tất hồ sơ trước khi đổi trạng thái.');
            if ($warranty->status !== $data['status']) {
                $warranty->update(['status' => $data['status']]);
                $this->auditWarranty($id, $request->user()->id, $data['status'], $data['note']);
            }
            return response()->json(['success' => true, 'message' => 'Đã cập nhật trạng thái gốc. Ngày hết hạn và trạng thái đơn vẫn được kiểm tra.', 'data' => $warranty]);
        }, 3);
    }

    public function detail(int $id, WarrantyPolicy $policy)
    {
        $warranty = Warranty::with(['product', 'order:id,maDH,status', 'serviceRequests.events'])->findOrFail($id);
        $warranty->setAttribute('effective_status', $policy->effectiveStatus($warranty));
        $events = DB::table('warranty_events')->where('warranty_id', $id)->orderBy('id')->get()->map(function ($event) {
            $event->created_at = \Illuminate\Support\Carbon::parse($event->created_at)->toIso8601String();
            return $event;
        });
        $warranty->setAttribute('audit_events', $events);
        return response()->json(['success' => true, 'data' => $warranty]);
    }

    public function requestService(Request $request, int $id, WarrantyPolicy $policy)
    {
        $data = $request->validate(['problem' => ['required', 'string', 'min:10', 'max:1000'], 'contact_phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9][0-9\s().-]{7,19}$/']]);
        return DB::transaction(function () use ($request, $id, $data, $policy) {
            $identity = Warranty::whereKey($id)->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id))->firstOrFail();
            Order::whereKey($identity->order_id)->lockForUpdate()->firstOrFail();
            $warranty = Warranty::whereKey($id)->lockForUpdate()->firstOrFail();
            $existing = $warranty->serviceRequests()->whereIn('status', WarrantyPolicy::OPEN_STATUSES)->with('events')->first();
            if ($existing) return response()->json(['success' => true, 'message' => 'Thiết bị đang có hồ sơ mở. Vui lòng theo dõi hồ sơ hiện tại.', 'data' => $existing]);
            if ($policy->effectiveStatus($warranty) !== 'valid') abort(409, 'Bảo hành hiện không đủ điều kiện tiếp nhận. Vui lòng liên hệ cửa hàng.');
            $service = WarrantyServiceRequest::create(['warranty_id' => $id, 'user_id' => $request->user()->id, 'status' => 'requested', 'problem' => $data['problem'], 'contact_phone' => $data['contact_phone']]);
            $this->auditService($service->id, $request->user()->id, 'requested', 'Khách hàng gửi yêu cầu bảo hành.');
            return response()->json(['success' => true, 'message' => 'Đã gửi yêu cầu. Chờ cửa hàng hướng dẫn tiếp nhận thiết bị.', 'data' => $service->load('events')], 201);
        }, 3);
    }

    public function services(Request $request)
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'status' => ['nullable', Rule::in(['all', 'requested', 'accepted', 'rejected', 'repairing', 'ready', 'closed'])], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = WarrantyServiceRequest::with(['warranty.product:id,tenSP', 'user:id,full_name'])->orderByDesc('id');
        if (!empty($data['search'])) $query->whereHas('warranty', fn ($q) => $q->where('serial_number', 'like', '%' . $data['search'] . '%'));
        if (!empty($data['status']) && $data['status'] !== 'all') $query->where('status', $data['status']);
        return response()->json(['success' => true, 'data' => $query->paginate(15)]);
    }

    public function serviceDetail(int $id)
    {
        return response()->json(['success' => true, 'data' => WarrantyServiceRequest::with(['warranty.product', 'user:id,full_name', 'events'])->findOrFail($id)]);
    }

    public function updateService(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['accepted', 'rejected', 'repairing', 'ready', 'closed'])], 'note' => ['nullable', 'string', 'max:1000', 'required_if:status,rejected'], 'resolution' => ['nullable', 'string', 'max:1000', 'required_if:status,ready']]);
        return DB::transaction(function () use ($request, $id, $data) {
            $identity = WarrantyServiceRequest::with('warranty')->findOrFail($id);
            if ($identity->warranty->order_id) Order::whereKey($identity->warranty->order_id)->lockForUpdate()->firstOrFail();
            Warranty::whereKey($identity->warranty_id)->lockForUpdate()->firstOrFail();
            $service = WarrantyServiceRequest::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($service->status === $data['status']) return response()->json(['success' => true, 'message' => 'Hồ sơ đã ở trạng thái này.', 'data' => $service->load(['events', 'warranty.product', 'user:id,full_name'])]);
            $allowed = ['requested' => ['accepted', 'rejected'], 'accepted' => ['repairing'], 'repairing' => ['ready'], 'ready' => ['closed'], 'closed' => [], 'rejected' => []];
            if (!in_array($data['status'], $allowed[$service->status] ?? [], true)) abort(409, 'Không thể chuyển trạng thái này. Vui lòng tải lại hồ sơ.');
            $service->status = $data['status']; $service->admin_note = $data['note'] ?? null;
            if ($data['status'] === 'ready') $service->resolution = $data['resolution'];
            $service->save();
            $this->auditService($id, $request->user()->id, $data['status'], $data['status'] === 'ready' ? $data['resolution'] : ($data['note'] ?? ''));
            return response()->json(['success' => true, 'message' => 'Đã cập nhật hồ sơ bảo hành.', 'data' => $service->load(['events', 'warranty.product', 'user:id,full_name'])]);
        }, 3);
    }

    private function auditWarranty(int $id, int $actor, string $action, string $note): void
    {
        $eventId = DB::table('warranty_events')->insertGetId(['warranty_id' => $id, 'actor_id' => $actor, 'action' => $action, 'note' => $note, 'created_at' => now()]);
        \App\Services\StoreNotifier::warranty(Warranty::findOrFail($id), $eventId, $action);
    }

    private function auditService(int $id, int $actor, string $action, string $note): void
    {
        WarrantyServiceEvent::create(['warranty_service_request_id' => $id, 'actor_id' => $actor, 'action' => $action, 'note' => $note, 'created_at' => now()]);
        if ($action !== 'requested') \App\Services\StoreNotifier::service(WarrantyServiceRequest::findOrFail($id));
    }
}
