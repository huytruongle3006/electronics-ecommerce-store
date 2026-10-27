
import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import ProductCategoryManagement from './ProductCategoryManagement';

import FinancialAnalytics from './FinancialAnalytics'; // ✅ Đã bổ sung import
import VoucherManagement from './VoucherManagement'; // 👈 Thêm dòng này
import SystemSettings from './SystemSettings';
import InventoryManagement from './InventoryManagement';
import ReturnManagement from './ReturnManagement';
import WarrantyManagement from './WarrantyManagement';
import OrderManagement from './OrderManagement';
import {
    LayoutDashboard, ShoppingBag, Package, DollarSign, Users,
    AlertTriangle, ArrowLeft, BarChart3, RefreshCw, Ticket,Settings
} from 'lucide-react';
import {
    getAdminStatsApi
} from '../services/api';

export default function AdminDashboard({ onBackToStore }) {
    const [tab, setTab] = useState('stats'); // 'stats' | 'orders' | 'products' | 'users' | 'analytics'
    const [initialOrderId, setInitialOrderId] = useState(null);

    // --- STATE TAB: TỔNG QUAN ---
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

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

    useEffect(() => { if (tab === 'stats') loadStats(); }, [tab]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

            {/* SIDEBAR BÊN TRÁI */}
            <aside style={{ width: '250px', flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh', maxHeight: '100dvh', overflow: 'hidden', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexShrink: 0, padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ backgroundColor: '#2563eb', padding: '6px', borderRadius: '8px' }}>⚡</div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.5px' }}>ADMIN PANEL</span>
                </div>

                <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
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
                        onClick={() => {setInitialOrderId(null);setTab('orders');}}
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
                        Sản phẩm & Danh mục
                    </button>

                    <button type="button" onClick={() => setTab('inventory')}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 0, background: tab === 'inventory' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                        <Package size={18} /> Kho & nhập hàng
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
                    <button type="button" onClick={() => setTab('returns')}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 0, background: tab === 'returns' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                        <ShoppingBag size={18} /> Trả hàng & hoàn tiền
                    </button>
                    <button type="button" onClick={() => setTab('warranties')}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 0, background: tab === 'warranties' ? '#2563eb' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                        <Package size={18} /> Bảo hành
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

                <div style={{ flexShrink: 0, padding: '16px' }}>
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
            <main style={{ flex: 1, minWidth: 0, padding: '30px', overflowY: 'auto' }}>

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
                                                    <td style={{ padding: '12px 10px', fontWeight: 700 }}><button type="button" onClick={()=>{setInitialOrderId(o.id);setTab('orders');}} aria-label={`Mở đơn gần đây ${o.maDH}`} style={{border:0,background:'transparent',padding:0,color:'#1d4ed8',fontWeight:700,cursor:'pointer'}}>{o.maDH}</button></td>
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
                {tab === 'orders' && <OrderManagement initialOrderId={initialOrderId} />}

                {/* --- TAB 3: QUẢN LÝ SẢN PHẨM & KHO --- */}
                {tab === 'products' && <ProductCategoryManagement />}
                {tab === 'inventory' && <InventoryManagement />}
                {tab === 'returns' && <ReturnManagement />}
                {tab === 'warranties' && <WarrantyManagement />}

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

