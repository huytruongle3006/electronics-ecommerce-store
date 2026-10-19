import React, { useEffect, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';

const button = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' };

export default function WishlistModal({ wishlist, onClose, onViewDetail, onAddToCart }) {
    const [adding, setAdding] = useState(null);
    const [message, setMessage] = useState('');
    const closeButton = useRef(null);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        const escape = event => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', escape);
        return () => { mounted.current = false; document.body.style.overflow = overflow; document.removeEventListener('keydown', escape); previous?.focus(); };
    }, []);

    const add = async product => {
        setAdding(product.id); setMessage('');
        const success = await onAddToCart(product);
        if (mounted.current) {
            setAdding(null);
            if (success) setMessage('Đã thêm ' + product.tenSP + ' vào giỏ hàng.');
        }
    };

    return <div style={{ position: 'fixed', inset: 0, zIndex: 65, padding: 16, background: '#0f172aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <section role="dialog" aria-modal="true" aria-labelledby="wishlist-title" onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <h2 id="wishlist-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Heart color="#be123c" /> Sản phẩm yêu thích ({wishlist.items.length})</h2>
                <button ref={closeButton} style={button} onClick={onClose} aria-label="Đóng danh sách yêu thích"><X size={20} /></button>
            </div>
            <p style={{ color: '#64748b' }}>Lưu tối đa 200 sản phẩm theo tài khoản. Giá và tồn kho được cập nhật khi mở danh sách.</p>
            <div role="status" style={{ color: '#15803d' }}>{message}</div>
            {wishlist.error && <p role="alert">{wishlist.error} <button style={button} onClick={wishlist.reload}>Thử lại</button></p>}
            {wishlist.loading ? <p role="status">Đang tải danh sách yêu thích...</p> : !wishlist.error && wishlist.items.length === 0 ? <p>Bạn chưa lưu sản phẩm nào. Bấm biểu tượng trái tim trên sản phẩm để lưu tại đây.</p> :
                wishlist.items.map(item => {
                    const product = item.product;
                    return <article key={item.product_id} style={{ borderTop: '1px solid #e2e8f0', padding: '18px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: '1 1 240px' }}>
                            <strong>{product?.tenSP || 'Sản phẩm không còn được mở bán'}</strong>
                            {product && <><p style={{ margin: '8px 0', color: '#dc2626', fontWeight: 700 }}>{Number(product.price).toLocaleString('vi-VN')} đ</p><span>{product.quantity > 0 ? `Còn ${product.quantity} sản phẩm` : 'Tạm hết hàng'}</span></>}
                        </div>
                        {product && <button style={button} onClick={() => onViewDetail(product.id)}>Xem chi tiết</button>}
                        {product && <button style={{ ...button, color: '#fff', background: '#2563eb', opacity: product.quantity <= 0 ? 0.5 : 1 }} disabled={product.quantity <= 0 || adding !== null || wishlist.loading}
                            onClick={() => add(product)}>{adding === product.id ? 'Đang thêm...' : 'Thêm vào giỏ'}</button>}
                        <button style={{ ...button, color: '#be123c' }} disabled={wishlist.busy || wishlist.loading || !!wishlist.error} onClick={() => { setMessage(''); wishlist.toggle({ id: item.product_id }); }}>Bỏ yêu thích</button>
                    </article>;
                })}
        </section>
    </div>;
}
