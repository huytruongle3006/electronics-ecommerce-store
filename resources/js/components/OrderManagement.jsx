import { canChangeOrderStatus, cancellationNote } from '../utils/orderStatus';
import ConfirmCodPayment from './ConfirmCodPayment';
import React, { useState, useEffect } from 'react';
import { Search, Eye, X, Package, CheckCircle, Clock, Truck, Check, AlertCircle } from 'lucide-react';
import { getAdminOrdersApi, updateOrderStatusApi } from '../services/api';

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309' },
  confirmed: { label: 'Đã xác nhận', bg: '#e0e7ff', color: '#3730a3' },
  shipping: { label: 'Đang giao', bg: '#e0f2fe', color: '#0369a1' },
  completed: { label: 'Hoàn tất', bg: '#dcfce7', color: '#15803d' },
  cancelled: { label: 'Đã hủy', bg: '#fee2e2', color: '#b91c1c' },
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async (status = statusFilter, query = search, page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminOrdersApi(status, query, page);
      const data = res.data.data;
      setOrders(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(statusFilter, search, 1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders(statusFilter, search, 1);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { data } = await updateOrderStatusApi(orderId, newStatus);
      // Cập nhật ngay trên state giao diện
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data.data, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, ...data.data, status: newStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Thanh tiêu đề & Tìm kiếm & Bộ lọc */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Quản Lý Đơn Hàng</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tổng số {pagination.total} đơn hàng trong hệ thống</span>
        </div>

        {/* Ô tìm kiếm đơn */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Tìm theo mã ĐH, tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '240px', outline: 'none' }}
            />
          </div>
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Bộ nút lọc theo trạng thái */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'confirmed', label: 'Đã xác nhận' },
          { key: 'shipping', label: 'Đang giao' },
          { key: 'completed', label: 'Hoàn tất' },
          { key: 'cancelled', label: 'Đã hủy' },
        ].map(st => (
          <button
            key={st.key}
            onClick={() => setStatusFilter(st.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: statusFilter === st.key ? '#0f172a' : '#fff',
              color: statusFilter === st.key ? '#fff' : '#475569',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Bảng danh sách đơn hàng */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>Mã ĐH</th>
              <th style={{ padding: '12px 16px' }}>Khách nhận</th>
              <th style={{ padding: '12px 16px' }}>Ngày đặt</th>
              <th style={{ padding: '12px 16px' }}>Tổng tiền</th>
              <th style={{ padding: '12px 16px' }}>Thanh toán</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp dữ liệu đơn hàng...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không tìm thấy đơn hàng nào.</td>
              </tr>
            ) : orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] || { label: order.status, bg: '#f1f5f9', color: '#475569' };
              return (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{order.maDH}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{order.recipient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.recipient_phone}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(order.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#dc2626' }}>
                    {Number(order.final_amount).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 600, color: '#334155' }}>
                      {order.payment?.payment_method?.toUpperCase() || 'COD'}
                    </span>
                    <div>{order.payment?.payment_status === 'refunded' ? 'Đã hoàn tiền' : order.payment?.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa xác nhận thu tiền'}</div>
                    <ConfirmCodPayment order={order} onConfirmed={() => fetchOrders()} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={order.status}
                      disabled={['cancelled', 'completed'].includes(order.status)}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pending" disabled={!canChangeOrderStatus(order.status, 'pending')}>Chờ duyệt</option>
                      <option value="confirmed" disabled={!canChangeOrderStatus(order.status, 'confirmed')}>Đã xác nhận</option>
                      <option value="shipping" disabled={!canChangeOrderStatus(order.status, 'shipping')}>Đang giao</option>
                      <option value="completed" disabled={!canChangeOrderStatus(order.status, 'completed')}>Hoàn tất</option>
                      <option value="cancelled" disabled={!canChangeOrderStatus(order.status, 'cancelled')}>Hủy đơn</option>
                    </select>
                    {order.status === 'cancelled' && <div style={{ maxWidth: 260, fontSize: 12, color: '#b91c1c', marginTop: 8, whiteSpace: 'pre-wrap' }}>{cancellationNote(order) || 'Đơn đã hủy.'}{order.payment?.payment_status === 'paid' && <div>Đã thanh toán — cần xử lý hoàn tiền.</div>}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={14} /> Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Phân trang */}
        {pagination.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', gap: '8px', borderTop: '1px solid #e2e8f0' }}>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => fetchOrders(statusFilter, search, page)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: pagination.current_page === page ? '#2563eb' : '#fff',
                  color: pagination.current_page === page ? '#fff' : '#334155',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết một đơn hàng */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '640px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Chi Tiết Đơn Hàng: {selectedOrder.maDH}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Thông tin giao nhận */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Người nhận:</strong> {selectedOrder.recipient_name} ({selectedOrder.recipient_phone})</div>
                <div><strong>Địa chỉ nhận hàng:</strong> {selectedOrder.shipping_address}</div>
                {selectedOrder.note && <div><strong>Ghi chú:</strong> {selectedOrder.note}</div>}
              </div>

              {/* Danh sách sản phẩm trong đơn */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Sản phẩm đã mua:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.details?.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.product?.tenSP || 'Sản phẩm đã gỡ'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn giá: {Number(item.price).toLocaleString('vi-VN')} đ &times; SL: {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {(Number(item.price) * item.quantity).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng kết tiền */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>Tổng giá trị thanh toán:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>
                  {Number(selectedOrder.final_amount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '8px 18px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
