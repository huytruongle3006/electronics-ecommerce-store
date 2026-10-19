import FavoriteButton from './FavoriteButton';
import ProductReviews from './ProductReviews';
import React, { useState, useEffect } from 'react';
import {
    X, ShoppingCart, ShieldCheck, Star, Truck, RefreshCw
} from 'lucide-react';
import { getProductDetail } from '../services/api';

export default function ProductDetailModal({ productId, isOpen, onClose, onAddToCart, user, onOpenAuth, isFavorite, favoriteBusy, onToggleFavorite }) {


    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    const [reviewsData, setReviewsData] = useState({ avg_rating: 0, total_reviews: 0, loaded: false });
    const [loadError, setLoadError] = useState('');
    useEffect(() => {
        if (!isOpen || !productId) return;
        let active = true;
        setLoading(true); setLoadError(''); setQuantity(1); setProduct(null);
        setReviewsData({ avg_rating: 0, total_reviews: 0, loaded: false });
        getProductDetail(productId).then(response => { if (active) setProduct(response.data.data); })
            .catch(() => { if (active) setLoadError('Không tải được sản phẩm. Vui lòng đóng và thử lại.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [productId, isOpen]);

    if (!isOpen || !productId) return null;

    if (loading || loadError) {
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#fff', padding: '30px 40px', borderRadius: '12px', fontWeight: 600, color: '#334155' }}>
                    <p role={loadError ? 'alert' : 'status'}>{loadError || 'Đang tải thông số sản phẩm...'}</p>
                    <button onClick={onClose}>Đóng</button>
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

                <div style={{ padding: '12px 24px 0' }}><FavoriteButton saved={isFavorite} disabled={favoriteBusy} onClick={() => onToggleFavorite?.(product)} /></div>
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
                                    {!reviewsData.loaded ? 'Chưa tải điểm đánh giá' : reviewsData.total_reviews ? reviewsData.avg_rating + ' / 5' : 'Chưa có đánh giá'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {reviewsData.loaded ? '(' + reviewsData.total_reviews + ' đánh giá)' : ''}
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
                                    onClick={async () => { if (await onAddToCart(product, quantity)) onClose(); }}
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

                    <ProductReviews key={productId + ':' + (user?.id || 'guest')} productId={productId} user={user}
                        onOpenAuth={() => { onClose(); onOpenAuth(); }} onSummary={data => setReviewsData({ ...data, loaded: true })} />
                </div>
            </div>
        </div>
    );
}
