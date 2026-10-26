import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import Navbar from './components/Navbar';
import useStoreCart from './hooks/useStoreCart';
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
    getProducts, getCategories, logoutApi,

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
function App() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isMyReviewsOpen, setIsMyReviewsOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [resetData, setResetData] = useState(() => parsePasswordResetLink(window.location));
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');


    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
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
    useEffect(() => { setIsWishlistOpen(false); setIsMyReviewsOpen(false); setSelectedProductId(null); }, [currentUser?.id]);
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
    
    // Tải danh sách sản phẩm & danh mục
    useEffect(() => {
        getProducts()
            .then((res) => {
                const items = res.data.data?.data || res.data.data || [];
                setProducts(items);
            })
            .catch((err) => console.error('Lỗi nạp sản phẩm:', err))
            .finally(() => setLoading(false));

        getCategories()
            .then((res) => setCategories(res.data.data || []))
            .catch(() => {
                setCategories([
                    { id: 1, tenLoai: 'Laptop' },
                    { id: 2, tenLoai: 'Điện thoại' },
                    { id: 3, tenLoai: 'Máy tính bảng' },
                    { id: 4, tenLoai: 'Bàn phím & Chuột' },
                ]);
            });
    }, []);

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

    // Bộ lọc sản phẩm
    const filteredProducts = useMemo(() => {
        return products
            .filter(p => {
                const matchSearch = p.tenSP.toLowerCase().includes(searchQuery.toLowerCase());
                const matchCat = selectedCategory === 'ALL' || p.category_id === Number(selectedCategory);
                return matchSearch && matchCat;
            })
            .sort((a, b) => {
                if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
                if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
                return b.id - a.id;
            });
    }, [products, searchQuery, selectedCategory, sortBy]);


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
        return <AdminDashboard onBackToStore={() => setIsAdminView(false)} />;
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
                onOpenWarranty={() => setIsWarrantyOpen(true)}
                onResetFilter={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onLogout={handleLogout}
                onOpenMyReviews={() => setIsMyReviewsOpen(true)}
                onOpenOrders={() => setIsOrdersOpen(true)}
                onOpenAccount={() => setIsAccountOpen(true)}
                onOpenAdmin={() => setIsAdminView(true)}
            />

            <div style={{ maxWidth: '1240px', margin: '20px auto 0', padding: '0 20px' }}>
                <FilterBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    sortBy={sortBy}
                    onSelectSort={setSortBy}
                />
            </div>

            {currentUser && wishlist.error && <div role="alert" style={{ maxWidth: 1200, margin: '16px auto', padding: 16, background: '#fff1f2' }}>{wishlist.error} <button onClick={wishlist.reload}>Tải lại yêu thích</button></div>}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}><CartSyncNotice cart={cart} /></div>
            <main style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 20px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>Đang tải danh sách thiết bị...</div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', backgroundColor: '#fff', borderRadius: '12px' }}>
                        <AlertCircle size={48} color="#94a3b8" />
                        <p>Không tìm thấy sản phẩm phù hợp</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
                        {filteredProducts.map(p => (
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
            </main>

            {isAccountOpen && currentUser && <AccountModal key={currentUser.id}
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
            {isCheckoutOpen && currentUser && <CheckoutModal key={currentUser.id}
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                totalAmount={cartTotal}
                user={currentUser}
                onOrderSuccess={() => {
                    // Xóa giỏ hàng local và tải lại giỏ trống từ DB
                    
                    loadCartFromDB();
                }}
            />}
            {isMyReviewsOpen && currentUser && <MyReviewsModal key={currentUser.id}
                onClose={() => setIsMyReviewsOpen(false)}
                onViewProduct={id => { setIsMyReviewsOpen(false); setSelectedProductId(id); }} />}
            {isWishlistOpen && currentUser && <WishlistModal key={currentUser.id} wishlist={wishlist}
                onClose={() => setIsWishlistOpen(false)}
                onViewDetail={id => { setIsWishlistOpen(false); setSelectedProductId(id); }}
                onAddToCart={addToCart} />}
            {selectedProductId && <ProductDetailModal key={selectedProductId}
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
            <MyOrdersModal
                isOpen={isOrdersOpen}
                onOrderChanged={() => {
                    getProducts().then(res => setProducts(res.data.data?.data || res.data.data || []))
                        .catch(err => console.error('Không tải lại được tồn kho:', err));
                }}
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
