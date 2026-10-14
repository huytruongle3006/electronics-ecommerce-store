import React from 'react';
import { Search, ShieldCheck, ShoppingCart, User, LogOut, Package, LayoutDashboard } from 'lucide-react';

export default function Navbar({
    searchQuery,
    setSearchQuery,
    cartCount,
    onOpenCart,
    onOpenWarranty,
    onResetFilter,
    user,
    onOpenAuth,
    onLogout,
    onOpenOrders,
    onOpenAdmin
}) {
    // Kiểm tra xem tài khoản hiện tại có phải là Admin hay không
    const isAdmin = user && (
        user.role === 'ADMIN' ||
        user.roles?.some(r => r.name === 'ADMIN') ||
        user.email === 'admin@store.com' ||
        user.email === 'admin@gmail.com'
    );

    return (
        <header style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{
                maxWidth: '1240px',
                margin: '0 auto',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px'
            }}>

                {/* 1. Logo & Tên cửa hàng */}
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={onResetFilter}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                    }}>
                        ⚡
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#0f172a' }}>
                            TECHSTORE
                        </h1>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '-2px' }}>
                            Hệ Thống Thiết Bị Điện Tử
                        </span>
                    </div>
                </div>
            
                {/* 2. Ô tìm kiếm sản phẩm */}
                <div style={{ flex: 1, maxWidth: '440px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm laptop, điện thoại, phụ kiện..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 16px 10px 42px',
                            borderRadius: '999px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            outline: 'none',
                            backgroundColor: '#f8fafc',
                            transition: 'border-color 0.2s, background-color 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.backgroundColor = '#ffffff';
                            e.target.style.borderColor = '#2563eb';
                        }}
                        onBlur={(e) => {
                            e.target.style.backgroundColor = '#f8fafc';
                            e.target.style.borderColor = '#cbd5e1';
                        }}
                    />
                </div>
    {/* Kiểm tra nếu tài khoản là Admin thì hiển thị thêm nút vào Admin Panel */}
                {(user?.is_admin || user?.email === 'admin@store.com' || user?.roles_list?.includes('ADMIN')) && (
                    <button
                        onClick={onOpenAdmin}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            backgroundColor: '#0f172a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.825rem',
                            cursor: 'pointer'
                        }}
                    >
                        ⚡ Vào Admin Panel
                    </button>
                )}
                {/* 3. Khu vực tương tác bên phải */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {/* Nút Tra cứu bảo hành */}
                    <button
                        onClick={onOpenWarranty}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                        <ShieldCheck size={18} color="#2563eb" />
                        <span>Bảo hành</span>
                    </button>
{/* 4. Nút Giỏ hàng */}
                    <button
                        onClick={onOpenCart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                        <ShoppingCart size={18} />
                        <span>Giỏ hàng</span>
                        <span style={{
                            backgroundColor: '#1d4ed8',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            {cartCount}
                        </span>
                    </button>
                    {/* Phân vùng: Đã đăng nhập vs Chưa đăng nhập */}
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>



                            {/* Nút Đơn hàng của tôi */}
                            <button
                                onClick={onOpenOrders}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                                <Package size={16} color="#2563eb" />
                                <span>Đơn hàng</span>
                            </button>

                            {/* Thông tin User & Nút Đăng xuất */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#f1f5f9',
                                padding: '5px 10px',
                                borderRadius: '8px'
                            }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem'
                                }}>
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#1e293b',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {user.full_name}
                                </span>
                                <button
                                    onClick={onLogout}
                                    title="Đăng xuất"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#dc2626',
                                        borderRadius: '4px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>

                        </div>
                    ) : (
                        /* Nút Đăng nhập khi chưa login */
                        <button
                            onClick={onOpenAuth}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            <User size={16} color="#2563eb" />
                            <span>Đăng nhập</span>
                        </button>
                    )}

                    
                </div>

            </div>
        </header>
    );
}