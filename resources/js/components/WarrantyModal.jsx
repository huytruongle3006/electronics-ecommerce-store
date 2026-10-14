import React, { useState } from 'react';
import { ShieldCheck, X, CheckCircle } from 'lucide-react';
import { checkWarranty } from '../services/api';

export default function WarrantyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [serialQuery, setSerialQuery] = useState('');
  const [warrantyResult, setWarrantyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serialQuery.trim()) return;

    setLoading(true);
    setError('');
    setWarrantyResult(null);

    try {
      const res = await checkWarranty(serialQuery.trim());
      setWarrantyResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy thông tin bảo hành cho mã này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tra Cứu Bảo Hành Điện Tử</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Nhập số Serial / IMEI sản phẩm..."
              value={serialQuery}
              onChange={(e) => setSerialQuery(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Đang tra...' : 'Tra cứu'}
            </button>
          </form>

          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {warrantyResult && (
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, marginBottom: '10px' }}>
                <CheckCircle size={18} />
                <span>Thông tin bảo hành chính hãng</span>
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.8, color: '#334155' }}>
                <div><strong>Thiết bị:</strong> {warrantyResult.product_name || 'N/A'}</div>
                <div><strong>Số Serial:</strong> {warrantyResult.serial_number}</div>
                <div><strong>Chủ sở hữu:</strong> {warrantyResult.customer_name}</div>
                <div><strong>Ngày kích hoạt:</strong> {warrantyResult.start_date}</div>
                <div><strong>Ngày hết hạn:</strong> {warrantyResult.end_date}</div>
                <div>
                  <strong>Tình trạng:</strong>{' '}
                  <span style={{ color: warrantyResult.is_expired ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                    {warrantyResult.is_expired ? 'ĐÃ HẾT HẠN' : 'CÒN HIỆU LỰC'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}