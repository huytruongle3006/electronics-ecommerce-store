import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import Navbar from './components/Navbar';
import ProductAdvisor from './components/ProductAdvisor';
import RecentlyViewed from './components/RecentlyViewed';
import { CustomerVoucherModal } from './components/CustomerVouchers';
import { SupportModal } from './components/SupportCenter';
import useRecentlyViewed from './hooks/useRecentlyViewed';
import useStoreCart from './hooks/useStoreCart';
import useProductCatalog from './hooks/useProductCatalog';
import CartSyncNotice from './components/CartSyncNotice';
import WishlistModal from './components/WishlistModal';
import MyReviewsModal from './components/MyReviewsModal';
import useWishlist from './hooks/useWishlist';
import AccountModal from './components/AccountModal';
import PasswordRecovery, { parsePasswordResetLink } from './components/PasswordRecovery';
import FilterBar from './components/FilterBar';
import MyOrdersModal from './components/MyOrdersModal';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import WarrantyModal from './components/WarrantyModal';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import ProductDetailModal from './components/ProductDetailModal';
import AdminDashboard from './components/AdminDashboard';
import {
    getCategories, logoutApi,

} from './services/api';
import { AlertCircle } from 'lucide-react';
const checkIsAdmin = (user) => {
    if (!user) return false;
    
    // 1. Kiểm tra email admin trực tiếp (đảm bảo ăn ngay 100%)
    if (user.email === 'admin@store.com' || user.email === 'admin@gmail.com') {
        return true;
    }

    // 2. Kiểm tra cờ is_admin
    if (user.is_admin === true) return true;

    // 3. Kiểm tra mảng roles_list
    if (Array.isArray(user.roles_list) && user.roles_list.includes('ADMIN')) {
        return true;
    }

    // 4. Kiểm tra theo đúng cột `maRole` trong DB của bạn
    if (Array.isArray(user.roles)) {
        return user.roles.some(r => 
            (typeof r === 'string' && r === 'ADMIN') || 
            r.maRole === 'ADMIN' || 
            r.tenRole === 'Quản trị viên'
        );
    }

    return false;
};
export function App() {
    const catalog = useProductCatalog();
    const {items: products,loading} = catalog;
    const [categories, setCategories] = useState([]);
    const [categoryError, setCategoryError] = useState('');
    const [categoryRevision, setCategoryRevision] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isMyReviewsOpen, setIsMyReviewsOpen] = useState(false);
    const [isVouchersOpen, setIsVouchersOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [supportTarget, setSupportTarget] = useState(null);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [resetData, setResetData] = useState(() => parsePasswordResetLink(window.location));
    const searchQuery = catalog.query.search;
    const selectedCategory = catalog.query.category_id;
    const sortBy = catalog.query.sort;
    const setSearchQuery = search => catalog.update({search});
    const setSelectedCategory = category_id => catalog.update({category_id});
    const setSortBy = sort => catalog.update({sort});


    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
    const [notificationTarget, setNotificationTarget] = useState(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);


    // User State
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user_info');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    const cart = useStoreCart(currentUser);
    const recent = useRecentlyViewed(currentUser);
    const cartItems = cart.items;
    const loadCartFromDB = cart.load, addToCart = cart.add, updateCartQty = cart.update, removeFromCart = cart.remove;
    useEffect(() => {
        const syncAccount = event => {
            if (event.key !== 'user_info') return;
            try { setCurrentUser(JSON.parse(localStorage.getItem('user_info') || 'null')); }
            catch { setCurrentUser(null); }
        };
        window.addEventListener('storage', syncAccount);
        return () => window.removeEventListener('storage', syncAccount);
    }, []);
    const wishlist = useWishlist(currentUser);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    useEffect(() => { setIsWishlistOpen(false); setIsMyReviewsOpen(false); setIsVouchersOpen(false); setIsSupportOpen(false); setSupportTarget(null); setSelectedProductId(null); }, [currentUser?.id]);
    const toggleFavorite = product => {
        if (!currentUser) { setSelectedProductId(null); setIsAuthOpen(true); return; }
        return wishlist.toggle(product);
    };

    const [isAdminView, setIsAdminView] = useState(() => {
        try {
            const saved = localStorage.getItem('user_info');
            if (!saved) return false;
            const userObj = JSON.parse(saved);
            return checkIsAdmin(userObj);
        } catch (e) {
            return false;
        }
    });
    
    useEffect(() => {
        let live = true;
        setCategoryError('');
        getCategories().then(({data}) => { if(live)setCategories(data.data || []); })
            .catch(() => { if(live)setCategoryError('Không tải được danh mục. Bạn vẫn có thể tìm theo tên, giá hoặc tồn kho.'); });
        return () => { live = false; };
    }, [categoryRevision]);
    const handleLogout = async () => {
        try { await logoutApi(); } catch {}
        localStorage.removeItem('access_token'); localStorage.removeItem('user_info');
        setCurrentUser(null); setIsAccountOpen(false); setIsAdminView(false); setIsCartOpen(false); setIsCheckoutOpen(false);
    };

    // Tính tổng tiền
    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const price = Number(item.product?.price || item.price || 0);
            const qty = Number(item.quantity || item.cartQty || 1);
            return sum + (price * qty);
        }, 0);
    }, [cartItems]);

    const totalCount = useMemo(() => {
        return cartItems.reduce((total, item) => total + (item.quantity || item.cartQty || 1), 0);
    }, [cartItems]);

    const leaveRecovery = (login = false) => {
        setIsRecoveryOpen(false);
        setResetData(null);
        if (window.location.pathname.replace(/\/$/, '') === '/reset-password') {
            window.history.replaceState({}, '', '/');
        }
        setIsAuthOpen(login);
        if (login) setIsAdminView(false);
    };

    if (resetData || isRecoveryOpen) {
        return <PasswordRecovery resetData={resetData}
            onClose={() => leaveRecovery()}
            onLogin={() => leaveRecovery(true)}
            onResetComplete={() => {
                window.history.replaceState({}, '', '/reset-password');
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
                setCurrentUser(null);
                
                setIsAdminView(false);
                setIsAccountOpen(false);
            }}
        />;
    }

    if (isAdminView) {
        return <AdminDashboard key={`admin:${currentUser?.id||'guest'}`} userId={currentUser?.id} onBackToStore={() => {setIsAdminView(false);catalog.reload();setCategoryRevision(value=>value+1);}} />;
    }
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

            <Navbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                favoriteCount={wishlist.items.length}
                onOpenFavorites={() => {
                    if (!currentUser) { setIsAuthOpen(true); return; }
                    wishlist.reload(); setIsWishlistOpen(true);
                }}
                cartBusy={cart.busy}
                cartCount={totalCount}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWarranty={() => { setNotificationTarget(null); setIsWarrantyOpen(true); }}
                onResetFilter={catalog.reset}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onLogout={handleLogout}
                onOpenMyReviews={() => setIsMyReviewsOpen(true)}
                onOpenOrders={() => { setNotificationTarget(null); setIsOrdersOpen(true); }}
                onOpenNotification={notification => {
                    setIsAccountOpen(false); setIsWishlistOpen(false); setIsMyReviewsOpen(false);
                    setIsCheckoutOpen(false); setSelectedProductId(null);
                    setNotificationTarget({ ...notification, owner_id: currentUser.id });
                    if(notification.target_type==='support'){setSupportTarget({id:notification.target_id,owner_id:currentUser.id});setIsSupportOpen(true);setIsOrdersOpen(false);setIsWarrantyOpen(false);}
                    else if (notification.target_type === 'warranty') { setIsSupportOpen(false); setIsOrdersOpen(false); setIsWarrantyOpen(true); }
                    else { setIsSupportOpen(false); setIsWarrantyOpen(false); setIsOrdersOpen(true); }
                }}
                onOpenAccount={() => setIsAccountOpen(true)}
                onOpenVouchers={() => setIsVouchersOpen(true)}
                onOpenSupport={() => {setSupportTarget(null);setIsSupportOpen(true);}}
                onOpenAdmin={() => setIsAdminView(true)}
            />

            <div style={{ maxWidth: '1240px', margin: '20px auto 0', padding: '0 20px' }}>
                <FilterBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    sortBy={sortBy}
                    onSelectSort={setSortBy}
                    filters={catalog.query}
                    onApplyFilters={catalog.update}
                    onReset={catalog.reset}
                />
                {categoryError&&<p role="alert" style={{color:'#b91c1c'}}>{categoryError} <button type="button" onClick={()=>setCategoryRevision(value=>value+1)}>Tải lại danh mục</button></p>}
            </div>

            {currentUser && wishlist.error && <div role="alert" style={{ maxWidth: 1200, margin: '16px auto', padding: 16, background: '#fff1f2' }}>{wishlist.error} <button onClick={wishlist.reload}>Tải lại yêu thích</button></div>}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}><CartSyncNotice cart={cart} /></div>
            <main style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 20px' }}>
                <div style={{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',marginBottom:16}}><p role="status">{loading?'Đang tìm sản phẩm...':`${catalog.total} sản phẩm phù hợp · Trang ${catalog.current_page}/${catalog.last_page}`}</p><button type="button" disabled={loading} onClick={catalog.reload} style={{padding:'9px 12px',background:'#fff',border:'1px solid #cbd5e1',borderRadius:8,color:'#1d4ed8'}}>Làm mới sản phẩm</button></div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>Đang tải danh sách thiết bị...</div>
                ) : catalog.error ? <p role="alert" style={{color:'#b91c1c'}}>{catalog.error} <button type="button" onClick={catalog.reload}>Thử tải lại sản phẩm</button></p> : products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', backgroundColor: '#fff', borderRadius: '12px' }}>
                        <AlertCircle size={48} color="#94a3b8" />
                        <p>Không tìm thấy sản phẩm phù hợp</p>
                        <button type="button" onClick={catalog.reset}>Xóa bộ lọc để xem tất cả</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
                        {products.map(p => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                isFavorite={wishlist.has(p.id)}
                                favoriteBusy={!!currentUser && (wishlist.loading || wishlist.busy || !!wishlist.error)}
                                onToggleFavorite={toggleFavorite}
                                onAddToCart={addToCart}
                                onViewDetail={(id) => setSelectedProductId(id)}
                            />
                        ))}
                    </div>
                )}
                {!catalog.error&&catalog.last_page>1&&<nav aria-label="Phân trang sản phẩm" style={{display:'flex',gap:12,alignItems:'center',justifyContent:'center',marginTop:22}}><button type="button" disabled={loading||catalog.query.page<=1} onClick={()=>catalog.goToPage(catalog.query.page-1)} style={{padding:10}}>Trang trước</button><span>{catalog.current_page}/{catalog.last_page}</span><button type="button" disabled={loading||catalog.query.page>=catalog.last_page} onClick={()=>catalog.goToPage(catalog.query.page+1)} style={{padding:10}}>Trang sau</button></nav>}
            </main>

            <RecentlyViewed key={`recent:${currentUser?.id || 'guest'}`} recent={recent} cartBusy={cart.busy} onAddToCart={addToCart} onViewDetail={id => setSelectedProductId(id)} />
            {isSupportOpen&&currentUser&&<SupportModal key={`support:${currentUser.id}`} userId={currentUser.id} initialThreadId={supportTarget?.owner_id===currentUser.id?supportTarget.id:null} onClose={()=>setIsSupportOpen(false)}/>}
            {isVouchersOpen && currentUser && <CustomerVoucherModal key={`vouchers:${currentUser.id}`}
                onClose={() => setIsVouchersOpen(false)} onOpenCart={() => {setIsVouchersOpen(false);setIsCartOpen(true);}} />}
            {isAccountOpen && currentUser && <AccountModal key={`account:${currentUser.id}`}
                user={currentUser}
                onClose={() => setIsAccountOpen(false)}
                onUpdated={(updated) => {
                    const merged = { ...currentUser, ...updated };
                    localStorage.setItem('user_info', JSON.stringify(merged));
                    setCurrentUser(merged);
                }}
                onPasswordChanged={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_info');
                    setCurrentUser(null);
                    
                    setIsAdminView(false);
                    setIsAccountOpen(false);
                    alert('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
                    setIsAuthOpen(true);
                }}
                onSessionExpired={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_info');
                    setCurrentUser(null);
                    
                    setIsAdminView(false);
                    setIsAccountOpen(false);
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    setIsAuthOpen(true);
                }}
            />}
            <ProductAdvisor key={`advisor:${currentUser?.id || 'guest'}`} cartBusy={cart.busy}
                onViewProduct={id => setSelectedProductId(id)} onAddToCart={addToCart} />
            {/* Drawer Giỏ hàng */}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                busy={cart.busy || !!cart.error}
                notice={<CartSyncNotice cart={cart} />}
                cartItems={cartItems}
                onUpdateQty={updateCartQty}
                onRemoveItem={removeFromCart}
                totalAmount={cartTotal}
                onOpenCheckout={() => {
                    if (!currentUser) {
                        alert('Vui lòng đăng nhập trước khi tiến hành thanh toán!');
                        setIsCartOpen(false);
                        setIsAuthOpen(true);
                        return;
                    }
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                }}
            />

            {/* Modal Tra cứu Bảo hành */}
            <WarrantyModal
                isOpen={isWarrantyOpen}
                initialWarrantyId={notificationTarget?.owner_id === currentUser?.id && notificationTarget?.target_type === 'warranty' ? notificationTarget.target_id : null}
                user={currentUser}
                onClose={() => setIsWarrantyOpen(false)}
            />

            {/* Modal Đăng nhập / Đăng ký */}
            {isAuthOpen && <AuthModal
                isOpen={isAuthOpen}
                onForgotPassword={() => { setIsAuthOpen(false); setIsRecoveryOpen(true); }}
                onClose={() => setIsAuthOpen(false)}
                onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    if (checkIsAdmin(user)) {
                        setIsAdminView(true);
                    }
                }}
            />}

            {/* Modal Thanh toán Checkout */}
            {isCheckoutOpen && currentUser && <CheckoutModal key={`checkout:${currentUser.id}`}
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                totalAmount={cartTotal}
                user={currentUser}
                onOrderSuccess={() => {
                    // Xóa giỏ hàng local và tải lại giỏ trống từ DB
                    
                    loadCartFromDB();
                    catalog.reload();
                }}
            />}
            {isMyReviewsOpen && currentUser && <MyReviewsModal key={`reviews:${currentUser.id}`}
                onClose={() => setIsMyReviewsOpen(false)}
                onViewProduct={id => { setIsMyReviewsOpen(false); setSelectedProductId(id); }} />}
            {isWishlistOpen && currentUser && <WishlistModal key={`wishlist:${currentUser.id}`} wishlist={wishlist}
                onClose={() => setIsWishlistOpen(false)}
                onViewDetail={id => { setIsWishlistOpen(false); setSelectedProductId(id); }}
                onAddToCart={addToCart} />}
            {selectedProductId && <ProductDetailModal key={`detail:${currentUser?.id || 'guest'}:${selectedProductId}`}
                onViewed={recent.record}
                isFavorite={wishlist.has(selectedProductId)}
                favoriteBusy={!!currentUser && (wishlist.loading || wishlist.busy || !!wishlist.error)}
                onToggleFavorite={toggleFavorite}
                productId={selectedProductId}
                isOpen={!!selectedProductId}
                onClose={() => setSelectedProductId(null)}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onAddToCart={addToCart}
            />}
            <MyOrdersModal key={`orders:${currentUser?.id || 'guest'}:${notificationTarget?.id || ''}`}
                userId={currentUser?.id} onRebuy={cart.rebuy} cartBusy={cart.busy}
                onOpenCart={() => { setIsOrdersOpen(false); setIsCartOpen(true); }}
                initialOrderId={notificationTarget?.owner_id === currentUser?.id && notificationTarget?.target_type === 'order' ? notificationTarget.target_id : null}
                isOpen={isOrdersOpen}
                onOrderChanged={catalog.reload}
                onClose={() => setIsOrdersOpen(false)}
            />
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    if (!container._reactRoot) {
        container._reactRoot = ReactDOM.createRoot(container);
    }
    container._reactRoot.render(<App />);
}

