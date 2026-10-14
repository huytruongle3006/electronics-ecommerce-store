import React, { useState, useEffect } from 'react';
import {
    X, ShoppingCart, ShieldCheck, Star, Truck, RefreshCw, Send, MessageSquare
} from 'lucide-react';
import { getProductDetail, getProductReviews, submitReviewApi } from '../services/api';

export default function ProductDetailModal({ productId, isOpen, onClose, onAddToCart, user, onOpenAuth }) {
    if (!isOpen || !productId) return null;

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    // State Quản lý Đánh giá
    const [reviewsData, setReviewsData] = useState({ reviews: [], avg_rating: 5, total_reviews: 0 });
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        setLoading(true);
        setQuantity(1);
        setReviewMsg({ type: '', text: '' });
        setComment('');

        Promise.all([
            getProductDetail(productId),
            getProductReviews(productId).catch(() => ({ data: { data: { reviews: [], avg_rating: 5, total_reviews: 0 } } }))
        ])
            .then(([prodRes, reviewRes]) => {
                setProduct(prodRes.data.data);
                if (reviewRes.data?.data) {
                    setReviewsData(reviewRes.data.data);
                }
            })
            .catch((err) => console.error('Lỗi nạp thông tin:', err))
            .finally(() => setLoading(false));
    }, [productId]);

    const handleSendReview = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmittingReview(true);
        setReviewMsg({ type: '', text: '' });

        try {
            const res = await submitReviewApi(productId, { rating, comment });
            if (res.data.success) {
                setReviewMsg({ type: 'success', text: 'Cảm ơn bạn đã gửi đánh giá!' });
                setComment('');
                // Nạp lại danh sách đánh giá
                const updated = await getProductReviews(productId);
                setReviewsData(updated.data.data);
            }
        } catch (err) {
            setReviewMsg({ type: 'error', text: err.response?.data?.message || 'Không thể gửi đánh giá, vui lòng thử lại!' });
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#fff', padding: '30px 40px', borderRadius: '12px', fontWeight: 600, color: '#334155' }}>
                    Đang tải thông số sản phẩm...
                </div>
            </div>
        );
    }

    if (!product) return null;

    let specs = product.specifications;
    if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '880px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                            {product.category?.tenLoai || 'Thiết bị điện tử'}
                        </span>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
                            {product.tenSP}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
                        <X size={22} color="#64748b" />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
                        {/* Cột trái: Ảnh & Chính sách */}
                        <div>
                            <div style={{ height: '220px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem' }}>
                                💻
                            </div>

                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                                    <ShieldCheck size={18} color="#2563eb" />
                                    <span>Bảo hành chính hãng <strong>{product.warranty_months} tháng</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                                    <Truck size={18} color="#16a34a" />
                                    <span>Miễn phí vận chuyển toàn quốc</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                                    <RefreshCw size={18} color="#ea580c" />
                                    <span>Lỗi 1 đổi 1 trong 30 ngày đầu</span>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải: Giá bán & Cấu hình */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>

                            {/* Sao trung bình */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={16}
                                            color="#f59e0b"
                                            fill={star <= Math.round(reviewsData.avg_rating) ? '#f59e0b' : 'none'}
                                        />
                                    ))}
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                                    {reviewsData.avg_rating} / 5
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    ({reviewsData.total_reviews} đánh giá)
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>
                                    {Number(product.price).toLocaleString('vi-VN')} đ
                                </span>
                                <span style={{ fontSize: '0.85rem', color: product.quantity > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                    {product.quantity > 0 ? `(Còn ${product.quantity} cái)` : '(Hết hàng)'}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
                                {product.description || 'Sản phẩm chính hãng với hiệu năng ổn định, đáp ứng hoàn hảo cho mọi nhu cầu công việc và giải trí.'}
                            </p>

                            {/* Thông số kỹ thuật */}
                            {specs && Object.keys(specs).length > 0 && (
                                <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.825rem' }}>
                                        {Object.entries(specs).map(([key, val]) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '3px' }}>
                                                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{key}:</span>
                                                <strong style={{ color: '#0f172a' }}>{val}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Nút đặt hàng */}
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                    <span style={{ width: '32px', textAlign: 'center', fontWeight: 700 }}>{quantity}</span>
                                    <button onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                </div>

                                <button
                                    onClick={() => { onAddToCart(product, quantity); onClose(); }}
                                    disabled={product.quantity <= 0}
                                    style={{
                                        flex: 1, padding: '11px', backgroundColor: product.quantity > 0 ? '#2563eb' : '#94a3b8',
                                        color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                                        cursor: product.quantity > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <ShoppingCart size={16} />
                                    Thêm vào giỏ
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* KHỐI ĐÁNH GIÁ SẢN PHẨM (REVIEWS) */}
                    {/* KHỐI ĐÁNH GIÁ SẢN PHẨM (REVIEWS) */}
                    <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <MessageSquare size={20} color="#2563eb" />
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                                Đánh giá & Nhận xét từ khách hàng
                            </h3>
                        </div>

                        {/* Điều kiện 1: Chưa đăng nhập */}
                        {!user ? (
                            <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                                    Đăng nhập để xem quyền đánh giá sản phẩm.
                                </span>
                                <button
                                    onClick={() => { onClose(); onOpenAuth(); }}
                                    style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Đăng nhập ngay
                                </button>
                            </div>
                        ) : reviewsData.can_review ? (
                            /* Điều kiện 2: Đã đăng nhập VÀ ĐÃ MUA HÀNG THÀNH CÔNG -> Hiện form đánh giá */
                            <form onSubmit={handleSendReview} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                                    <span>✓ Bạn đã mua sản phẩm này. Hãy chia sẻ cảm nhận của bạn!</span>
                                </div>

                                {/* Chọn số sao tương tác */}
                                <div style={{ display: 'flex', gap: '4px', margin: '8px 0 12px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                        >
                                            <Star
                                                size={22}
                                                color="#f59e0b"
                                                fill={(hoverRating || rating) >= star ? '#f59e0b' : 'none'}
                                            />
                                        </button>
                                    ))}
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginLeft: '8px', alignSelf: 'center' }}>
                                        {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Rất tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Kém' : 'Rất tệ'}
                                    </span>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        rows="3"
                                        required
                                        placeholder="Chia sẻ cảm nhận về chất lượng thiết bị, độ mượt, đóng gói..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                                    />
                                </div>

                                {reviewMsg.text && (
                                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: reviewMsg.type === 'success' ? '#16a34a' : '#b91c1c' }}>
                                        {reviewMsg.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    style={{
                                        marginTop: '10px', padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff',
                                        border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem',
                                        cursor: submittingReview ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <Send size={14} />
                                    {submittingReview ? 'Đang gửi...' : 'Gửi nhận xét'}
                                </button>
                            </form>
                        ) : (
                            /* Điều kiện 3: Đã đăng nhập nhưng CHƯA MUA sản phẩm này (hoặc đơn chưa hoàn thành) */
                            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px dashed #cbd5e1', marginBottom: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                                💡 Chỉ những khách hàng đã mua và nhận hàng thành công sản phẩm này mới có thể để lại đánh giá.
                            </div>
                        )}

                        {/* Danh sách bình luận công khai bên dưới */}
                        {reviewsData.reviews.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.875rem' }}>
                                Chưa có nhận xét nào từ người mua.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {reviewsData.reviews.map(r => (
                                    <div key={r.id} style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', backgroundColor: '#fcfcfd' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#334155' }}>
                                                    {r.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                                                    {r.user?.full_name || 'Khách hàng'}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                    Đã mua hàng
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {new Date(r.created_at).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} size={14} color="#f59e0b" fill={s <= r.rating ? '#f59e0b' : 'none'} />
                                            ))}
                                        </div>

                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                                            {r.comment}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    );
}