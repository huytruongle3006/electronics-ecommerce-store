import React, { useEffect, useRef, useState } from 'react';
import { submitReviewApi, updateReviewApi, deleteReviewApi } from '../services/api';

export const reviewButton = { padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' };
export const reviewError = error => error.response?.status === 401
    ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
    : Object.values(error.response?.data?.errors || {}).flat().join(' ') || error.response?.data?.message || 'Không thực hiện được. Hãy thử lại.';

export default function ReviewEditor({ productId, review, onSaved, onCancel }) {
    const [rating, setRating] = useState(review?.rating || 5);
    const [comment, setComment] = useState(review?.comment || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const pending = useRef(false);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { setRating(review?.rating || 5); setComment(review?.comment || ''); setConfirmDelete(false); }, [review?.id, review?.rating, review?.comment]);

    const save = async (event, removing = false) => {
        event?.preventDefault();
        if (pending.current) return;
        setError('');
        if (!removing && (comment.trim().length < 3 || comment.trim().length > 1000)) {
            setError('Nhận xét cần từ 3 đến 1000 ký tự.'); return;
        }
        pending.current = true; setBusy(true);
        try {
            const data = { rating: Number(rating), comment: comment.trim() };
            if (removing) await deleteReviewApi(review.id);
            else if (review) await updateReviewApi(review.id, data);
            else await submitReviewApi(productId, data);
            if (alive.current) {
                if (!review) setComment('');
                setConfirmDelete(false);
                await onSaved(removing ? 'Đã xóa đánh giá.' : 'Đã lưu đánh giá.');
            }
        } catch (error) { if (alive.current) setError(reviewError(error)); }
        finally { pending.current = false; if (alive.current) setBusy(false); }
    };

    return <div style={{ background: '#f8fafc', padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, margin: '12px 0' }}>
        <form onSubmit={save} aria-label={review ? 'Sửa đánh giá' : 'Viết đánh giá'}>
            <label style={{ display: 'block', marginBottom: 12 }}>Số sao{' '}
                <select name="review_rating" value={rating} disabled={busy} onChange={event => setRating(event.target.value)} style={reviewButton}>
                    {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}
                </select>
            </label>
            <label>Nhận xét
                <textarea name="review_comment" rows={3} minLength={3} maxLength={1000} required disabled={busy} value={comment}
                    onChange={event => setComment(event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', margin: '6px 0', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </label>
            <small>{comment.length}/1000 ký tự</small>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button style={{ ...reviewButton, background: '#2563eb', color: '#fff' }} disabled={busy} type="submit">{busy ? 'Đang xử lý...' : review ? 'Lưu thay đổi' : 'Gửi đánh giá'}</button>
                {onCancel && <button style={reviewButton} disabled={busy} type="button" onClick={onCancel}>Đóng chỉnh sửa</button>}
                {review && <button style={{ ...reviewButton, color: '#b91c1c' }} type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Xóa đánh giá</button>}
            </div>
        </form>
        {confirmDelete && <div style={{ marginTop: 12 }} role="group" aria-label="Xác nhận xóa đánh giá">
            <p>Xóa đánh giá này? Nội dung sẽ không còn hiển thị công khai.</p>
            <button style={{ ...reviewButton, color: '#b91c1c' }} disabled={busy} onClick={() => save(null, true)}>Xác nhận xóa</button>{' '}
            <button style={reviewButton} disabled={busy} onClick={() => setConfirmDelete(false)}>Giữ đánh giá</button>
        </div>}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    </div>;
}
