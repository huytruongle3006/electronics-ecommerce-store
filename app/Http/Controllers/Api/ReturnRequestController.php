<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReturnRequestController extends Controller
{
    public function forOrder(Request $request, int $id)
    {
        $order = Order::whereKey($id)->where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['success' => true, 'data' => ReturnRequest::with('events')->where('order_id', $id)->first(), 'eligibility' => $this->eligibility($order)]);
    }

    private function eligibility(Order $order): array
    {
        if (app(\App\Services\WarrantyPolicy::class)->hasOpenService($order)) return ['eligible' => false, 'message' => 'Đơn đang có hồ sơ bảo hành mở. Vui lòng hoàn tất hồ sơ hoặc liên hệ cửa hàng.'];
        $payment = $order->payment;
        if (!$payment || $payment->payment_status !== 'paid' || (float) $order->final_amount <= 0 || (string) $payment->amount !== (string) $order->final_amount) {
            return ['eligible' => false, 'message' => 'Chỉ hỗ trợ hoàn tiền khi cửa hàng đã xác nhận thanh toán đủ cho đơn. Vui lòng liên hệ cửa hàng nếu cần đối soát.'];
        }
        if ($order->status === 'cancelled') return ['eligible' => true, 'kind' => 'refund_only', 'message' => 'Đơn đã hủy và đã thanh toán: bạn có thể yêu cầu hoàn tiền toàn đơn.'];
        if ($order->status !== 'completed') return ['eligible' => false, 'message' => 'Chỉ hỗ trợ trả hàng sau khi đơn hoàn tất, hoặc hoàn tiền cho đơn đã hủy.'];
        $completedAt = $order->completedAt();
        $deadline = $completedAt->copy()->addDays(7);
        if ($completedAt->isFuture() || now()->greaterThan($deadline)) return ['eligible' => false, 'message' => 'Đơn đã quá thời hạn trả hàng 7 ngày. Vui lòng liên hệ cửa hàng để được hỗ trợ.'];
        return ['eligible' => true, 'kind' => 'return_refund', 'deadline' => $deadline->toIso8601String(), 'message' => 'Yêu cầu trả toàn bộ hàng trong 7 ngày từ khi đơn hoàn tất, hoàn lại số tiền đã trả sau giảm giá.'];
    }

    public function store(Request $request, int $id)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000', 'regex:/\S/u'],
            'evidence_urls' => ['nullable', 'array', 'max:5'],
            'evidence_urls.*' => ['required', 'url:https', 'max:1000'],
            'refund_instructions' => ['nullable', 'string', 'max:1000'],
        ], ['reason.min' => 'Vui lòng mô tả lý do ít nhất 10 ký tự.', 'reason.required' => 'Vui lòng nhập lý do.', 'evidence_urls.*.url' => 'Minh chứng cần là liên kết HTTPS.']);

        return DB::transaction(function () use ($request, $id, $data) {
            $order = Order::whereKey($id)->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            $existing = ReturnRequest::with('events')->where('order_id', $id)->first();
            if ($existing) return response()->json(['success' => true, 'message' => 'Đơn này đã có yêu cầu. Vui lòng theo dõi yêu cầu hiện tại.', 'data' => $existing]);
            $eligibility = $this->eligibility($order);
            if (!$eligibility['eligible']) return response()->json(['success' => false, 'message' => $eligibility['message']], 409);
            $return = ReturnRequest::create([
                'order_id' => $order->id, 'user_id' => $request->user()->id, 'kind' => $eligibility['kind'],
                'status' => 'requested', 'reason' => trim($data['reason']), 'evidence_urls' => $data['evidence_urls'] ?? [],
                'refund_instructions' => $data['refund_instructions'] ?? null, 'amount' => $order->final_amount,
            ]);
            $this->event($return, $request->user()->id, 'requested', 'Khách hàng gửi yêu cầu.');
            return response()->json(['success' => true, 'message' => 'Đã gửi yêu cầu. Cửa hàng sẽ kiểm tra và phản hồi.', 'data' => $return->load('events')], 201);
        }, 3);
    }

    public function index(Request $request)
    {
        $data = $request->validate(['status' => ['nullable', Rule::in(['all', 'requested', 'approved', 'rejected', 'received', 'refunded'])], 'search' => ['nullable', 'string', 'max:100'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = ReturnRequest::with(['order:id,maDH,status', 'user:id,full_name,email'])->orderByDesc('id');
        if (!empty($data['status']) && $data['status'] !== 'all') $query->where('status', $data['status']);
        if (!empty($data['search'])) $query->whereHas('order', fn ($q) => $q->where('maDH', 'like', '%' . $data['search'] . '%'));
        return response()->json(['success' => true, 'data' => $query->paginate(15)]);
    }

    public function show(int $id)
    {
        return response()->json(['success' => true, 'data' => $this->detail(ReturnRequest::findOrFail($id))]);
    }

    public function confirmCod(Request $request, int $id)
    {
        $data = $request->validate([
            'confirmed_collected' => ['required', 'accepted'],
            'reference' => ['required', 'string', 'max:100', 'regex:/\S/u'],
        ]);
        return DB::transaction(function () use ($request, $id, $data) {
            $order = Order::whereKey($id)->lockForUpdate()->firstOrFail();
            $payment = Payment::where('order_id', $id)->lockForUpdate()->first();
            if ($order->status !== 'completed' || !$payment || $payment->payment_method !== 'cod') abort(409, 'Chỉ xác nhận thu COD cho đơn đã hoàn tất.');
            if ($payment->payment_status === 'paid') return response()->json(['success' => true, 'message' => 'Đã xác nhận thu COD trước đó.']);
            if ($payment->payment_status !== 'pending' || (string) $payment->amount !== (string) $order->final_amount) abort(409, 'Thanh toán cần được đối soát.');
            $payment->update(['payment_status' => 'paid', 'paid_at' => now(), 'transaction_code' => trim($data['reference'])]);
            \App\Models\OrderHistory::create([
                'order_id' => $id, 'status_changed' => 'completed', 'changed_by' => $request->user()->id,
                'note' => 'Xác nhận đã thu COD. Chứng từ: ' . trim($data['reference']), 'created_at' => now(),
            ]);
            return response()->json(['success' => true, 'message' => 'Đã xác nhận thu tiền COD.']);
        }, 3);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject', 'receive', 'refund'])],
            'note' => ['nullable', 'string', 'max:1000', 'required_if:action,reject'],
            'restock' => ['required_if:action,receive', 'boolean'],
            'confirmed_received' => ['required_if:action,receive', 'accepted_if:action,receive'],
            'refund_reference' => ['required_if:action,refund', 'nullable', 'string', 'max:100', 'regex:/\S/u'],
            'confirmed_paid_back' => ['required_if:action,refund', 'accepted_if:action,refund'],
        ], ['note.required_if' => 'Vui lòng nhập lý do từ chối.', 'confirmed_paid_back.accepted_if' => 'Cần xác nhận đã thực hiện hoàn tiền thực tế.', 'refund_reference.required_if' => 'Vui lòng nhập mã giao dịch hoặc chứng từ hoàn tiền.']);

        return DB::transaction(function () use ($request, $id, $data) {
            $identity = ReturnRequest::findOrFail($id);
            $order = Order::whereKey($identity->order_id)->lockForUpdate()->firstOrFail();
            $return = ReturnRequest::whereKey($id)->lockForUpdate()->firstOrFail();
            $action = $data['action'];
            $target = ['approve' => 'approved', 'reject' => 'rejected', 'receive' => 'received', 'refund' => 'refunded'][$action];
            if ($return->status === $target) return response()->json(['success' => true, 'message' => 'Yêu cầu đã được xử lý trước đó.', 'data' => $this->detail($return)]);
            $valid = match ($action) {
                'approve', 'reject' => $return->status === 'requested',
                'receive' => $return->status === 'approved' && $return->kind === 'return_refund',
                'refund' => ($return->kind === 'refund_only' && $return->status === 'approved') || ($return->kind === 'return_refund' && $return->status === 'received'),
            };
            if (!$valid) return response()->json(['success' => false, 'message' => 'Trạng thái đã thay đổi hoặc thao tác chưa đúng trình tự. Vui lòng tải lại yêu cầu.'], 409);

            if ($action === 'receive') {
                if (!isset($data['restock'])) abort(422);
                if ($data['restock']) {
                    foreach ($order->details()->orderBy('product_id')->get() as $item) {
                        $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                        if (!$product || (int) $product->quantity + $item->quantity > 2147483647) abort(409, 'Không thể nhập lại hàng vào kho.');
                        $product->increment('quantity', $item->quantity);
                    }
                }
                $return->received_at = now(); $return->received_by = $request->user()->id; $return->restocked = (bool) $data['restock'];
            }
            if ($action === 'refund') {
                $payment = Payment::where('order_id', $order->id)->lockForUpdate()->first();
                if (!$payment || $payment->payment_status !== 'paid' || (string) $payment->amount !== (string) $return->amount) abort(409, 'Thanh toán cần được đối soát trước khi ghi nhận hoàn tiền.');
                $payment->update(['payment_status' => 'refunded']);
                $return->refunded_at = now(); $return->refunded_by = $request->user()->id; $return->refund_reference = trim($data['refund_reference']);
            }
            $return->status = $target;
            $return->admin_note = $data['note'] ?? null;
            $return->save();
            $note = $data['note'] ?? '';
            if ($action === 'receive') $note .= $return->restocked ? ' Đã nhận đủ hàng, nhập lại kho.' : ' Đã nhận đủ hàng, không nhập lại kho bán.';
            if ($action === 'refund') $note .= ' Chứng từ hoàn tiền: ' . $return->refund_reference;
            $this->event($return, $request->user()->id, $target, trim($note));
            return response()->json(['success' => true, 'message' => 'Đã cập nhật yêu cầu.', 'data' => $this->detail($return)]);
        }, 3);
    }

    private function detail(ReturnRequest $return): ReturnRequest
    {
        return $return->load(['order.details.product', 'order.payment', 'user:id,full_name,email,phone', 'events']);
    }

    private function event(ReturnRequest $return, int $actor, string $action, string $note): void
    {
        ReturnRequestEvent::create(['return_request_id' => $return->id, 'actor_id' => $actor, 'action' => $action, 'note' => $note, 'created_at' => now()]);
    }
}
