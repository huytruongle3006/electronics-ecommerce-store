import React from 'react';
import { ShoppingCart, X, Trash2 } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cartItems, onUpdateQty, onRemoveItem, totalAmount, onOpenCheckout, busy = false, notice }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="#2563eb" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Giỏ hàng của bạn</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {notice && <div style={{ padding: '0 20px' }}>{notice}</div>}
        {/* Danh sách món đồ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <ShoppingCart size={40} color="#cbd5e1" style={{ marginBottom: '10px' }} />
              <p>Giỏ hàng chưa có sản phẩm nào</p>
            </div>
          ) : (
            cartItems.map(item => {
              const product = item.product || item;
              return (
                <div key={item.id} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    💻
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600 }}>{product.tenSP}</h4>
                    <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem' }}>
                      {Number(product.price).toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <button disabled={busy} onClick={() => onUpdateQty(item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity || item.cartQty}</span>
                      <button disabled={busy} onClick={() => onUpdateQty(item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>+</button>
                      <button disabled={busy} onClick={() => onRemoveItem(item.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Tổng tiền:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
                {totalAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <button 
              disabled={busy} onClick={onOpenCheckout}
              style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Tiến hành thanh toán
            </button>
          </div>
        )}

      </div>
    </div>
  );
}