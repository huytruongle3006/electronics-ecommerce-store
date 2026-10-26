<?php

namespace App\Services;

use App\Models\{Cart, Order, Product, User, Voucher};
use Illuminate\Validation\ValidationException;

class CustomerVoucher
{
    public function money(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    public function cents(mixed $amount): int
    {
        $text = (string) ($amount ?? '0');
        if (!preg_match('/^\d{1,13}(?:\.\d{1,2})?$/D', $text)) {
            $this->fail('Dữ liệu giá không hợp lệ. Vui lòng liên hệ cửa hàng.');
        }
        [$whole, $part] = array_pad(explode('.', $text), 2, '');
        return (int) $whole * 100 + (int) str_pad($part, 2, '0');
    }

    // Checkout holds the user row first, then cart, products in id order and voucher.
    public function cart(User $user, bool $lock = false): array
    {
        $query = Cart::where('user_id', $user->id);
        $cart = ($lock ? $query->lockForUpdate() : $query)->first();
        if (!$cart) $this->fail('Giỏ hàng của bạn đang trống.');
        $query = $cart->items()->orderBy('product_id')->orderBy('id');
        $items = ($lock ? $query->lockForUpdate() : $query)->get();
        if ($items->isEmpty()) $this->fail('Giỏ hàng của bạn đang trống.');
        $query = Product::whereIn('id', $items->pluck('product_id'))->orderBy('id');
        $products = ($lock ? $query->lockForUpdate() : $query)->get()->keyBy('id');
        $total = 0; $lines = [];
        foreach ($items->groupBy('product_id') as $id => $group) {
            $p = $products->get($id); $quantity = $group->sum('quantity');
            if (!$p || $p->status !== 'active') $this->fail('Có sản phẩm đã ngừng bán hoặc bị xóa. Vui lòng kiểm tra giỏ hàng.');
            if ($quantity < 1 || $quantity > 999 || $quantity > $p->quantity) $this->fail("Sản phẩm '{$p->tenSP}' không đủ số lượng. Vui lòng kiểm tra giỏ hàng.");
            $price = $this->cents($p->price);
            // Fit the legacy decimal(15,2) order amount; avoid float/overflow.
            if ($price > intdiv(999999999999999 - $total, $quantity)) $this->fail('Tổng đơn vượt giới hạn cho phép.');
            $total += $price * $quantity;
            $lines[] = [$p->id, $quantity, $this->money($price)];
            foreach ($group as $item) $item->setRelation('product', $p);
        }
        return compact('cart', 'items', 'total', 'lines');
    }

    public function reason(Voucher $v, int $total, int $used): ?string
    {
        if ($v->status !== 'active') return 'Mã giảm giá đã tạm ngưng.';
        if ($v->expired_at && $v->expired_at->lte(now())) return 'Mã giảm giá đã hết hạn.';
        if ($v->quantity < 1) return 'Mã giảm giá đã hết lượt dùng.';
        if ($used >= (int) ($v->per_user_limit ?? 1)) return 'Bạn đã dùng hết lượt của mã này.';
        if ($total < $this->cents($v->min_order_amount)) return 'Đơn hàng cần từ '.number_format((float) $v->min_order_amount, 0, ',', '.').' đ.';
        if ((float) $v->discount_percent <= 0 || (float) $v->discount_percent > 100) return 'Mã giảm giá chưa có mức giảm hợp lệ.';
        return null;
    }

    public function used(int $userId, int $voucherId): int
    {
        return Order::where('user_id', $userId)->where('voucher_id', $voucherId)->where('status', '!=', 'cancelled')->count();
    }

    public function discount(Voucher $v, int $total): int
    {
        $basis = $this->cents($v->discount_percent);
        $discount = intdiv($total, 10000) * $basis + intdiv(($total % 10000) * $basis + 5000, 10000);
        $cap = $this->cents($v->max_discount_amount);
        return min($total, $cap > 0 ? min($discount, $cap) : $discount);
    }

    public function describe(Voucher $v, int $total, int $used): array
    {
        $reason = $this->reason($v, $total, $used);
        return [
            'id' => $v->id, 'code' => $v->maVoucher, 'discount_percent' => $v->discount_percent,
            'max_discount_amount' => $v->max_discount_amount, 'min_order_amount' => $v->min_order_amount,
            'quantity' => $v->quantity, 'expired_at' => $v->expired_at?->toIso8601String(),
            'per_user_limit' => (int) ($v->per_user_limit ?? 1), 'used_count' => $used,
            'remaining_for_user' => max(0, (int) ($v->per_user_limit ?? 1) - $used),
            'eligible' => $reason === null, 'reason' => $reason,
            'estimated_discount' => $this->money($reason ? 0 : $this->discount($v, $total)),
        ];
    }

    public function quote(User $user, array $cart, string $code, bool $lock = false): array
    {
        $query = Voucher::whereRaw('UPPER(maVoucher) = ?', [strtoupper(trim($code))]);
        $v = ($lock ? $query->lockForUpdate() : $query)->first();
        if (!$v) $this->fail('Mã giảm giá không tồn tại.');
        $used = $this->used($user->id, $v->id);
        if ($reason = $this->reason($v, $cart['total'], $used)) $this->fail($reason);
        $discount = $this->discount($v, $cart['total']);
        $signature = hash_hmac('sha256', json_encode([
            $user->id, $cart['lines'], $v->id, $v->maVoucher, $v->discount_percent,
            $v->max_discount_amount, $v->min_order_amount, $v->per_user_limit ?? 1, $v->expired_at?->toIso8601String(),
        ], JSON_THROW_ON_ERROR), (string) config('app.key'));
        return ['voucher' => $this->describe($v, $cart['total'], $used), 'subtotal' => $this->money($cart['total']),
            'discount_amount' => $this->money($discount), 'final_amount' => $this->money($cart['total'] - $discount),
            'quote_token' => $signature, '_model' => $v];
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['voucher_code' => $message]);
    }
}
