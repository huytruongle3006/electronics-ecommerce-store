import React, { useState } from 'react';
export default function CartSyncNotice({ cart }) {
    const [confirm, setConfirm] = useState(false);
    if (!cart.error && !cart.info && !cart.remaining.length && !cart.busy) return null;
    const button = { padding: '7px 11px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', cursor: 'pointer', marginRight: 8 };
    return <div style={{ padding: 14, border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fbff', fontSize: 13, margin: '12px 0' }}>
        {cart.busy && <p role="status">Đang đồng bộ giỏ hàng...</p>}
        {cart.error && <p role="alert" style={{ color: '#b91c1c' }}>{cart.error}</p>}
        {!cart.busy && cart.info && <p role="status">{cart.info}</p>}
        {cart.remaining.length > 0 && <><strong>Các món vẫn được giữ, chưa thêm vào giỏ tài khoản:</strong><ul>{cart.remaining.map(item => <li key={item.id}>{item.product.tenSP} × {item.quantity}</li>)}</ul><button style={button} disabled={cart.busy} onClick={cart.load}>Thử gộp lại</button><button style={button} disabled={cart.busy} onClick={() => setConfirm(true)}>Bỏ các món chưa gộp</button>
            {confirm && <p>Bỏ các món đang giữ? <button style={button} disabled={cart.busy} onClick={() => { cart.discardRemaining(); setConfirm(false); }}>Xác nhận bỏ</button><button style={button} onClick={() => setConfirm(false)}>Tiếp tục giữ</button></p>}</>}
        {cart.error && !cart.remaining.length && <button style={button} disabled={cart.busy} onClick={cart.load}>Tải lại giỏ</button>}
    </div>;
}
