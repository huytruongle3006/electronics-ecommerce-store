import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle, Truck, AlertCircle, Eye, ChevronRight } from 'lucide-react';
import { getMyOrdersApi } from '../services/api';

export default function MyOrdersModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getMyOrdersApi();
      if (res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Chờ duyệt</span>;
      case 'confirmed':
        return <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Đã xác nhận</span>;
      case 'shipping':
        return <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Đang giao hàng</span>;
      case 'completed':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Hoàn thành</span>;
      case 'cancelled':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Đã hủy</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={22} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              {selectedOrder ? `Chi Tiết Đơn Hàng: ${selectedOrder.maDH}` : 'Đơn Hàng Của Tôi'}
            </h3>
          </div>
          <button onClick={() => { if (selectedOrder) setSelectedOrder(null); else onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải danh sách đơn hàng...</div>
          ) : selectedOrder ? (
            /* Chi tiết 1 đơn hàng */
            <div>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '16px', padding: 0 }}
              >
                ← Quay lại danh sách
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    Người nhận: <strong>{selectedOrder.recipient_name}</strong> ({selectedOrder.recipient_phone})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    Địa chỉ: {selectedOrder.shipping_address}
                  </div>
                </div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>

              {/* Danh sách mặt hàng */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Sản phẩm</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Số lượng</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.details?.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{d.product?.tenSP || 'Sản phẩm'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>x{d.quantity}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{Number(d.price).toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                          {Number(d.total_line).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng tiền */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Tạm tính:</span>
                  <span>{Number(selectedOrder.total_amount).toLocaleString('vi-VN')} đ</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Giảm giá (Voucher):</span>
                    <span>-{Number(selectedOrder.discount_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                  <span>Tổng tiền thanh toán:</span>
                  <span style={{ color: '#dc2626' }}>{Number(selectedOrder.final_amount).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

            </div>
          ) : orders.length === 0 ? (
            /* Không có đơn hàng */
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <Package size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Bạn chưa có đơn hàng nào</p>
              <span style={{ fontSize: '0.85rem' }}>Các đơn hàng bạn đặt sẽ được quản lý và hiển thị tại đây</span>
            </div>
          ) : (
            /* Danh sách tất cả đơn */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
                    backgroundColor: '#fff', cursor: 'pointer', transition: 'border-color 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{order.maDH}</strong>
                      {getStatusBadge(order.status)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Ngày đặt: {new Date(order.created_at).toLocaleDateString('vi-VN')} | {order.details?.length || 0} sản phẩm
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tổng tiền</span>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
                        {Number(order.final_amount).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}