import React, { useState, useEffect } from 'react';
import { 
  Package, FolderPlus, Plus, Search, Edit, Trash2, X, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { 
  getProducts, getCategories, 
  createProductApi, updateProductApi, deleteProductApi,
  createCategoryApi, updateCategoryApi, deleteCategoryApi 
} from '../services/api';

export default function ProductCategoryManagement() {
  const [subTab, setSubTab] = useState('products'); // 'products' | 'categories'

  // State Sản phẩm
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [prodPagination, setProdPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [prodLoading, setProdLoading] = useState(false);

  // Modal Sản phẩm
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({
    maSP: '',
    tenSP: '',
    category_id: '',
    price: '',
    quantity: '',
    warranty_months: 12,
    cpu: '',
    ram: '',
    vga: '',
    description: '',
    status: 'active'
  });

  // State Danh mục
  const [catLoading, setCatLoading] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ tenLoai: '', mota: '' });

  // Tải danh mục
  // 1. Tải danh mục (dùng getCategories chung đã hoạt động tốt)
  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const res = await getCategories();
      const list = res.data.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    } finally {
      setCatLoading(false);
    }
  };

  // 2. Tải sản phẩm (dùng getProducts chung)
  const loadProducts = async () => {
    setProdLoading(true);
    try {
      const res = await getProducts();
      // Bóc tách đúng cấu trúc data trả về của Laravel
      let items = res.data?.data?.data || res.data?.data || res.data || [];
      
      // Lọc theo danh mục nếu có chọn
      if (selectedCat !== 'all') {
        items = items.filter(p => p.category_id === Number(selectedCat));
      }

      // Lọc theo trạng thái nếu có chọn
      if (selectedStatus !== 'all') {
        items = items.filter(p => p.status === selectedStatus);
      }

      // Tìm kiếm theo tên hoặc mã SP
      if (prodSearch.trim() !== '') {
        const q = prodSearch.toLowerCase();
        items = items.filter(p => 
          (p.tenSP && p.tenSP.toLowerCase().includes(q)) || 
          (p.maSP && p.maSP.toLowerCase().includes(q))
        );
      }

      setProducts(items);
      setProdPagination({
        current_page: 1,
        last_page: 1,
        total: items.length,
      });
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setProdLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (subTab === 'products') {
      loadProducts(1);
    }
  }, [subTab, selectedCat, selectedStatus]);

  const handleProdSearch = (e) => {
    e.preventDefault();
    loadProducts(1);
  };

  // Mở modal thêm/sửa sản phẩm
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      let specs = product.specifications;
      if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
      }
      setProdForm({
        maSP: product.maSP || '',
        tenSP: product.tenSP || '',
        category_id: product.category_id || (categories[0]?.id || ''),
        price: product.price || '',
        quantity: product.quantity ?? '',
        warranty_months: product.warranty_months ?? 12,
        cpu: specs?.cpu || '',
        ram: specs?.ram || '',
        vga: specs?.vga || '',
        description: product.description || '',
        status: product.status || 'active'
      });
    } else {
      setEditingProduct(null);
      setProdForm({
        maSP: 'SP_' + Math.floor(1000 + Math.random() * 9000),
        tenSP: '',
        category_id: categories[0]?.id || '',
        price: '',
        quantity: 10,
        warranty_months: 12,
        cpu: '',
        ram: '',
        vga: '',
        description: '',
        status: 'active'
      });
    }
    setIsProdModalOpen(true);
  };

  // Lưu sản phẩm
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = {
      maSP: prodForm.maSP,
      tenSP: prodForm.tenSP,
      category_id: Number(prodForm.category_id),
      price: Number(prodForm.price),
      quantity: Number(prodForm.quantity),
      warranty_months: Number(prodForm.warranty_months),
      description: prodForm.description,
      status: prodForm.status,
      specifications: {
        cpu: prodForm.cpu,
        ram: prodForm.ram,
        vga: prodForm.vga
      }
    };

    try {
      if (editingProduct) {
        await updateProductApi(editingProduct.id, payload);
      } else {
        await createProductApi(payload);
      }
      setIsProdModalOpen(false);
      loadProducts(prodPagination.current_page);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi lưu sản phẩm!');
    }
  };

  // Xóa / Vô hiệu hóa sản phẩm
  const handleDeleteProduct = async (product) => {
    if (confirm(`Bạn có chắc chắn muốn ngưng kinh doanh sản phẩm "${product.tenSP}"?`)) {
      try {
        await deleteProductApi(product.id);
        loadProducts(prodPagination.current_page);
      } catch (err) {
        alert('Lỗi thao tác xóa sản phẩm');
      }
    }
  };

  // Mở modal thêm/sửa danh mục
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ tenLoai: cat.tenLoai, mota: cat.mota || '' });
    } else {
      setEditingCategory(null);
      setCatForm({ tenLoai: '', mota: '' });
    }
    setIsCatModalOpen(true);
  };

  // Lưu danh mục
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategoryApi(editingCategory.id, catForm);
      } else {
        await createCategoryApi(catForm);
      }
      setIsCatModalOpen(false);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu danh mục!');
    }
  };

  // Xóa danh mục
  const handleDeleteCategory = async (cat) => {
    if (confirm(`Xóa danh mục "${cat.tenLoai}"? (Chỉ xóa được khi không có sản phẩm nào)`)) {
      try {
        await deleteCategoryApi(cat.id);
        loadCategories();
      } catch (err) {
        alert(err.response?.data?.message || 'Không thể xóa danh mục này!');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Thanh chuyển đổi Sản phẩm / Danh mục */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('products')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: subTab === 'products' ? '#0f172a' : '#e2e8f0',
              color: subTab === 'products' ? '#fff' : '#475569',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <Package size={16} />
            Kho Sản Phẩm ({prodPagination.total})
          </button>

          <button
            onClick={() => setSubTab('categories')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: subTab === 'categories' ? '#0f172a' : '#e2e8f0',
              color: subTab === 'categories' ? '#fff' : '#475569',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <FolderPlus size={16} />
            Danh Mục Thiết Bị ({categories.length})
          </button>
        </div>

        {subTab === 'products' ? (
          <button
            onClick={() => openProductModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Plus size={16} /> Thêm Thiết Bị
          </button>
        ) : (
          <button
            onClick={() => openCategoryModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Plus size={16} /> Thêm Danh Mục
          </button>
        )}
      </div>

      {/* --- PHÂN VÙNG 1: QUẢN LÝ SẢN PHẨM --- */}
      {subTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Bộ lọc & Tìm kiếm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.tenLoai}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang kinh doanh</option>
                <option value="inactive">Ngừng kinh doanh</option>
              </select>
            </div>

            <form onSubmit={handleProdSearch} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm mã SP, tên thiết bị..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '220px', outline: 'none' }}
                />
              </div>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Tìm
              </button>
            </form>
          </div>

          {/* Bảng sản phẩm */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Mã SP</th>
                  <th style={{ padding: '12px 16px' }}>Tên thiết bị</th>
                  <th style={{ padding: '12px 16px' }}>Danh mục</th>
                  <th style={{ padding: '12px 16px' }}>Giá bán</th>
                  <th style={{ padding: '12px 16px' }}>Tồn kho</th>
                  <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {prodLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp danh sách thiết bị...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có sản phẩm nào phù hợp.</td></tr>
                ) : products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.maSP}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.tenSP}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.category?.tenLoai || 'Chưa gán'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#dc2626' }}>
                      {Number(p.price).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: p.quantity <= 5 ? '#dc2626' : '#15803d' }}>
                      {p.quantity} chiếc
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: p.status === 'active' ? '#dcfce7' : '#fee2e2',
                        color: p.status === 'active' ? '#15803d' : '#b91c1c'
                      }}>
                        {p.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => openProductModal(p)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '10px' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteProduct(p)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phân trang sản phẩm */}
            {prodPagination.last_page > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', gap: '8px', borderTop: '1px solid #e2e8f0' }}>
                {Array.from({ length: prodPagination.last_page }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => loadProducts(page)}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                      backgroundColor: prodPagination.current_page === page ? '#2563eb' : '#fff',
                      color: prodPagination.current_page === page ? '#fff' : '#334155',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PHÂN VÙNG 2: QUẢN LÝ DANH MỤC --- */}
      {subTab === 'categories' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Mã DM</th>
                <th style={{ padding: '12px 16px' }}>Tên danh mục</th>
                <th style={{ padding: '12px 16px' }}>Mô tả</th>
                <th style={{ padding: '12px 16px' }}>Số sản phẩm</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {catLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang nạp danh mục...</td></tr>
              ) : categories.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>#{c.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{c.tenLoai}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{c.mota || 'Chưa có mô tả'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', fontWeight: 700, fontSize: '0.75rem' }}>
                      {c.products_count ?? 0} thiết bị
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button onClick={() => openCategoryModal(c)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '10px' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteCategory(c)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {isProdModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingProduct ? 'Cập Nhật Thiết Bị' : 'Thêm Thiết Bị Mới Vào Kho'}
              </h3>
              <button onClick={() => setIsProdModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Mã sản phẩm</label>
                  <input type="text" required disabled={!!editingProduct} value={prodForm.maSP} onChange={e => setProdForm({ ...prodForm, maSP: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tên thiết bị</label>
                  <input type="text" required value={prodForm.tenSP} onChange={e => setProdForm({ ...prodForm, tenSP: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Danh mục</label>
                  <select value={prodForm.category_id} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.tenLoai}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Trạng thái</label>
                  <select value={prodForm.status} onChange={e => setProdForm({ ...prodForm, status: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="active">Đang kinh doanh</option>
                    <option value="inactive">Ngừng kinh doanh</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Giá bán (đ)</label>
                  <input type="number" required value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tồn kho</label>
                  <input type="number" required value={prodForm.quantity} onChange={e => setProdForm({ ...prodForm, quantity: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Bảo hành (tháng)</label>
                  <input type="number" required value={prodForm.warranty_months} onChange={e => setProdForm({ ...prodForm, warranty_months: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>THÔNG SỐ KỸ THUẬT (CPU, RAM, GPU)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <input type="text" placeholder="CPU (vd: i7-13700H)" value={prodForm.cpu} onChange={e => setProdForm({ ...prodForm, cpu: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  <input type="text" placeholder="RAM (vd: 16GB DDR5)" value={prodForm.ram} onChange={e => setProdForm({ ...prodForm, ram: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  <input type="text" placeholder="VGA (vd: RTX 4060)" value={prodForm.vga} onChange={e => setProdForm({ ...prodForm, vga: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Mô tả sản phẩm</label>
                <textarea rows="2" value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>

              <button type="submit" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                {editingProduct ? 'Lưu Thay Đổi' : 'Thêm Thiết Bị'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA DANH MỤC */}
      {isCatModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tên danh mục</label>
                <input type="text" required placeholder="vd: Màn hình máy tính" value={catForm.tenLoai} onChange={e => setCatForm({ ...catForm, tenLoai: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Mô tả danh mục</label>
                <textarea rows="3" placeholder="Mô tả nhóm thiết bị..." value={catForm.mota} onChange={e => setCatForm({ ...catForm, mota: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>

              <button type="submit" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                {editingCategory ? 'Cập Nhật Danh Mục' : 'Tạo Danh Mục Mới'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}