import React, { useEffect, useRef, useState } from 'react';
import { getProductReviews } from '../services/api';
import ReviewEditor, { reviewButton, reviewError } from './ReviewEditor';

export default function OrderProductReview({ productId, productName }) {
    const [open, setOpen] = useState(false), [data, setData] = useState(null);
    const [loading, setLoading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
    const sequence = useRef(0);
    const load = async () => {
        const current = ++sequence.current; setLoading(true); setError('');
        try {
            const response = await getProductReviews(productId);
            if (current === sequence.current) setData(response.data.data);
        } catch (error) { if (current === sequence.current) setError(reviewError(error)); }
        finally { if (current === sequence.current) setLoading(false); }
    };
    useEffect(() => {
        if (open) load();
        return () => { sequence.current++; };
    }, [productId, open]);
    return <div style={{ marginTop: 10, fontWeight: 400, minWidth: open ? 260 : undefined }}>
        <button type="button" style={{ ...reviewButton, color: '#2563eb', fontSize: 12 }} aria-expanded={open}
            aria-label={(open ? 'Đóng đánh giá ' : 'Đánh giá sản phẩm ') + productName} onClick={() => setOpen(value => !value)}>
            {open ? 'Đóng phần đánh giá' : 'Đánh giá sản phẩm'}
        </button>
        {open && <section aria-label={'Đánh giá ' + productName}>
            {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
            {error && <p role="alert" style={{ color: '#b91c1c' }}>{error} <button style={reviewButton} onClick={load}>Tải lại quyền đánh giá</button></p>}
            {loading ? <p>Đang tải đánh giá của bạn...</p> : !error && data && (data.can_review
                ? <><p>{data.my_review ? 'Bạn đã đánh giá sản phẩm này. Có thể chỉnh sửa bên dưới.' : 'Chọn số sao và viết nhận xét cho sản phẩm trong đơn này.'}</p>
                    <ReviewEditor productId={productId} review={data.my_review} onSaved={async text => { setMessage(text); await load(); }} /></>
                : <p>Chưa đủ điều kiện đánh giá. Hãy tải lại đơn để kiểm tra trạng thái hiện tại; nếu phiên hết hạn, đăng nhập lại.</p>)}
        </section>}
    </div>;
}
