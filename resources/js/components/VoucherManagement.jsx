import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit, Trash2, X, Power } from 'lucide-react';
import { 
  getAdminVouchersApi, createVoucherApi, updateVoucherApi, 
  toggleVoucherStatusApi, deleteVoucherApi 
} from '../services/api';
const localDateTime = value => {const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [formData, setFormData] = useState({
    maVoucher: '',
    discount_percent: 10,
    max_discount_amount: 500000,
    min_order_amount: 1000000,
    quantity: 50,
    per_user_limit: 1,
    expired_at: '',
    status: 'active'
  });

  const fetchVouchers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminVouchersApi(search, statusFilter, page);
      const d = res.data.data;
      setVouchers(d.data || []);
      setPagination({
        current_page: d.current_page || 1,
        last_page: d.last_page || 1,
        total: d.total || 0,
      });
    } catch (err) {
      console.error('Lỗi lấy voucher:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers(1);
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVouchers(1);
  };

  const openModal = (v = null) => {
    if (v) {
      setEditingVoucher(v);
      setFormData({
        maVoucher: v.maVoucher || '',
        discount_percent: v.discount_percent || 10,
        max_discount_amount: v.max_discount_amount || 0,
        min_order_amount: v.min_order_amount || 0,
        quantity: v.quantity ?? 1,
        per_user_limit: v.per_user_limit ?? 1,
        expired_at: v.expired_at ? localDateTime(v.expired_at) : '',
        status: v.status || 'active'
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        maVoucher: 'TECH' + Math.floor(100 + Math.random() * 900),
        discount_percent: 10,
        max_discount_amount: 500000,
        min_order_amount: 2000000,
        quantity: 50,
        per_user_limit: 1,
        expired_at: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload={...formData,expired_at:formData.expired_at?new Date(formData.expired_at).toISOString():null};
      if (editingVoucher) {
        await updateVoucherApi(editingVoucher.id, payload);
      } else {
        await createVoucherApi(payload);
      }
      setIsModalOpen(false);
      fetchVouchers(pagination.current_page);
    } catch (err) {
      alert(Object.values(err.response?.data?.errors || {}).flat()[0] || err.response?.data?.message || 'Có lỗi khi lưu voucher!');
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleVoucherStatusApi(id);
      fetchVouchers(pagination.current_page);
    } catch (err) {
      alert('Không thể đổi trạng thái');
    }
  };

  const handleDelete = async (v) => {
    if (confirm(`Bạn có chắc chắn muốn xóa mã "${v.maVoucher}"?`)) {
      try {
        await deleteVoucherApi(v.id);
        fetchVouchers(pagination.current_page);
      } catch (err) {
        alert(err.response?.data?.message || 'Không thể xóa voucher');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tiêu đề & Công cụ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Quản Lý Mã Giảm Giá & Khuyến Mãi
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tổng cộng {pagination.total} mã voucher</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kích hoạt</option>
            <option value="inactive">Đã tạm ngưng</option>
            <option value="expired">Đã hết hạn</option>
          </select>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Tìm mã voucher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '200px', outline: 'none' }}
              />
            </div>
            <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Tìm
            </button>
          </form>

          <button 
            onClick={() => openModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Plus size={16} /> Tạo Mã Mới
          </button>
        </div>
      </div>

      {/* Bảng danh sách Voucher */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>Mã Voucher</th>
              <th style={{ padding: '12px 16px' }}>Giảm (%)</th>
              <th style={{ padding: '12px 16px' }}>Giảm tối đa</th>
              <th style={{ padding: '12px 16px' }}>Đơn tối thiểu</th>
              <th style={{ padding: '12px 16px' }}>Số lượng</th>
              <th style={{ padding: '12px 16px' }}>Hạn dùng</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp voucher...</td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có mã giảm giá nào.</td></tr>
            ) : vouchers.map(v => {
              const isExpired = v.expired_at && new Date(v.expired_at) < new Date();
              return (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px' }}>
                      <Tag size={13} /> {v.maVoucher}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#dc2626' }}>
                    {Number(v.discount_percent)}%
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {Number(v.max_discount_amount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {Number(v.min_order_amount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    {v.quantity} lượt còn lại <small style={{display:'block',fontWeight:400}}>Mỗi tài khoản: {v.per_user_limit ?? 1}</small>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: isExpired ? '#dc2626' : '#64748b', fontWeight: isExpired ? 700 : 500 }}>
                    {v.expired_at ? new Date(v.expired_at).toLocaleString('vi-VN') : 'Vô thời hạn'}
                    {isExpired && ' (Hết hạn)'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: v.status !== 'active' ? '#fee2e2' : isExpired ? '#fef3c7' : '#dcfce7',
                      color: v.status !== 'active' ? '#b91c1c' : isExpired ? '#b45309' : '#15803d'
                    }}>
                      {v.status !== 'active' ? 'Đã tắt' : isExpired ? 'Hết hạn' : 'Đang bật'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button onClick={() => handleToggle(v.id)} title={v.status === 'active' ? 'Tắt voucher' : 'Bật voucher'} style={{ background: 'none', border: 'none', color: v.status === 'active' ? '#eab308' : '#22c55e', cursor: 'pointer', marginRight: '10px' }}>
                      <Power size={16} />
                    </button>
                    <button onClick={() => openModal(v)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '10px' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(v)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM / SỬA VOUCHER */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingVoucher ? 'Cập Nhật Voucher' : 'Tạo Mã Giảm Giá Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Mã Voucher</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.maVoucher} 
                    onChange={e => setFormData({ ...formData, maVoucher: e.target.value.toUpperCase() })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Giảm (%)</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    max="100"
                    value={formData.discount_percent} 
                    onChange={e => setFormData({ ...formData, discount_percent: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Đơn tối thiểu (đ)</label>
                  <input 
                    type="number" 
                    value={formData.min_order_amount} 
                    onChange={e => setFormData({ ...formData, min_order_amount: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Giảm tối đa (đ)</label>
                  <input 
                    type="number" 
                    value={formData.max_discount_amount} 
                    onChange={e => setFormData({ ...formData, max_discount_amount: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Số lượt dùng</label>
                  <input 
                    type="number" 
                    required
                    value={formData.quantity} 
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Ngày hết hạn</label>
                  <input 
                    type="datetime-local"
                    value={formData.expired_at} 
                    onChange={e => setFormData({ ...formData, expired_at: e.target.value })} 
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600}}>Số lượt tối đa mỗi tài khoản</label>
                <input aria-label="Số lượt tối đa mỗi tài khoản" type="number" min="1" max="10000" required value={formData.per_user_limit} onChange={e=>setFormData({...formData,per_user_limit:e.target.value})} style={{width:'100%',boxSizing:'border-box',padding:8,border:'1px solid #cbd5e1',borderRadius:6}} />
                <small>Đơn đã hủy không tính vào giới hạn. Giảm tối đa = 0 nghĩa là không giới hạn tiền giảm.</small>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="active">Đang kích hoạt (active)</option>
                  <option value="inactive">Tạm ngưng (inactive)</option>
                </select>
              </div>

              <button 
                type="submit" 
                style={{ marginTop: '8px', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                {editingVoucher ? 'Lưu Thay Đổi' : 'Tạo Voucher Mới'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
