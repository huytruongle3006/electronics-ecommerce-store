import React, { useEffect, useRef, useState } from 'react';
import { getProductReviews } from '../services/api';
import ReviewEditor, { reviewButton, reviewError } from './ReviewEditor';

export default function ProductReviews({ productId, user, onOpenAuth, onSummary }) {
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const requestId = useRef(0);
    const load = async (targetPage = page) => {
        const request = ++requestId.current;
        setLoading(true); setError('');
        try {
            const response = await getProductReviews(productId, { page: targetPage, ...(filter ? { rating: filter } : {}) });
            if (request !== requestId.current) return;
            const result = response.data.data;
            if (targetPage > result.pagination.last_page) { setPage(result.pagination.last_page); return; }
            setData(result); onSummary?.(result);
        } catch (error) { if (request === requestId.current) setError(reviewError(error)); }
        finally { if (request === requestId.current) setLoading(false); }
    };
    useEffect(() => { load(); return () => { requestId.current++; }; }, [productId, user?.id, page, filter]);

    return <section aria-label="Đánh giá sản phẩm" style={{ marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
        <h3>Đánh giá & nhận xét từ khách hàng</h3>
        {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error} <button style={reviewButton} onClick={() => load()}>Tải lại đánh giá</button></p>}
        {loading ? <p role="status">Đang tải đánh giá...</p> : !error && data && <>
            {!user ? <button style={reviewButton} onClick={onOpenAuth}>Đăng nhập để đánh giá</button>
                : data.can_review ? <div><strong>{data.my_review ? 'Đánh giá của bạn' : 'Đơn của bạn đã được xác nhận. Hãy chia sẻ nhận xét!'}</strong>
                    <ReviewEditor productId={productId} review={data.my_review}
                        onSaved={async text => { setMessage(text); if (page !== 1) setPage(1); else await load(1); }} />
                </div> : <p>Chỉ khách có đơn đã xác nhận, đang giao hoặc hoàn tất chứa sản phẩm này mới được viết đánh giá.</p>}
            <label>Lọc theo số sao{' '}
                <select aria-label="Lọc theo số sao" style={reviewButton} value={filter} onChange={event => { setPage(1); setFilter(event.target.value); }}>
                    <option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}
                </select>
            </label>
            {data.reviews.length === 0 && <p>{filter ? 'Chưa có đánh giá phù hợp bộ lọc.' : 'Chưa có đánh giá nào.'}</p>}
            {data.reviews.map(review => <article key={review.id} style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0' }}>
                <strong>{review.user?.full_name || 'Khách hàng'}</strong>{' · '}{review.rating}/5 sao
                {review.verified_purchase && <span style={{ marginLeft: 8, color: '#15803d' }}>✓ Đã mua hàng</span>}
                <small style={{ display: 'block', color: '#64748b', marginTop: 6 }}>{review.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN') : ''}</small>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{review.comment}</p>
            </article>)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <button style={reviewButton} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button>
                <span>Trang {data.pagination.current_page}/{data.pagination.last_page} · {data.pagination.total} nhận xét</span>
                <button style={reviewButton} disabled={page >= data.pagination.last_page} onClick={() => setPage(value => value + 1)}>Trang sau</button>
            </div>
        </>}
    </section>;
}
