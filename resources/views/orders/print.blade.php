<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="no-referrer">
    <meta http-equiv="Content-Security-Policy" content="{{ $policy }}">
    <title>Phiếu đơn hàng {{ $order->maDH }}</title>
    <style nonce="{{ $nonce }}">
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #edf2f7; color: #172033; font-family: Arial, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.55; }
        .tools { max-width: 830px; margin: 18px auto; padding: 0 18px; }
        button { padding: 10px 16px; border: 1px solid #b8c6d9; border-radius: 7px; background: white; color: #1d4ed8; cursor: pointer; font: inherit; }
        .sheet { width: calc(100% - 32px); max-width: 830px; margin: 18px auto; padding: 34px; background: white; border: 1px solid #d8e1ec; }
        header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; }
        h1 { font-size: 24px; margin: 22px 0 8px; text-align: center; }
        h2 { font-size: 15px; margin: 18px 0 8px; }
        p { margin: 4px 0; }
        .muted, small { color: #59677b; }
        .brand { font-size: 21px; font-weight: bold; color: #1d4ed8; }
        .fields { border: 1px solid #d8e1ec; border-radius: 7px; padding: 12px; margin-top: 12px; overflow-wrap: anywhere; }
        .cancelled { border: 2px solid #b91c1c; padding: 10px; color: #991b1b; margin-top: 14px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; table-layout: fixed; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; overflow-wrap: anywhere; }
        th { background: #eef4ff; text-align: left; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .name { width: 36%; }
        .qty { width: 10%; }
        .amount { width: 27%; }
        .totals { margin: 16px 0 16px auto; max-width: 360px; break-inside: avoid; }
        .totals p { display: flex; justify-content: space-between; gap: 16px; }
        .total { border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 8px; font-size: 16px; font-weight: bold; }
        .note { white-space: pre-wrap; overflow-wrap: anywhere; }
        footer { border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 22px; font-size: 11px; color: #59677b; }
        @media print {
            body { background: white; }
            .tools { display: none !important; }
            .sheet { margin: 0; border: 0; padding: 0; width: 100%; max-width: none; }
            thead { display: table-header-group; }
            tr, .fields, .cancelled { break-inside: avoid; }
        }
        @media screen and (max-width: 600px) { .sheet { padding: 16px; } th,td { padding: 5px; font-size: 11px; } }
    </style>
</head>
@php
    $money = fn ($value) => number_format((float) $value, 2, ',', '.') . ' đ';
    $stamp = fn ($value) => $value?->copy()->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i') ?? 'Chưa ghi nhận';
    $status = ['pending'=>'Chờ xác nhận','confirmed'=>'Đã xác nhận','shipping'=>'Đang giao','completed'=>'Hoàn tất','cancelled'=>'Đã hủy'][$order->status] ?? 'Chưa xác định';
    $payment = $order->payment;
    $paymentStatus = ['pending'=>'Chưa xác nhận thanh toán','paid'=>'Đã ghi nhận thanh toán','refunded'=>'Đã ghi nhận hoàn tiền','failed'=>'Thanh toán thất bại'][$payment?->payment_status ?? ''] ?? 'Chưa có thông tin';
    $method = ['cod'=>'Thanh toán khi nhận hàng (COD)','bank_transfer'=>'Chuyển khoản ngân hàng','vnpay'=>'VNPAY','momo'=>'MoMo'][$payment?->payment_method ?? ''] ?? 'Chưa có thông tin';
@endphp
<body>
    <div class="tools"><button id="print-order" type="button">In / Lưu PDF</button> <button id="close-order" type="button">Đóng phiếu</button>
        <p class="muted">Trong hộp thoại in, chọn “Lưu dưới dạng PDF” để lưu file. Có thể tắt đầu trang/chân trang của trình duyệt.</p>
    </div>
    <main class="sheet">
        <header>
            <div class="brand">{{ $store->get('store_name') ?: 'TECHSTORE' }}</div>
            @if(!empty($store['store_address']))<p>{{ $store['store_address'] }}</p>@endif
            @if(!empty($store['store_phone']))<p>Điện thoại: {{ $store['store_phone'] }}</p>@endif
            @if(!empty($store['store_email']))<p>Email: {{ $store['store_email'] }}</p>@endif
        </header>
        <h1>PHIẾU THÔNG TIN ĐƠN HÀNG</h1>
        <p><strong>Mã đơn:</strong> {{ $order->maDH }}</p>
        <p><strong>Ngày đặt:</strong> {{ $stamp($order->created_at) }} (giờ Việt Nam)</p>
        <p><strong>Trạng thái đơn:</strong> {{ $status }}</p>
        @if($order->status === 'cancelled')<div class="cancelled">ĐƠN ĐÃ HỦY — Phiếu chỉ dùng để tra cứu thông tin đơn cũ.</div>@endif
        <section class="fields">
            <h2>Thông tin người nhận</h2>
            <p><strong>Họ tên:</strong> {{ $order->recipient_name }}</p>
            <p><strong>Số điện thoại:</strong> {{ $order->recipient_phone }}</p>
            <p><strong>Địa chỉ giao hàng:</strong> {{ $order->shipping_address }}</p>
        </section>
        <h2>Sản phẩm trong đơn</h2>
        <table>
            <thead><tr><th class="name">Sản phẩm</th><th class="qty num">SL</th><th class="amount num">Đơn giá đã đặt</th><th class="amount num">Thành tiền</th></tr></thead>
            <tbody>
                @forelse($order->details as $item)
                    <tr><td>{{ $item->product?->tenSP ?? ('Sản phẩm #' . $item->product_id . ' (không còn trong danh mục)') }}
                        @if($item->product?->maSP)<br><small>Mã SP: {{ $item->product->maSP }}</small>@endif</td>
                        <td class="num">{{ $item->quantity }}</td><td class="num">{{ $money($item->price) }}</td><td class="num">{{ $money($item->total_line) }}</td></tr>
                @empty<tr><td colspan="4">Đơn hàng chưa có chi tiết sản phẩm.</td></tr>@endforelse
            </tbody>
        </table>
        <section class="totals" aria-label="Tổng tiền">
            <p><span>Tạm tính:</span><strong>{{ $money($order->total_amount) }}</strong></p>
            <p><span>Giảm giá đã ghi nhận:</span><strong>-{{ $money($order->discount_amount) }}</strong></p>
            <p class="total"><span>Tổng tiền của đơn:</span><span>{{ $money($order->final_amount) }}</span></p>
        </section>
        <section class="fields">
            <h2>Thanh toán và vận chuyển</h2>
            <p><strong>Phương thức thanh toán:</strong> {{ $method }}</p>
            <p><strong>Trạng thái thanh toán theo hệ thống:</strong> {{ $paymentStatus }}</p>
            <p><strong>Đơn vị vận chuyển:</strong> {{ $order->carrier_name ?: 'Chưa cập nhật' }}</p>
            <p><strong>Mã vận đơn:</strong> {{ $order->tracking_number ?: 'Chưa cập nhật' }}</p>
            <p><strong>Dự kiến giao:</strong> {{ $order->estimated_delivery_date?->format('d/m/Y') ?? 'Chưa cập nhật' }}</p>
            @if($order->delivered_at)<p><strong>Ghi nhận giao thành công:</strong> {{ $stamp($order->delivered_at) }}</p>@endif
        </section>
        @if($order->note)<section><h2>Ghi chú đơn hàng</h2><p class="note">{{ $order->note }}</p></section>@endif
        <footer>
            <p>Phiếu thông tin đơn hàng, không thay thế hóa đơn điện tử hoặc biên nhận thu tiền.</p>
            <p>Số lượng, đơn giá và tổng tiền lấy từ đơn đã lưu. Tên/mã sản phẩm và liên hệ cửa hàng theo thông tin hiện tại. Thời gian và trạng thái được cập nhật khi tải phiếu.</p>
            <p>Không tự tính thêm thuế/phí hoặc đổi trạng thái đơn khi in.</p>
        </footer>
    </main>
    <script nonce="{{ $nonce }}">
        document.getElementById('print-order').addEventListener('click', function () { window.print(); });
        document.getElementById('close-order').addEventListener('click', function () { window.close(); });
    </script>
</body>
</html>
