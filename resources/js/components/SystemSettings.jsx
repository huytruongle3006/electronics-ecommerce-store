import React, { useState, useEffect } from 'react';
import { Settings, Store, Truck, CreditCard, ShieldAlert, Save } from 'lucide-react';
import { getAdminSettingsApi, updateAdminSettingsApi } from '../services/api';

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    shipping_fee: 30000,
    free_shipping_limit: 5000000,
    tax_percent: 8,
    enable_cod: true,
    enable_bank: true,
    bank_info: '',
    maintenance_mode: false,
  });

  useEffect(() => {
    getAdminSettingsApi()
      .then(res => {
        const d = res.data.data || {};
        setForm({
          store_name: d.store_name || '',
          store_phone: d.store_phone || '',
          store_email: d.store_email || '',
          store_address: d.store_address || '',
          shipping_fee: Number(d.shipping_fee || 30000),
          free_shipping_limit: Number(d.free_shipping_limit || 5000000),
          tax_percent: Number(d.tax_percent || 8),
          enable_cod: d.enable_cod === '1' || d.enable_cod === true,
          enable_bank: d.enable_bank === '1' || d.enable_bank === true,
          bank_info: d.bank_info || '',
          maintenance_mode: d.maintenance_mode === '1' || d.maintenance_mode === true,
        });
      })
      .catch(err => console.error('Lỗi tải cấu hình:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdminSettingsApi(form);
      alert('Đã lưu cấu hình hệ thống thành công!');
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể lưu cấu hình!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang nạp thiết lập hệ thống...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Cấu Hình Hệ Thống & Cửa Hàng
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Tùy chỉnh thông tin liên hệ, phí giao hàng, cổng thanh toán và vận hành website
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* KHỐI 1: THÔNG TIN THƯƠNG HIỆU */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <Store size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Thông Tin Thương Hiệu & Showroom</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tên thương hiệu</label>
              <input
                type="text"
                required
                value={form.store_name}
                onChange={e => setForm({ ...form, store_name: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Hotline CSKH</label>
              <input
                type="text"
                required
                value={form.store_phone}
                onChange={e => setForm({ ...form, store_phone: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Email liên hệ</label>
              <input
                type="email"
                required
                value={form.store_email}
                onChange={e => setForm({ ...form, store_email: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Địa chỉ Showroom</label>
              <input
                type="text"
                required
                value={form.store_address}
                onChange={e => setForm({ ...form, store_address: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* KHỐI 2: CHÍNH SÁCH VẬN CHUYỂN & THUẾ */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <Truck size={18} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Vận Chuyển & Thuế (VAT)</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Phí ship mặc định (đ)</label>
              <input
                type="number"
                required
                value={form.shipping_fee}
                onChange={e => setForm({ ...form, shipping_fee: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Miễn phí ship từ đơn (đ)</label>
              <input
                type="number"
                required
                value={form.free_shipping_limit}
                onChange={e => setForm({ ...form, free_shipping_limit: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Thuế VAT mặc định (%)</label>
              <input
                type="number"
                required
                value={form.tax_percent}
                onChange={e => setForm({ ...form, tax_percent: Number(e.target.value) })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* KHỐI 3: PHƯƠNG THỨC THANH TOÁN */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <CreditCard size={18} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Cổng Thanh Toán</h3>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.enable_cod}
                onChange={e => setForm({ ...form, enable_cod: e.target.checked })}
              />
              Bật thanh toán khi nhận hàng (COD)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.enable_bank}
                onChange={e => setForm({ ...form, enable_bank: e.target.checked })}
              />
              Bật chuyển khoản qua Ngân hàng
            </label>
          </div>

          {form.enable_bank && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Thông tin số tài khoản / Ngân hàng thụ hưởng</label>
              <input
                type="text"
                placeholder="vd: Vietcombank - STK: 123456789 - Chủ TK: NGUYEN VAN A"
                value={form.bank_info}
                onChange={e => setForm({ ...form, bank_info: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}
        </div>

        {/* KHỐI 4: BẢO TRÌ HỆ THỐNG */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>Chế Độ Bảo Trì (Maintenance)</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Khi bật tính năng này, khách hàng truy cập website sẽ thấy trang thông báo hệ thống đang nâng cấp, chỉ có tài khoản Admin mới có thể đăng nhập.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c', cursor: 'pointer', marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={form.maintenance_mode}
              onChange={e => setForm({ ...form, maintenance_mode: e.target.checked })}
            />
            Kích hoạt chế độ bảo trì website
          </label>
        </div>

        {/* NÚT LƯU THIẾT LẬP */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px',
              backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu Thay Đổi Cấu Hình'}
          </button>
        </div>

      </form>
    </div>
  );
}