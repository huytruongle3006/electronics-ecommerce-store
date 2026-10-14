import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// APIs Xác thực
export const loginApi = (data) => api.post('/login', data);
export const registerApi = (data) => api.post('/register', data);
export const getProfileApi = () => api.get('/profile');
export const logoutApi = () => api.post('/logout');
// APIs Sản phẩm & Bảo hành
export const getProducts = () => api.get('/products');
export const getProductDetail = (id) => api.get(`/products/${id}`);
export const getCategories = () => api.get('/categories');
export const checkWarranty = (serial_number) => api.post('/warranties/check', { serial_number });
// Cart APIs (Database Sync)
export const getCartApi = () => api.get('/cart');
export const addToCartApi = (product_id, quantity = 1) => api.post('/cart/add', { product_id, quantity });
export const updateCartItemApi = (item_id, quantity) => api.put(`/cart/items/${item_id}`, { quantity });
export const removeCartItemApi = (item_id) => api.delete(`/cart/items/${item_id}`);
// Order / Checkout APIx
export const getMyOrdersApi = () => api.get('/orders/my-orders');
export const getOrderDetailApi = (id) => api.get(`/orders/${id}`);
export const checkoutApi = (data) => api.post('/checkout', data);

//Review API
export const getProductReviews = (productId) => api.get(`/products/${productId}/reviews`);
export const submitReviewApi = (productId, data) => api.post(`/products/${productId}/reviews`, data);

// Admin APIs
export const getAdminStatsApi = () => api.get('/admin/dashboard');
export const getAdminOrdersApi = (status = 'all', search = '', page = 1) =>
    api.get(`/admin/orders?status=${status}&search=${encodeURIComponent(search)}&page=${page}`);

export const updateOrderStatusApi = (id, status) =>
    api.put(`/admin/orders/${id}/status`, { status });

export const createProductApi = (data) => api.post('/admin/products', data);
export const updateProductApi = (id, data) => api.put(`/admin/products/${id}`, data);
export const deleteProductApi = (id) => api.delete(`/admin/products/${id}`);

// Quản lý người dùng & Vai trò
export const getAdminUsersApi = (search = '', roleId = 'all', page = 1) =>
    api.get(`/admin/users?search=${encodeURIComponent(search)}&role_id=${roleId}&page=${page}`);

export const getAllRolesApi = () => api.get('/admin/roles');

export const updateUserRoleApi = (userId, roleId) =>
    api.put(`/admin/users/${userId}/role`, { role_id: roleId });

export const toggleUserStatusApi = (userId) =>
    api.put(`/admin/users/${userId}/toggle-status`);
// Quản lý Danh mục (Admin)
export const getAdminCategoriesApi = () => api.get('/admin/categories');
export const createCategoryApi = (data) => api.post('/admin/categories', data);
export const updateCategoryApi = (id, data) => api.put(`/admin/categories/${id}`, data);
export const deleteCategoryApi = (id) => api.delete(`/admin/categories/${id}`);

// Quản lý Sản phẩm (Admin)
export const getAdminProductsApi = (search = '', categoryId = 'all', status = 'all', page = 1) =>
    api.get(`/admin/products?search=${encodeURIComponent(search)}&category_id=${categoryId}&status=${status}&page=${page}`);
export const getFinancialReportApi = () => api.get('/admin/analytics/financial');

// Quản lý Vouchers
export const getAdminVouchersApi = (search = '', status = 'all', page = 1) =>
    api.get(`/admin/vouchers?search=${encodeURIComponent(search)}&status=${status}&page=${page}`);

export const createVoucherApi = (data) => api.post('/admin/vouchers', data);
export const updateVoucherApi = (id, data) => api.put(`/admin/vouchers/${id}`, data);
export const toggleVoucherStatusApi = (id) => api.put(`/admin/vouchers/${id}/toggle`);
export const deleteVoucherApi = (id) => api.delete(`/admin/vouchers/${id}`);

// Cấu hình hệ thống (Admin)
export const getAdminSettingsApi = () => api.get('/admin/settings');
export const updateAdminSettingsApi = (data) => api.post('/admin/settings', data);
export default api;