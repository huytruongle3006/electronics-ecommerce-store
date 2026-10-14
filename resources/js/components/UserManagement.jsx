import React, { useState, useEffect } from 'react';
import { Search, Shield, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { getAdminUsersApi, getAllRolesApi, updateUserRoleApi, toggleUserStatusApi } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminUsersApi(search, roleFilter, page);
      const data = res.data.data;
      setUsers(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0
      });
    } catch (err) {
      console.error('Lỗi lấy danh sách user:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await getAllRolesApi();
      setRoles(res.data.data || []);
    } catch (err) {
      console.error('Lỗi lấy roles:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleChangeRole = async (userId, newRoleId) => {
    try {
      await updateUserRoleApi(userId, newRoleId);
      fetchUsers(pagination.current_page);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể đổi vai trò!');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await toggleUserStatusApi(userId);
      fetchUsers(pagination.current_page);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể đổi trạng thái tài khoản!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Thanh công cụ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Quản Trị Người Dùng & Phân Quyền</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tổng cộng {pagination.total} thành viên trong hệ thống</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.tenRole} ({r.maRole})</option>
            ))}
          </select>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Tìm tên, email, SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '220px', outline: 'none' }}
              />
            </div>
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Tìm
            </button>
          </form>
        </div>
      </div>

      {/* Bảng danh sách người dùng */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>Thành viên</th>
              <th style={{ padding: '12px 16px' }}>Liên hệ</th>
              <th style={{ padding: '12px 16px' }}>Vai trò hiện tại</th>
              <th style={{ padding: '12px 16px' }}>Phân quyền vai trò</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Đang nạp dữ liệu người dùng...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Không tìm thấy người dùng nào.</td></tr>
            ) : users.map(u => {
              const currentRoleId = u.roles?.[0]?.id || 3; // Mặc định role CUSTOMER
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã: {u.maUser || `USER_${u.id}`}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: '#0f172a' }}>{u.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.phone || 'Chưa có SĐT'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: u.roles?.some(r => r.maRole === 'ADMIN') ? '#fee2e2' : u.roles?.some(r => r.maRole === 'STAFF') ? '#e0e7ff' : '#f1f5f9',
                      color: u.roles?.some(r => r.maRole === 'ADMIN') ? '#b91c1c' : u.roles?.some(r => r.maRole === 'STAFF') ? '#3730a3' : '#475569'
                    }}>
                      <Shield size={12} />
                      {u.roles?.[0]?.tenRole || 'Khách hàng'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={currentRoleId}
                      onChange={(e) => handleChangeRole(u.id, Number(e.target.value))}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.tenRole} ({r.maRole})</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: u.status === 'active' ? '#15803d' : '#b91c1c'
                    }}>
                      {u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      title={u.status === 'active' ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        backgroundColor: u.status === 'active' ? '#fee2e2' : '#dcfce7',
                        color: u.status === 'active' ? '#b91c1c' : '#15803d',
                        fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      {u.status === 'active' ? <><UserX size={14}/> Khóa</> : <><UserCheck size={14}/> Kích hoạt</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}