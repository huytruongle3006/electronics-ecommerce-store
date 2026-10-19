import React, { useEffect, useRef, useState } from 'react';
import { getSuppliersApi, saveSupplierApi, getInventorySummaryApi, getInventoryProductsApi, getImportReceiptsApi, getImportReceiptApi, createImportReceiptApi } from '../services/api';

const control = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', boxSizing: 'border-box', maxWidth: '100%' };
const button = { ...control, cursor: 'pointer', background: '#fff', color: '#334155', fontWeight: 600 };
const primary = { ...button, color: '#fff', background: '#2563eb', border: '1px solid #2563eb' };
const cell = { padding: '12px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' };
const money = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' đ';
const failure = error => error.response?.status === 403 ? 'Tài khoản không có quyền quản trị.' : error.response?.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.response?.data?.message || 'Không thể kết nối máy chủ. Nếu đang lưu phiếu, hãy thử lại cùng phiếu để tránh nhập trùng.';
const params = data => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ''));

function Modal({ title, busy, onClose, children }) {
    const dialog = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.current?.querySelector('button')?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    const keyDown = event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    return <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 16 }}>
        <section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label={title} style={{ background: '#fff', width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', borderRadius: 14, padding: 24, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><h3>{title}</h3><button type="button" disabled={busy} onClick={onClose} style={button}>Đóng</button></div>
            {children}
        </section>
    </div>;
}

export default function InventoryManagement() {
    const [tab, setTab] = useState('inventory');
    const [suppliers, setSuppliers] = useState([]);
    const [summary, setSummary] = useState({});
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');
    const [stock, setStock] = useState('all');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [message, setMessage] = useState('');
    const [supplierForm, setSupplierForm] = useState(null);
    const [receiptForm, setReceiptForm] = useState(null);
    const [detail, setDetail] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [productLastPage, setProductLastPage] = useState(1);
    const [products, setProducts] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        const timer = setTimeout(async () => {
            try {
                const query = tab === 'inventory' ? getInventoryProductsApi({ search, stock, page }) : tab === 'receipts' ? getImportReceiptsApi(params({ search, page, supplier_id: supplierFilter, from, to })) : Promise.resolve(null);
                const [supplierResult, summaryResult, result] = await Promise.all([getSuppliersApi(), getInventorySummaryApi(), query]);
                if (!active) return;
                setSuppliers(supplierResult.data.data); setSummary(summaryResult.data.data);
                setRows(result?.data.data.data || []); setLastPage(result?.data.data.last_page || 1);
            } catch (err) { if (active) setError(failure(err)); }
            finally { if (active) setLoading(false); }
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [tab, search, stock, page, supplierFilter, from, to, reload]);

    const receiptOpen = !!receiptForm;
    useEffect(() => {
        if (!receiptOpen) return;
        let active = true;
        setPickerLoading(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await getInventoryProductsApi({ search: productSearch, page: productPage });
                if (active) { setProducts(data.data.data); setProductLastPage(data.data.last_page); }
            } catch (err) { if (active) setFormError(failure(err)); }
            finally { if (active) setPickerLoading(false); }
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [receiptOpen, productSearch, productPage]);

    const changeTab = next => { setTab(next); setSearch(''); setPage(1); setError(''); setMessage(''); };
    const saveSupplier = async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setFormError('');
        try {
            const { id, ...data } = supplierForm;
            const result = await saveSupplierApi(data, id);
            setSupplierForm(null); setMessage(result.data.message); setReload(value => value + 1);
        } catch (err) { setFormError(failure(err)); } finally { setBusy(false); }
    };
    const saveReceipt = async event => {
        event.preventDefault(); if (busy) return; setFormError('');
        if (!receiptForm.items.length) { setFormError('Hãy thêm ít nhất một sản phẩm.'); return; }
        setBusy(true);
        try {
            const { data } = await createImportReceiptApi({ ...receiptForm, supplier_id: Number(receiptForm.supplier_id), items: receiptForm.items.map(item => ({ product_id: item.product_id, quantity: Number(item.quantity), import_price: item.import_price })) });
            setReceiptForm(null); setDetail(data.data); setMessage(data.message); setTab('receipts'); setPage(1); setSearch(''); setSupplierFilter(''); setFrom(''); setTo(''); setReload(value => value + 1);
        } catch (err) { setFormError(failure(err)); } finally { setBusy(false); }
    };
    const openReceipt = async id => {
        setBusy(true); setError('');
        try { const { data } = await getImportReceiptApi(id); setDetail(data.data); }
        catch (err) { setError(failure(err)); } finally { setBusy(false); }
    };
    const addProduct = product => setReceiptForm(current => current.items.some(item => item.product_id === product.id) ? current : { ...current, items: [...current.items, { product_id: product.id, name: product.tenSP, code: product.maSP, quantity: 1, import_price: '' }] });
    const editItem = (id, key, value) => setReceiptForm(current => ({ ...current, items: current.items.map(item => item.product_id === id ? { ...item, [key]: value } : item) }));
    const supplierRows = suppliers.filter(supplier => `${supplier.maNCC} ${supplier.tenNCC} ${supplier.email || ''}`.toLowerCase().includes(search.toLowerCase()));
    const table = (headers, body) => <div style={{ overflowX: 'auto', marginTop: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead style={{ background: '#f8fafc' }}><tr>{headers.map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead><tbody>{body}</tbody></table></div>;
    const pager = (current, max, setter) => <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}><button type="button" disabled={loading || pickerLoading || current <= 1} onClick={() => setter(current - 1)} style={button}>Trước</button><span>Trang {current}/{max}</span><button type="button" disabled={loading || pickerLoading || current >= max} onClick={() => setter(current + 1)} style={button}>Sau</button></div>;

    return <div style={{ padding: 24, background: '#fff', borderRadius: 12, color: '#0f172a' }}>
        <h2 style={{ marginTop: 0 }}>Kho & nhập hàng</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
            {[['Mã sản phẩm', summary.product_count], ['Tổng số lượng tồn', summary.total_units], ['Sắp hết (1–5)', summary.low_stock_count], ['Hết hàng', summary.out_of_stock_count]].map(([label, value]) => <div key={label} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10 }}><div style={{ color: '#64748b', fontSize: 13 }}>{label}</div><strong style={{ fontSize: 24 }}>{value ?? '—'}</strong></div>)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['inventory', 'Tồn kho'], ['receipts', 'Phiếu nhập'], ['suppliers', 'Nhà cung cấp']].map(([key, label]) => <button type="button" key={key} style={tab === key ? primary : button} onClick={() => changeTab(key)}>{label}</button>)}
            <button type="button" style={primary} disabled={loading || !suppliers.length} onClick={() => { setFormError(''); setProductSearch(''); setProductPage(1); setProducts([]); setReceiptForm({ request_id: crypto.randomUUID(), supplier_id: '', note: '', items: [] }); }}>Lập phiếu nhập</button>
            <button type="button" style={button} onClick={() => { setFormError(''); setSupplierForm({ maNCC: '', tenNCC: '', phone: '', email: '', address: '' }); }}>Thêm nhà cung cấp</button>
            <button type="button" style={button} onClick={() => setReload(value => value + 1)}>Tải lại</button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <input aria-label="Tìm kiếm kho" style={control} placeholder={tab === 'inventory' ? 'Tên hoặc mã sản phẩm' : tab === 'receipts' ? 'Tìm mã phiếu nhập' : 'Tên hoặc mã nhà cung cấp'} maxLength={100} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            {tab === 'inventory' && <select aria-label="Lọc tồn kho" style={control} value={stock} onChange={event => { setStock(event.target.value); setPage(1); }}><option value="all">Tất cả tồn kho</option><option value="low">Sắp hết (1–5)</option><option value="out">Hết hàng</option></select>}
            {tab === 'receipts' && <>
                <select aria-label="Lọc nhà cung cấp" value={supplierFilter} onChange={event => { setSupplierFilter(event.target.value); setPage(1); }} style={control}><option value="">Mọi nhà cung cấp</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.tenNCC}</option>)}</select>
                <label>Từ ngày <input type="date" style={control} value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
                <label>Đến ngày <input type="date" style={control} value={to} min={from} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
            </>}
        </div>
        {loading ? <p role="status">Đang tải dữ liệu kho...</p> : tab === 'inventory' ? <>
            {table(['Mã', 'Sản phẩm', 'Nhà cung cấp', 'Tồn', 'Hiển thị'], rows.map(product => <tr key={product.id}><td style={cell}>{product.maSP}</td><td style={cell}>{product.tenSP}</td><td style={cell}>{product.supplier?.tenNCC || '—'}</td><td style={{ ...cell, color: product.quantity <= 5 ? '#b91c1c' : '#15803d', fontWeight: 700 }}>{product.quantity}</td><td style={cell}>{product.status === 'active' ? 'Đang bán' : 'Đang ẩn / hết hàng'}</td></tr>))}
            {!rows.length && <p>Không có sản phẩm phù hợp.</p>}{pager(page, lastPage, setPage)}
        </> : tab === 'receipts' ? <>
            {table(['Mã phiếu', 'Ngày nhập', 'Nhà cung cấp', 'Người lập', 'Tổng tiền', 'Chi tiết'], rows.map(receipt => <tr key={receipt.id}><td style={cell}>{receipt.maPN}</td><td style={cell}>{new Date(receipt.created_at).toLocaleString('vi-VN')}</td><td style={cell}>{receipt.supplier?.tenNCC}</td><td style={cell}>{receipt.creator?.full_name}</td><td style={cell}>{money(receipt.total_amount)}</td><td style={cell}><button type="button" style={button} disabled={busy} onClick={() => openReceipt(receipt.id)}>Xem {receipt.maPN}</button></td></tr>))}
            {!rows.length && <p>Chưa có phiếu nhập phù hợp.</p>}{pager(page, lastPage, setPage)}
        </> : <>
            {table(['Mã', 'Tên nhà cung cấp', 'Liên hệ', 'Địa chỉ', 'Thao tác'], supplierRows.map(supplier => <tr key={supplier.id}><td style={cell}>{supplier.maNCC}</td><td style={cell}>{supplier.tenNCC}</td><td style={cell}>{supplier.phone}<br />{supplier.email}</td><td style={cell}>{supplier.address}</td><td style={cell}><button type="button" style={button} onClick={() => { setFormError(''); setSupplierForm({ ...supplier, phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '' }); }}>Sửa {supplier.maNCC}</button></td></tr>))}
            {!supplierRows.length && <p>Chưa có nhà cung cấp phù hợp. Hãy thêm nhà cung cấp trước khi lập phiếu.</p>}
        </>}
        {supplierForm && <Modal title={supplierForm.id ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'} busy={busy} onClose={() => setSupplierForm(null)}>
            {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}
            <form onSubmit={saveSupplier}><fieldset disabled={busy} style={{ border: 0, padding: 0, display: 'grid', gap: 14 }}>
                {[['maNCC', 'Mã nhà cung cấp', 20], ['tenNCC', 'Tên nhà cung cấp', 100], ['phone', 'Số điện thoại', 20], ['email', 'Email', 100], ['address', 'Địa chỉ', 1000]].map(([key, label, max]) => <label key={key} style={{ display: 'grid', gap: 6 }}>{label}<input style={control} name={key} required={['maNCC', 'tenNCC'].includes(key)} maxLength={max} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={supplierForm[key]} onChange={event => setSupplierForm({ ...supplierForm, [key]: event.target.value })} /></label>)}
                <button type="submit" style={primary}>{busy ? 'Đang lưu...' : 'Lưu nhà cung cấp'}</button>
            </fieldset></form>
        </Modal>}
        {receiptForm && <Modal title="Lập phiếu nhập hàng" busy={busy} onClose={() => setReceiptForm(null)}>
            {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}
            <p style={{ color: '#64748b' }}>Phiếu được ghi nhận và cộng kho ngay khi lưu thành công. Kiểm tra số lượng và giá nhập trước khi xác nhận.</p>
            <form onSubmit={saveReceipt}><fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
                <label>Nhà cung cấp <select name="supplier_id" required style={control} value={receiptForm.supplier_id} onChange={event => setReceiptForm({ ...receiptForm, supplier_id: event.target.value })}><option value="">Chọn nhà cung cấp</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.tenNCC}</option>)}</select></label>
                <div style={{ background: '#f8fafc', padding: 14, marginTop: 16, borderRadius: 10 }}>
                    <label>Tìm sản phẩm để thêm <input aria-label="Tìm sản phẩm nhập" style={control} maxLength={100} value={productSearch} onChange={event => { setProductSearch(event.target.value); setProductPage(1); }} placeholder="Tên hoặc mã sản phẩm" /></label>
                    {pickerLoading ? <p>Đang tìm sản phẩm...</p> : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{products.map(product => <button key={product.id} type="button" style={button} disabled={receiptForm.items.some(item => item.product_id === product.id)} onClick={() => addProduct(product)}>Thêm {product.maSP} — {product.tenSP}</button>)}{!products.length && <span>Không tìm thấy sản phẩm. Tạo sản phẩm ở mục Sản phẩm trước.</span>}</div>}
                    {pager(productPage, productLastPage, setProductPage)}
                </div>
                {table(['Sản phẩm', 'Số lượng nhập', 'Giá nhập / chiếc', 'Thành tiền', 'Bỏ'], receiptForm.items.map(item => <tr key={item.product_id}><td style={cell}>{item.code}<br />{item.name}</td><td style={cell}><input aria-label={`Số lượng ${item.code}`} type="number" min={1} max={1000000} step={1} required style={{ ...control, width: 110 }} value={item.quantity} onChange={event => editItem(item.product_id, 'quantity', event.target.value)} /></td><td style={cell}><input aria-label={`Giá nhập ${item.code}`} type="number" min={0} max="999999999.99" step="0.01" required style={{ ...control, width: 150 }} value={item.import_price} onChange={event => editItem(item.product_id, 'import_price', event.target.value)} /></td><td style={cell}>{money(Number(item.quantity) * Number(item.import_price))}</td><td style={cell}><button type="button" aria-label={`Bỏ ${item.code}`} style={button} onClick={() => setReceiptForm({ ...receiptForm, items: receiptForm.items.filter(row => row.product_id !== item.product_id) })}>Bỏ</button></td></tr>))}
                <label style={{ display: 'grid', gap: 6, marginTop: 16 }}>Ghi chú<textarea name="note" maxLength={1000} rows={2} style={control} value={receiptForm.note} onChange={event => setReceiptForm({ ...receiptForm, note: event.target.value })} /></label>
                <p><strong>Tổng tiền nhập: {money(receiptForm.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.import_price), 0))}</strong></p>
                <button type="submit" style={primary} disabled={busy || !receiptForm.items.length}>{busy ? 'Đang ghi nhận...' : 'Xác nhận nhập kho'}</button>
            </fieldset></form>
        </Modal>}
        {detail && <Modal title={`Phiếu nhập ${detail.maPN}`} busy={false} onClose={() => setDetail(null)}>
            <p>Nhà cung cấp: <strong>{detail.supplier?.tenNCC}</strong> · Người lập: {detail.creator?.full_name}</p>
            <p>Ngày nhập: {new Date(detail.created_at).toLocaleString('vi-VN')}</p>
            {table(['Mã', 'Sản phẩm', 'Số lượng', 'Giá nhập', 'Thành tiền'], (detail.details || []).map(item => <tr key={item.id}><td style={cell}>{item.product?.maSP}</td><td style={cell}>{item.product?.tenSP || 'Sản phẩm'}</td><td style={cell}>{item.quantity}</td><td style={cell}>{money(item.import_price)}</td><td style={cell}>{money(item.total_line)}</td></tr>))}
            <p style={{ whiteSpace: 'pre-wrap' }}>Ghi chú: {detail.note || '—'}</p><strong>Tổng tiền: {money(detail.total_amount)}</strong>
        </Modal>}
    </div>;
}
