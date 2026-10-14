import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import Navbar from './components/Navbar';
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
    getCartApi, addToCartApi, updateCartItemApi, removeCartItemApi
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
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');

    const [cartItems, setCartItems] = useState([]);
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

    // Đồng bộ giỏ hàng từ Database nếu user đã đăng nhập
    const loadCartFromDB = () => {
        if (currentUser) {
            getCartApi()
                .then((res) => {
                    if (res.data.success) {
                        setCartItems(res.data.items || []);
                    }
                })
                .catch((err) => console.error('Lỗi nạp giỏ hàng:', err));
        }
    };

    useEffect(() => {
        loadCartFromDB();
    }, [currentUser]);

    // Đăng xuất
    const handleLogout = async () => {
        try { await logoutApi(); } catch (e) { }
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        setCurrentUser(null);
        setIsAdminView(false); // Quay lại trang store khách hàng
        setCartItems([]);
    };

    // Thêm vào giỏ hàng (Đồng bộ Database nếu đã đăng nhập)
    const addToCart = async (product) => {
        if (currentUser) {
            try {
                await addToCartApi(product.id, 1);
                loadCartFromDB(); // Nạp lại giỏ mới nhất từ database
            } catch (err) {
                alert(err.response?.data?.message || 'Không thể thêm vào giỏ hàng');
            }
        } else {
            // Nếu chưa đăng nhập, lưu tạm trong bộ nhớ State
            setCartItems(prev => {
                const exist = prev.find(i => i.id === product.id);
                if (exist) {
                    return prev.map(i => i.id === product.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
                }
                return [...prev, { ...product, quantity: 1, product: product }];
            });
        }
    };

    // Thay đổi số lượng
    const updateCartQty = async (itemId, delta) => {
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;

        const currentQty = item.quantity || item.cartQty || 1;
        const newQty = currentQty + delta;

        if (newQty <= 0) {
            removeFromCart(itemId);
            return;
        }

        if (currentUser) {
            try {
                await updateCartItemApi(itemId, newQty);
                loadCartFromDB();
            } catch (err) {
                alert(err.response?.data?.message || 'Lỗi cập nhật số lượng');
            }
        } else {
            setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
        }
    };

    // Xóa món hàng
    const removeFromCart = async (itemId) => {
        if (currentUser) {
            try {
                await removeCartItemApi(itemId);
                loadCartFromDB();
            } catch (err) {
                alert('Không thể xóa sản phẩm khỏi giỏ hàng');
            }
        } else {
            setCartItems(prev => prev.filter(i => i.id !== itemId));
        }
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


    if (isAdminView) {
        return <AdminDashboard onBackToStore={() => setIsAdminView(false)} />;
    }
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

            <Navbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                cartCount={totalCount}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenWarranty={() => setIsWarrantyOpen(true)}
                onResetFilter={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onLogout={handleLogout}
                onOpenOrders={() => setIsOrdersOpen(true)}
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
                                onAddToCart={addToCart}
                                onViewDetail={(id) => setSelectedProductId(id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Drawer Giỏ hàng */}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
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
                onClose={() => setIsWarrantyOpen(false)}
            />

            {/* Modal Đăng nhập / Đăng ký */}
            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    loadCartFromDB();
                    if (checkIsAdmin(user)) {
                        setIsAdminView(true);
                    }
                }}
            />

            {/* Modal Thanh toán Checkout */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                totalAmount={cartTotal}
                user={currentUser}
                onOrderSuccess={() => {
                    // Xóa giỏ hàng local và tải lại giỏ trống từ DB
                    setCartItems([]);
                    loadCartFromDB();
                }}
            />
            <ProductDetailModal
                productId={selectedProductId}
                isOpen={!!selectedProductId}
                onClose={() => setSelectedProductId(null)}
                user={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                onAddToCart={(product, qty) => {
                    for (let i = 0; i < qty; i++) {
                        addToCart(product);
                    }
                }}
            />
            <MyOrdersModal
                isOpen={isOrdersOpen}
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