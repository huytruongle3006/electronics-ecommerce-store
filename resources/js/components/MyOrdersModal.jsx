import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle, Truck, AlertCircle, Eye, ChevronRight } from 'lucide-react';
import { getMyOrdersApi, cancelOrderApi } from '../services/api';
import { cancellationNote } from '../utils/orderStatus';
import ReturnRequestPanel from './ReturnRequestPanel';
import OrderProductReview from './OrderProductReview';

export default function MyOrdersModal({ isOpen, onClose, onOrderChanged, initialOrderId }) {
  if (!isOpen) return null;
  return <MyOrdersContent initialOrderId={initialOrderId} onClose={onClose} onOrderChanged={onOrderChanged} />;
}

function MyOrdersContent({ onClose, onOrderChanged, initialOrderId }) {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getMyOrdersApi();
      if (res.data.success) {
        setOrders(res.data.data || []);
        setSelectedOrder(current => (res.data.data || []).find(order => order.id === (current?.id || initialOrderId)) || null);
        if (initialOrderId && !(res.data.data || []).some(order => order.id === initialOrderId)) setError('Đơn hàng trong thông báo không còn tồn tại hoặc không thuộc tài khoản của bạn.');
      }
    } catch (err) {
      setError(err.response?.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Không tải được đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSelectedOrder = async event => {
    event.preventDefault();
    if (cancelling || !selectedOrder) return;
    setError(''); setMessage('');
    if (!reason.trim()) { setError('Vui lòng nhập lý do hủy đơn.'); return; }
    setCancelling(true);
    try {
      const { data } = await cancelOrderApi(selectedOrder.id, reason.trim());
      setOrders(previous => previous.map(order => order.id === data.data.id ? data.data : order));
      setSelectedOrder(data.data);
      setShowCancel(false); setReason(''); setMessage(data.message);
      onOrderChanged?.();
    } catch (err) {
      setError(err.response?.data?.errors?.reason?.[0] || err.response?.data?.message || 'Không thể hủy đơn. Vui lòng thử lại.');
      if (err.response?.status === 409) { setShowCancel(false); await fetchOrders(); }
    } finally { setCancelling(false); }
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
      <div role="dialog" aria-modal="true" aria-labelledby="my-orders-title" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={22} color="#2563eb" />
            <h3 id="my-orders-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              {selectedOrder ? `Chi Tiết Đơn Hàng: ${selectedOrder.maDH}` : 'Đơn Hàng Của Tôi'}
            </h3>
          </div>
          <button aria-label={selectedOrder ? 'Quay lại danh sách' : 'Đóng đơn hàng'} disabled={cancelling} onClick={() => { setShowCancel(false); setReason(''); setError(''); setMessage(''); if (selectedOrder) setSelectedOrder(null); else onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div role="alert" style={{ color: '#b91c1c', marginBottom: 16 }}>{error} <button type="button" disabled={cancelling} onClick={() => { setError(''); fetchOrders(); }}>Tải lại đơn hàng</button></div>}
          {message && <p role="status" style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', color: '#166534' }}>{message}</p>}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải danh sách đơn hàng...</div>
          ) : selectedOrder ? (
            /* Chi tiết 1 đơn hàng */
            <div>
              <button 
                disabled={cancelling}
                onClick={() => { setSelectedOrder(null); setShowCancel(false); setReason(''); setError(''); setMessage(''); }}
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

              {selectedOrder.status === 'pending' && <div style={{ marginBottom: 20, padding: 16, border: '1px solid #fecaca', borderRadius: 10 }}>
                {!showCancel ? <>
                  <p style={{ marginTop: 0, color: '#64748b' }}>Bạn có thể hủy đơn khi cửa hàng chưa xác nhận.</p>
                  <button type="button" onClick={() => { setShowCancel(true); setReason(''); setError(''); setMessage(''); }} style={{ padding: '9px 16px', background: '#fff', border: '1px solid #dc2626', borderRadius: 8, color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}>Hủy đơn hàng</button>
                </> : <form onSubmit={cancelSelectedOrder}>
                  <label style={{ display: 'grid', gap: 8, fontWeight: 600 }}>Lý do hủy đơn (tối đa 200 ký tự)
                    <textarea name="cancel_reason" autoFocus required maxLength={200} rows={3} disabled={cancelling} value={reason} onChange={event => setReason(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', font: 'inherit', resize: 'vertical' }} />
                  </label>
                  <p style={{ fontSize: 13, color: '#64748b' }}>Hủy đơn sẽ hoàn lại số lượng vào kho và không thể khôi phục đơn này.</p>
                  {selectedOrder.payment?.payment_status === 'paid' && <p style={{ color: '#b45309' }}>Đơn đã thanh toán. Sau khi hủy, cần liên hệ cửa hàng để xử lý hoàn tiền.</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button type="submit" disabled={cancelling} style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>{cancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}</button>
                    <button type="button" disabled={cancelling} onClick={() => { setShowCancel(false); setReason(''); setError(''); }}>Giữ lại đơn</button>
                  </div>
                </form>}
              </div>}
              {selectedOrder.status === 'cancelled' && <div style={{ background: '#fff1f2', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <strong>Đơn hàng đã hủy</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{cancellationNote(selectedOrder) || 'Đơn hàng đã được hủy.'}</p>
                {selectedOrder.payment?.payment_status === 'paid' && <p>Đơn đã thanh toán; vui lòng liên hệ cửa hàng để xử lý hoàn tiền. Trạng thái hủy đơn không phải xác nhận đã hoàn tiền.</p>}
              </div>}
              {['confirmed', 'shipping', 'completed'].includes(selectedOrder.status) && <p style={{ color: '#64748b', fontSize: 14 }}>Đơn đã được xử lý nên không thể tự hủy. Vui lòng liên hệ cửa hàng nếu cần hỗ trợ.</p>}

              <ReturnRequestPanel key={`${selectedOrder.id}-${selectedOrder.status}-${selectedOrder.payment?.payment_status}`} orderId={selectedOrder.id} />
              {/* Danh sách mặt hàng */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', marginBottom: '20px' }}>
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
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          {d.product?.tenSP || 'Sản phẩm không còn tồn tại'}
                          {d.product && ['confirmed', 'shipping', 'completed'].includes(selectedOrder.status) && <OrderProductReview key={selectedOrder.id + ':' + d.product_id} productId={d.product_id} productName={d.product.tenSP} />}
                        </td>
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
                  role="button" tabIndex={0} aria-label={`Xem đơn ${order.maDH}`}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedOrder(order); } }}
                  onClick={() => { setSelectedOrder(order); setShowCancel(false); setReason(''); setMessage(''); setError(''); }}
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
