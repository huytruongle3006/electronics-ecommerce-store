import React, { useEffect, useRef, useState } from 'react';
import { getMyReviewsApi } from '../services/api';
import ReviewEditor, { reviewButton, reviewError } from './ReviewEditor';

export default function MyReviewsModal({ onClose, onViewProduct }) {
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [editing, setEditing] = useState(null);
    const requestId = useRef(0);
    const close = useRef(null);
    const load = async () => {
        const request = ++requestId.current;
        setLoading(true); setError('');
        try {
            const response = await getMyReviewsApi(page);
            if (request !== requestId.current) return;
            const result = response.data.data;
            if (page > result.last_page) { setPage(result.last_page); return; }
            setData(result);
        } catch (error) { if (request === requestId.current) setError(reviewError(error)); }
        finally { if (request === requestId.current) setLoading(false); }
    };
    useEffect(() => { load(); return () => { requestId.current++; }; }, [page]);
    useEffect(() => {
        const previous = document.activeElement, overflow = document.body.style.overflow;
        close.current?.focus(); document.body.style.overflow = 'hidden';
        const escape = event => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', escape);
        return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', escape); previous?.focus(); };
    }, []);

    return <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: '#0f172aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="my-reviews-title" onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const elements = [...event.currentTarget.querySelectorAll('button:not(:disabled),textarea:not(:disabled),select:not(:disabled)')];
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <h2 id="my-reviews-title" style={{ marginTop: 0 }}>Đánh giá của tôi</h2>
                <button ref={close} style={reviewButton} onClick={onClose}>Đóng</button>
            </div>
            {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
            {error && <p role="alert">{error} <button style={reviewButton} onClick={load}>Thử lại</button></p>}
            {loading ? <p role="status">Đang tải đánh giá...</p> : !error && data && <>
                {data.data.length === 0 && <p>Bạn chưa viết đánh giá nào. Mở chi tiết đơn đã xác nhận hoặc hoàn tất, rồi bấm Đánh giá sản phẩm.</p>}
                {data.data.map(review => <article key={review.id} style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <strong>{review.product?.tenSP || 'Sản phẩm không còn tồn tại'}</strong>{' · '}{review.rating}/5 sao
                    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{review.comment}</p>
                    {editing === review.id ? <ReviewEditor review={review} onCancel={() => setEditing(null)}
                        onSaved={async text => { setMessage(text); setEditing(null); await load(); }} />
                        : <button style={reviewButton} onClick={() => setEditing(review.id)}>Sửa hoặc xóa đánh giá</button>}
                    {review.product && <button style={{ ...reviewButton, marginLeft: 8 }} onClick={() => onViewProduct(review.product.id)}>Xem sản phẩm</button>}
                </article>)}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                    <button style={reviewButton} disabled={page <= 1} onClick={() => { setEditing(null); setPage(value => value - 1); }}>Trang trước</button>
                    <span>Trang {data.current_page}/{data.last_page} · {data.total} đánh giá</span>
                    <button style={reviewButton} disabled={page >= data.last_page} onClick={() => { setEditing(null); setPage(value => value + 1); }}>Trang sau</button>
                </div>
            </>}
        </section>
    </div>;
}
