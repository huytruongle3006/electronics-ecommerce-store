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
export const forgotPasswordApi = (data) => api.post('/forgot-password', data);
export const resetPasswordApi = (data) => api.post('/reset-password', data);
export const getProfileApi = () => api.get('/profile');
export const updateProfileApi = (data) => api.put('/profile', data);
export const changePasswordApi = (data) => api.put('/profile/password', data);
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
export const cancelOrderApi = (id, reason) => api.post(`/orders/${id}/cancel`, { reason });
export const getOrderDetailApi = (id) => api.get(`/orders/${id}`);
export const confirmOrderReceivedApi = (id) => api.post(`/orders/${id}/received`, {confirm_received:true}, {timeout:15000});
export const getAdminDeliveryApi = (id) => api.get(`/admin/orders/${id}/delivery`, {timeout:12000});
export const updateOrderDeliveryApi = (id, data) => api.put(`/admin/orders/${id}/delivery`, data, {timeout:15000});
export const checkoutApi = (data) => api.post('/checkout', data);
export const getCustomerVouchersApi = (page = 1, signal) => api.get('/vouchers', { params: {page}, signal, timeout: 12000 });
export const previewVoucherApi = (code, signal) => api.post('/vouchers/preview', {code}, {signal, timeout: 12000});

//Review API
export const getProductReviews = (productId, params = {}) => api.get(`/products/${productId}/reviews`, { params });
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
export const getSuppliersApi = () => api.get('/admin/suppliers');
export const saveSupplierApi = (data, id = null) => id ? api.put(`/admin/suppliers/${id}`, data) : api.post('/admin/suppliers', data);
export const getInventorySummaryApi = () => api.get('/admin/inventory/summary');
export const getInventoryProductsApi = (params = {}) => api.get('/admin/inventory/products', { params });
export const getImportReceiptsApi = (params = {}) => api.get('/admin/import-receipts', { params });
export const getImportReceiptApi = (id) => api.get(`/admin/import-receipts/${id}`);
export const createImportReceiptApi = (data) => api.post('/admin/import-receipts', data);
export const getOrderReturnApi = (id) => api.get(`/orders/${id}/return-request`);
export const createOrderReturnApi = (id, data) => api.post(`/orders/${id}/return-request`, data);
export const getAdminReturnsApi = (params = {}) => api.get('/admin/return-requests', { params });
export const getAdminReturnApi = (id) => api.get(`/admin/return-requests/${id}`);
export const updateAdminReturnApi = (id, data) => api.put(`/admin/return-requests/${id}`, data);
export const confirmCodPaymentApi = (id, data) => api.post(`/admin/orders/${id}/confirm-cod`, data);
export const getMyWarrantiesApi = (page = 1) => api.get('/warranties/my', { params: { page } });
export const requestWarrantyServiceApi = (id, data) => api.post(`/warranties/${id}/service-requests`, data);
export const getAdminWarrantiesApi = (params = {}) => api.get('/admin/warranties', { params });
export const getWarrantyOrdersApi = (params = {}) => api.get('/admin/warranties/orders', { params });
export const createWarrantyApi = (data) => api.post('/admin/warranties', data);
export const getAdminWarrantyApi = (id) => api.get(`/admin/warranties/${id}`);
export const updateWarrantyStatusApi = (id, data) => api.put(`/admin/warranties/${id}/status`, data);
export const getWarrantyServicesApi = (params = {}) => api.get('/admin/warranty-services', { params });
export const getWarrantyServiceApi = (id) => api.get(`/admin/warranty-services/${id}`);
export const updateWarrantyServiceApi = (id, data) => api.put(`/admin/warranty-services/${id}`, data);

export const getWishlistApi = () => api.get('/wishlist');
export const saveFavoriteApi = (id) => api.put('/wishlist/'+id);
export const removeFavoriteApi = (id) => api.delete('/wishlist/'+id);

export const getMyReviewsApi = (page = 1) => api.get('/reviews/my', { params: { page } });
export const updateReviewApi = (id, data) => api.put('/reviews/'+id, data);
export const deleteReviewApi = (id) => api.delete('/reviews/'+id);

export const mergeGuestCartApi = (data) => api.post('/cart/merge', data);

export const getAddressesApi = () => api.get('/addresses');
export const createAddressApi = data => api.post('/addresses', data);
export const updateAddressApi = (id, data) => api.put('/addresses/'+id, data);
export const deleteAddressApi = id => api.delete('/addresses/'+id);
export const defaultAddressApi = id => api.put('/addresses/'+id+'/default');

export const getNotificationsApi = (page = 1) => api.get('/notifications', { params: { page } });
export const readNotificationApi = id => api.put('/notifications/'+id+'/read');
export const readAllNotificationsApi = through_id => api.put('/notifications/read-all', { through_id });
export const getMyWarrantyApi = id => api.get('/warranties/my/'+id);

export const getAdvisorOptionsApi = (signal) => api.get('/advisor/options', { signal });
export const askProductAdvisorApi = (data, signal) => api.post('/advisor/chat', data, { signal, timeout: 27000 });

export const getRebuyPreviewApi = id => api.get('/orders/'+id+'/rebuy', { timeout: 15000 });
export const rebuyOrderApi = (id, data) => api.post('/orders/'+id+'/rebuy', data, { timeout: 20000 });
export const getRecentlyViewedApi = (ids, signal) => api.post('/products/recently-viewed', { ids }, { signal, timeout: 12000 });
