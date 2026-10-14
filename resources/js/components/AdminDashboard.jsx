import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import ProductCategoryManagement from './ProductCategoryManagement';

import FinancialAnalytics from './FinancialAnalytics'; // ✅ Đã bổ sung import
import VoucherManagement from './VoucherManagement'; // 👈 Thêm dòng này
import SystemSettings from './SystemSettings';
import {
    LayoutDashboard, ShoppingBag, Package, DollarSign, Users,
    AlertTriangle, ArrowLeft, BarChart3, RefreshCw, Ticket,Settings
} from 'lucide-react';
import {
    getAdminStatsApi,
    getAdminOrdersApi,
    updateOrderStatusApi
} from '../services/api';

export default function AdminDashboard({ onBackToStore }) {
    const [tab, setTab] = useState('stats'); // 'stats' | 'orders' | 'products' | 'users' | 'analytics'

    // --- STATE TAB: TỔNG QUAN ---
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // --- STATE TAB: ĐƠN HÀNG ---
    const [orders, setOrders] = useState([]);
    const [orderFilter, setOrderFilter] = useState('all');
    const [loadingOrders, setLoadingOrders] = useState(false);

    // 1. Tải thống kê tổng quan
    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const res = await getAdminStatsApi();
            setStats(res.data.data);
        } catch (err) {
            console.error('Lỗi tải thống kê:', err);
        } finally {
            setLoadingStats(false);
        }
    };

    // 2. Tải danh sách đơn hàng
    const loadOrders = async (status = 'all') => {
        setLoadingOrders(true);
        try {
            const res = await getAdminOrdersApi(status);
            setOrders(res.data.data?.data || res.data.data || []);
        } catch (err) {
            console.error('Lỗi tải đơn hàng:', err);
        } finally {
            setLoadingOrders(false);
        }
    };

    // 3. Tối ưu nạp dữ liệu: Tab nào đang mở mới gọi API tab đó
    useEffect(() => {
        if (tab === 'stats') {
            loadStats();
        } else if (tab === 'orders') {
            loadOrders(orderFilter);
        }
    }, [tab, orderFilter]);

    // Cập nhật trạng thái đơn hàng
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateOrderStatusApi(orderId, newStatus);
            loadOrders(orderFilter);
            if (stats) loadStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Không thể đổi trạng thái đơn hàng!');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

            {/* SIDEBAR BÊN TRÁI */}
            <aside style={{ width: '250px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#2563eb', padding: '6px', borderRadius: '8px' }}>⚡</div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.5px' }}>ADMIN PANEL</span>
                </div>

                <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <button
                        onClick={() => setTab('stats')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'stats' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <LayoutDashboard size={18} />
                        Tổng quan
                    </button>

                    <button
                        onClick={() => setTab('orders')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'orders' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <ShoppingBag size={18} />
                        Đơn hàng
                    </button>

                    <button
                        onClick={() => setTab('products')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'products' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <Package size={18} />
                        Sản phẩm & Kho
                    </button>

                    <button
                        onClick={() => setTab('users')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'users' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <Users size={18} />
                        Người dùng & Quyền
                    </button>

                    <button
                        onClick={() => setTab('analytics')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'analytics' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <BarChart3 size={18} />
                        Báo cáo tài chính
                    </button>
                    <button
                        onClick={() => setTab('vouchers')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'vouchers' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <Ticket size={18} />
                        Mã giảm giá
                    </button>
                    <button
                        onClick={() => setTab('settings')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                            backgroundColor: tab === 'settings' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left'
                        }}
                    >
                        <Settings size={18} />
                        Cấu hình hệ thống
                    </button>
                </nav>

                <div style={{ padding: '16px' }}>
                    <button
                        onClick={onBackToStore}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '10px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b',
                            color: '#94a3b8', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        <ArrowLeft size={16} />
                        Về Cửa Hàng
                    </button>
                </div>
            </aside>

            {/* KHU VỰC NỘI DUNG CHÍNH (MAIN AREA) */}
            <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>

                {/* --- TAB 1: THỐNG KÊ TỔNG QUAN --- */}
                {tab === 'stats' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Bảng Điều Khiển</h2>
                            <button
                                onClick={loadStats}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                <RefreshCw size={14} /> Làm mới
                            </button>
                        </div>

                        {loadingStats ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp dữ liệu thống kê...</div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span>DOANH THU HOÀN THÀNH</span>
                                            <DollarSign size={20} color="#16a34a" />
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
                                            {Number(stats?.total_revenue || 0).toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span>TỔNG SỐ ĐƠN HÀNG</span>
                                            <ShoppingBag size={20} color="#2563eb" />
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
                                            {stats?.total_orders || 0}
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span>KHÁCH HÀNG</span>
                                            <Users size={20} color="#7c3aed" />
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
                                            {stats?.total_customers || 0}
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                            <span>CẢNH BÁO TỒN KHO</span>
                                            <AlertTriangle size={20} color="#dc2626" />
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '10px' }}>
                                            {stats?.low_stock_products || 0} máy (&le; 5)
                                        </div>
                                    </div>
                                </div>

                                {/* Đơn hàng gần đây */}
                                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700 }}>Đơn Hàng Mới Nhận</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                                <th style={{ padding: '10px' }}>Mã ĐH</th>
                                                <th style={{ padding: '10px' }}>Người nhận</th>
                                                <th style={{ padding: '10px' }}>Ngày tạo</th>
                                                <th style={{ padding: '10px' }}>Tổng tiền</th>
                                                <th style={{ padding: '10px' }}>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats?.recent_orders?.length === 0 ? (
                                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Chưa có đơn hàng nào.</td></tr>
                                            ) : stats?.recent_orders?.map(o => (
                                                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{o.maDH}</td>
                                                    <td style={{ padding: '12px 10px' }}>{o.recipient_name}</td>
                                                    <td style={{ padding: '12px 10px' }}>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                                                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#dc2626' }}>
                                                        {Number(o.final_amount).toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td style={{ padding: '12px 10px' }}>
                                                        <span style={{
                                                            padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                            backgroundColor: o.status === 'completed' ? '#dcfce7' : '#fef3c7',
                                                            color: o.status === 'completed' ? '#15803d' : '#b45309'
                                                        }}>
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* --- TAB 2: QUẢN LÝ ĐƠN HÀNG --- */}
                {tab === 'orders' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Quản Lý Đơn Hàng</h2>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['all', 'pending', 'confirmed', 'shipping', 'completed', 'cancelled'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setOrderFilter(st)}
                                        style={{
                                            padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                            backgroundColor: orderFilter === st ? '#2563eb' : '#fff',
                                            color: orderFilter === st ? '#fff' : '#475569',
                                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                                        }}
                                    >
                                        {st.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px' }}>Mã ĐH</th>
                                        <th style={{ padding: '12px 16px' }}>Khách hàng</th>
                                        <th style={{ padding: '12px 16px' }}>SĐT / Địa chỉ</th>
                                        <th style={{ padding: '12px 16px' }}>Tổng tiền</th>
                                        <th style={{ padding: '12px 16px' }}>Thanh toán</th>
                                        <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                                        <th style={{ padding: '12px 16px' }}>Món</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingOrders ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang nạp danh sách đơn hàng...</td></tr>
                                    ) : orders.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Không có đơn hàng nào phù hợp.</td></tr>
                                    ) : orders.map(o => (
                                        <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: 700 }}>{o.maDH}</td>
                                            <td style={{ padding: '14px 16px' }}>{o.recipient_name}</td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#64748b' }}>
                                                <div>{o.recipient_phone}</div>
                                                <div>{o.shipping_address}</div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#dc2626' }}>
                                                {Number(o.final_amount).toLocaleString('vi-VN')} đ
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0' }}>
                                                    {o.payment?.payment_method?.toUpperCase() || 'COD'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <select
                                                    value={o.status}
                                                    onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.8rem', outline: 'none' }}
                                                >
                                                    <option value="pending">Chờ duyệt (pending)</option>
                                                    <option value="confirmed">Xác nhận (confirmed)</option>
                                                    <option value="shipping">Đang giao (shipping)</option>
                                                    <option value="completed">Hoàn tất (completed)</option>
                                                    <option value="cancelled">Hủy đơn (cancelled)</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>{o.details?.length || 0} món</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: QUẢN LÝ SẢN PHẨM & KHO --- */}
                {tab === 'products' && <ProductCategoryManagement />}

                {/* --- TAB 4: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN --- */}
                {tab === 'users' && <UserManagement />}

                {/* --- TAB 5: BÁO CÁO & PHÂN TÍCH TÀI CHÍNH --- */}
                {tab === 'analytics' && <FinancialAnalytics />}

                {tab === 'vouchers' && <VoucherManagement />}

                {tab === 'settings' && <SystemSettings />}

            </main>
        </div>
    );
}