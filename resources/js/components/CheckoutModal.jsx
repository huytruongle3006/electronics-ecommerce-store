import React, { useState } from 'react';
import { X, CheckCircle2, CreditCard, Truck, ShieldCheck, MapPin, Phone, User, Tag } from 'lucide-react';
import { ShippingAddressPicker } from './AddressBook';
import { checkoutApi } from '../services/api';

export default function CheckoutModal({ isOpen, onClose, cartItems, totalAmount, user, onOrderSuccess }) {

  const [formData, setFormData] = useState({
    recipient_name: user?.full_name || '',
    recipient_phone: user?.phone || '',
    shipping_address: user?.address || '',
    payment_method: 'cod',
    voucher_code: '',
    note: '',
  });

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressBusy, setAddressBusy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccessData, setOrderSuccessData] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || addressBusy) return;
    if (!selectedAddress && (!formData.recipient_name || !formData.recipient_phone || !formData.shipping_address)) {
      setError('Vui lòng điền đầy đủ thông tin giao hàng!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await checkoutApi(selectedAddress ? { payment_method: formData.payment_method, voucher_code: formData.voucher_code, note: formData.note, address_id: selectedAddress.id } : formData);
      if (res.data.success) {
        setOrderSuccessData(res.data.data);
        onOrderSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {orderSuccessData ? 'Đặt Hàng Thành Công' : 'Thanh Toán & Đặt Hàng'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {orderSuccessData ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={60} color="#16a34a" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a', margin: '0 0 8px' }}>
                Đơn hàng của bạn đã được tiếp nhận!
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                Mã đơn hàng: <strong style={{ color: '#0f172a' }}>{orderSuccessData.maDH}</strong>
              </p>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', textAlign: 'left', fontSize: '0.875rem', lineHeight: 1.8, marginBottom: '20px' }}>
                <div><strong>Người nhận:</strong> {orderSuccessData.recipient_name} ({orderSuccessData.recipient_phone})</div>
                <div><strong>Địa chỉ:</strong> {orderSuccessData.shipping_address}</div>
                <div><strong>Hình thức thanh toán:</strong> {orderSuccessData.payment?.payment_method?.toUpperCase()}</div>
                <div><strong>Tổng thanh toán:</strong> <span style={{ color: '#dc2626', fontWeight: 800 }}>{Number(orderSuccessData.final_amount).toLocaleString('vi-VN')} đ</span></div>
              </div>

              <button 
                onClick={onClose}
                style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <ShippingAddressPicker disabled={loading} onBusyChange={setAddressBusy} onSelect={setSelectedAddress} />
              {/* Thông tin người nhận */}
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Thông tin giao hàng
                </span>
                
                {selectedAddress && <p style={{ color: '#2563eb', fontSize: 13 }}>Đang dùng địa chỉ đã lưu. Chọn “Nhập địa chỉ khác” ở trên để nhập thủ công.</p>}
                <fieldset disabled={!!selectedAddress || loading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Họ tên người nhận *</label>
                    <input 
                      type="text" 
                      name="recipient_name"
                      required
                      placeholder="Nguyễn Văn A"
                      maxLength={100} value={selectedAddress?.recipient_name ?? formData.recipient_name}
                      onChange={handleChange}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Số điện thoại *</label>
                    <input 
                      type="text" 
                      name="recipient_phone"
                      required
                      placeholder="0912345678"
                      maxLength={20} value={selectedAddress?.recipient_phone ?? formData.recipient_phone}
                      onChange={handleChange}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Địa chỉ nhận hàng chi tiết *</label>
                  <input 
                    type="text" 
                    name="shipping_address"
                    required
                    placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                    maxLength={1000} value={selectedAddress?.shipping_address ?? formData.shipping_address}
                    onChange={handleChange}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                </fieldset>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Ghi chú giao hàng (nếu có)</label>
                  <textarea 
                    name="note"
                    rows="2"
                    placeholder="Giao vào giờ hành chính, gọi trước khi giao..."
                    value={formData.note}
                    onChange={handleChange}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'none' }}
                  />
                </div>
              </div>

              {/* Phương thức thanh toán */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Hình thức thanh toán
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {[
                    { id: 'cod', label: 'Thanh toán COD', desc: 'Thanh toán khi nhận hàng' },
                    { id: 'bank_transfer', label: 'Chuyển khoản NH', desc: 'Quét mã VietQR tiện lợi' },
                    { id: 'vnpay', label: 'Cổng VNPAY', desc: 'Thẻ ATM / QR Pay' },
                    { id: 'momo', label: 'Ví MoMo', desc: 'Ví điện tử MoMo' },
                  ].map(method => (
                    <label 
                      key={method.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px',
                        borderRadius: '8px', border: formData.payment_method === method.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: formData.payment_method === method.id ? '#eff6ff' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="payment_method" 
                        value={method.id} 
                        checked={formData.payment_method === method.id}
                        onChange={handleChange}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{method.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Voucher */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Mã giảm giá (Voucher)
                </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="text" 
                    name="voucher_code"
                    placeholder="Nhập mã (Ví dụ: CHAOMUNG)"
                    value={formData.voucher_code}
                    onChange={handleChange}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', textTransform: 'uppercase' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Mã có sẵn trong hệ thống: <strong>CHAOMUNG</strong> (Giảm 10%), <strong>SALEKHUNG</strong> (Giảm 15%)
                </div>
              </div>

              {/* Tổng kết tiền */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px', color: '#64748b' }}>
                  <span>Tạm tính ({cartItems.length} sản phẩm):</span>
                  <span>{totalAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: '#64748b' }}>
                  <span>Phí giao hàng:</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Miễn phí</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: '#dc2626' }}>{totalAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || addressBusy}
                style={{
                  padding: '13px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)'
                }}
              >
                {loading ? 'Đang khởi tạo đơn hàng...' : 'XÁC NHẬN ĐẶT HÀNG'}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
