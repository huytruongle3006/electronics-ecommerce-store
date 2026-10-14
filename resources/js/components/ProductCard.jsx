import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ProductCard({ product, onAddToCart, onViewDetail }) {
  let specs = product.specifications;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
  }

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      cursor: 'pointer'
    }}>
      {/* Vùng click xem chi tiết */}
      <div onClick={() => onViewDetail(product.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Hình ảnh & Tag */}
        <div style={{ position: 'relative', height: '180px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '3.5rem' }}>💻</div>
          
          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
            BH {product.warranty_months} Tháng
          </span>

          <span style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: product.quantity > 0 ? '#dcfce7' : '#fee2e2', color: product.quantity > 0 ? '#15803d' : '#b91c1c', fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}>
            {product.quantity > 0 ? `Còn ${product.quantity}` : 'Hết hàng'}
          </span>
        </div>

        {/* Nội dung */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{product.maSP}</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0 8px 0', lineHeight: 1.4, height: '42px', overflow: 'hidden' }}>
            {product.tenSP}
          </h3>

          {specs && Object.keys(specs).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0 14px' }}>
              {specs.cpu && <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#475569' }}>⚙️ {specs.cpu}</span>}
              {specs.ram && <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#475569' }}>💾 {specs.ram}</span>}
              {specs.vga && <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', color: '#475569' }}>🎮 {specs.vga}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Vùng Giá và Nút Mua (Ngăn không bị trigger click của card) */}
      <div style={{ padding: '0 16px 16px', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Giá bán:</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
            {Number(product.price).toLocaleString('vi-VN')} đ
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={product.quantity <= 0}
          style={{
            backgroundColor: product.quantity > 0 ? '#2563eb' : '#94a3b8',
            color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px',
            fontWeight: 600, fontSize: '0.85rem', cursor: product.quantity > 0 ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <ShoppingCart size={16} />
          Mua ngay
        </button>
      </div>

    </div>
  );
}