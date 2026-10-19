import React, { useEffect, useRef, useState } from 'react';
import { getAdminWarrantiesApi, getWarrantyOrdersApi, createWarrantyApi, getAdminWarrantyApi, updateWarrantyStatusApi, getWarrantyServicesApi, getWarrantyServiceApi, updateWarrantyServiceApi } from '../services/api';
import { warrantyLabels, serviceLabels, warrantyDate, warrantyError, ServiceTimeline } from './WarrantyShared';

const input = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', boxSizing: 'border-box', maxWidth: '100%' };
const button = { ...input, background: '#fff', cursor: 'pointer' };
const primary = { ...button, background: '#2563eb', border: '1px solid #2563eb', color: '#fff' };
const cell = { padding: '12px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' };
const nextService = { requested: ['accepted', 'rejected'], accepted: ['repairing'], repairing: ['ready'], ready: ['closed'], rejected: [], closed: [] };

export default function WarrantyManagement() {
    const [tab, setTab] = useState('warranties'); const [search, setSearch] = useState(''); const [status, setStatus] = useState('all');
    const [rows, setRows] = useState([]); const [page, setPage] = useState(1); const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [formError, setFormError] = useState('');
    const [message, setMessage] = useState(''); const [reload, setReload] = useState(0); const [modal, setModal] = useState(null);
    const [orders, setOrders] = useState([]); const [orderSearch, setOrderSearch] = useState(''); const [orderPage, setOrderPage] = useState(1); const [orderLastPage, setOrderLastPage] = useState(1); const [finding, setFinding] = useState(false);
    const [order, setOrder] = useState(null); const [productId, setProductId] = useState(''); const [serial, setSerial] = useState(''); const [note, setNote] = useState(''); const [resolution, setResolution] = useState(''); const [baseStatus, setBaseStatus] = useState('valid');
    const dialog = useRef(null); const modalOpen = !!modal; const creating = modal?.kind === 'create';
    useEffect(() => {
        let active = true; setLoading(true); setError('');
        const timer = setTimeout(() => {
            const call = tab === 'warranties' ? getAdminWarrantiesApi({ search, page }) : getWarrantyServicesApi({ search, status, page });
            call.then(({ data }) => { if (active) { setRows(data.data.data); setLastPage(data.data.last_page); } }).catch(err => { if (active) setError(warrantyError(err)); }).finally(() => { if (active) setLoading(false); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [tab, search, status, page, reload]);
    useEffect(() => {
        if (!creating) return; let active = true; setFinding(true);
        const timer = setTimeout(() => {
            getWarrantyOrdersApi({ search: orderSearch, page: orderPage }).then(({ data }) => { if (active) { setOrders(data.data.data); setOrderLastPage(data.data.last_page); } }).catch(err => { if (active) setFormError(warrantyError(err)); }).finally(() => { if (active) setFinding(false); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [creating, orderSearch, orderPage]);
    useEffect(() => {
        if (!modalOpen) return;
        const previous = document.activeElement; const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; dialog.current?.querySelector('button')?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, [modalOpen]);
    const open = async (id, kind) => {
        setBusy(true); setError(''); setFormError(''); setMessage('');
        try { const { data } = await (kind === 'warranty' ? getAdminWarrantyApi(id) : getWarrantyServiceApi(id)); setModal({ kind, data: data.data }); setNote(''); setResolution(''); setBaseStatus(data.data.status === 'expired' ? 'expired' : 'valid'); }
        catch (err) { setError(warrantyError(err)); } finally { setBusy(false); }
    };
    const create = async event => {
        event.preventDefault(); if (busy || !order) return; setBusy(true); setFormError('');
        try { const { data } = await createWarrantyApi({ order_id: order.id, product_id: Number(productId), serial_number: serial.trim() }); setModal(null); setMessage(data.message); setReload(value => value + 1); }
        catch (err) { setFormError(warrantyError(err)); } finally { setBusy(false); }
    };
    const changeBase = async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setFormError('');
        try { const { data } = await updateWarrantyStatusApi(modal.data.id, { status: baseStatus, note: note.trim() }); setMessage(data.message); const detail = await getAdminWarrantyApi(modal.data.id); setModal({ kind: 'warranty', data: detail.data.data }); setNote(''); setReload(value => value + 1); }
        catch (err) { setFormError(warrantyError(err)); } finally { setBusy(false); }
    };
    const changeService = async next => {
        if (busy) return; setFormError('');
        if (next === 'rejected' && !note.trim()) { setFormError('Vui lòng nhập lý do từ chối.'); return; }
        if (next === 'ready' && !resolution.trim()) { setFormError('Vui lòng nhập kết quả xử lý trước khi chờ trả máy.'); return; }
        setBusy(true);
        try { const { data } = await updateWarrantyServiceApi(modal.data.id, { status: next, note: note.trim(), resolution: resolution.trim() }); setModal({ kind: 'service', data: data.data }); setMessage(data.message); setNote(''); setResolution(''); setReload(value => value + 1); }
        catch (err) {
            setFormError(warrantyError(err));
            if (err.response?.status === 409) { try { const { data } = await getWarrantyServiceApi(modal.data.id); setModal({ kind: 'service', data: data.data }); } catch { /* Keep the original error visible. */ } }
        } finally { setBusy(false); }
    };
    const keyDown = event => {
        if (event.key === 'Escape' && !busy) setModal(null);
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')]; const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const pager = (current, max, setter, disabled = false) => <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}><button type="button" style={button} disabled={disabled || current <= 1} onClick={() => setter(current - 1)}>Trước</button>Trang {current}/{max}<button type="button" style={button} disabled={disabled || current >= max} onClick={() => setter(current + 1)}>Sau</button></div>;
    return <section style={{ background: '#fff', borderRadius: 12, padding: 24, color: '#0f172a' }}>
        <h2 style={{ marginTop: 0 }}>Quản lý bảo hành</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['warranties', 'Phiếu bảo hành'], ['services', 'Hồ sơ tiếp nhận']].map(([key, label]) => <button type="button" key={key} style={tab === key ? primary : button} onClick={() => { setTab(key); setPage(1); setSearch(''); }}>{label}</button>)}
            <button type="button" style={primary} onClick={() => { setModal({ kind: 'create' }); setOrder(null); setProductId(''); setSerial(''); setOrderSearch(''); setOrderPage(1); setFormError(''); setMessage(''); }}>Cấp serial bảo hành</button>
            <button type="button" style={button} onClick={() => setReload(value => value + 1)}>Tải lại</button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}{message && !modal && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}><input aria-label="Tìm bảo hành" style={input} maxLength={100} placeholder={tab === 'warranties' ? 'Serial, tên khách hoặc mã đơn' : 'Tìm serial của hồ sơ'} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />{tab === 'services' && <select aria-label="Lọc hồ sơ bảo hành" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} style={input}><option value="all">Tất cả trạng thái</option>{Object.entries(serviceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}</div>
        {loading ? <p role="status">Đang tải bảo hành...</p> : <>
            <div style={{ overflowX: 'auto', marginTop: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr>{(tab === 'warranties' ? ['Serial', 'Sản phẩm / Đơn', 'Khách nhận hàng', 'Thời hạn', 'Hiệu lực', 'Chi tiết'] : ['Hồ sơ', 'Serial', 'Khách hàng', 'Trạng thái', 'Chi tiết']).map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead><tbody>{rows.map(row => tab === 'warranties' ? <tr key={row.id}><td style={cell}>{row.serial_number}</td><td style={cell}>{row.product?.tenSP}<br />{row.order?.maDH || 'Phiếu cũ chưa liên kết đơn'}</td><td style={cell}>{row.customer_name}</td><td style={cell}>{warrantyDate(row.start_date)} – {warrantyDate(row.end_date)}</td><td style={cell}>{warrantyLabels[row.effective_status]}</td><td style={cell}><button type="button" style={button} disabled={busy} onClick={() => open(row.id, 'warranty')}>Xem {row.serial_number}</button></td></tr> : <tr key={row.id}><td style={cell}>#{row.id}</td><td style={cell}>{row.warranty?.serial_number}</td><td style={cell}>{row.user?.full_name}</td><td style={cell}>{serviceLabels[row.status]}</td><td style={cell}><button type="button" style={button} disabled={busy} onClick={() => open(row.id, 'service')}>Xử lý hồ sơ #{row.id}</button></td></tr>)}</tbody></table></div>
            {!rows.length && <p>Chưa có dữ liệu phù hợp.</p>}{pager(page, lastPage, setPage, loading)}
        </>}
        {modal && <div style={{ position: 'fixed', inset: 0, zIndex: 90, padding: 16, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center' }}><section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label="Chi tiết quản lý bảo hành" style={{ background: '#fff', width: '100%', maxWidth: 850, maxHeight: '92vh', overflowY: 'auto', padding: 24, borderRadius: 14, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h3>{creating ? 'Cấp serial bảo hành' : modal.kind === 'service' ? `Hồ sơ #${modal.data.id}` : modal.data.serial_number}</h3><button type="button" style={button} disabled={busy} onClick={() => setModal(null)}>Đóng</button></div>
            {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}{message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
            {creating ? <>
                <label>Tìm đơn hoàn tất<input aria-label="Tìm đơn cấp bảo hành" maxLength={100} style={input} value={orderSearch} onChange={event => { setOrderSearch(event.target.value); setOrderPage(1); }} placeholder="Mã đơn hàng" /></label>
                {finding ? <p>Đang tìm đơn...</p> : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{orders.map(item => <button type="button" key={item.id} style={order?.id === item.id ? primary : button} onClick={() => { setOrder(item); setProductId(''); }}>{item.maDH} · {item.recipient_name}</button>)}{!orders.length && <p>Không có đơn hoàn tất phù hợp.</p>}</div>}{pager(orderPage, orderLastPage, setOrderPage, finding)}
                {order && <form onSubmit={create} style={{ marginTop: 16 }}><fieldset disabled={busy} style={{ display: 'grid', gap: 14, border: 0, padding: 0 }}>
                    <label>Sản phẩm<select name="warranty_product" required style={{ ...input, width: '100%' }} value={productId} onChange={event => setProductId(event.target.value)}><option value="">Chọn sản phẩm trong đơn</option>{(order.details || []).map(line => { const issued = (order.warranties || []).filter(warranty => warranty.product_id === line.product_id).length; return <option key={line.id} value={line.product_id} disabled={!line.product?.warranty_months || issued >= line.quantity}>{line.product?.tenSP} · {line.product?.warranty_months || 0} tháng · đã cấp {issued}/{line.quantity}</option>; })}</select></label>
                    <label>Serial / IMEI (4–100 ký tự)<input name="new_warranty_serial" required minLength={4} maxLength={100} pattern="[A-Za-z0-9_.\-]+" style={{ ...input, width: '100%' }} value={serial} onChange={event => setSerial(event.target.value)} /></label>
                    <p>Ngày bắt đầu lấy từ ngày hoàn tất đơn; ngày hết hạn tính theo số tháng bảo hành của sản phẩm. Mỗi chiếc có một serial.</p>
                    <button type="submit" style={primary}>{busy ? 'Đang cấp...' : 'Xác nhận cấp bảo hành'}</button>
                </fieldset></form>}
            </> : modal.kind === 'warranty' ? <>
                <p>{modal.data.product?.tenSP} · {modal.data.order?.maDH}</p><p>{modal.data.customer_name} · {modal.data.customer_phone}</p><p>{warrantyDate(modal.data.start_date)} – {warrantyDate(modal.data.end_date)}</p><strong>{warrantyLabels[modal.data.effective_status]}</strong>
                <form onSubmit={changeBase} style={{ marginTop: 16 }}><fieldset disabled={busy} style={{ display: 'grid', gap: 12, border: 0, padding: 0 }}><label>Trạng thái gốc<select name="warranty_base_status" style={input} value={baseStatus} onChange={event => setBaseStatus(event.target.value)}><option value="valid">Cho phép hiệu lực theo thời hạn</option><option value="expired">Ngừng hiệu lực</option></select></label><label>Lý do điều chỉnh<textarea name="warranty_status_note" required minLength={3} maxLength={500} rows={2} style={input} value={note} onChange={event => setNote(event.target.value)} /></label><button type="submit" style={button}>Lưu trạng thái bảo hành</button></fieldset></form>
                <h4>Lịch sử phiếu</h4><ul>{(modal.data.audit_events || []).map(event => <li key={event.id}>{new Date(event.created_at).toLocaleString('vi-VN')} · {event.note}</li>)}</ul>{(modal.data.service_requests || []).map(service => <ServiceTimeline key={service.id} service={service} />)}
            </> : <>
                <p>{modal.data.warranty?.serial_number} · {modal.data.warranty?.product?.tenSP}</p><p>Khách: {modal.data.user?.full_name} · Điện thoại liên hệ: {modal.data.contact_phone}</p><ServiceTimeline service={modal.data} />
                {!!nextService[modal.data.status]?.length && <fieldset disabled={busy} style={{ display: 'grid', gap: 12, border: 0, padding: 0, marginTop: 16 }}><label>Ghi chú cho khách<textarea name="service_note" rows={2} maxLength={1000} style={{ ...input, width: '100%' }} value={note} onChange={event => setNote(event.target.value)} /></label>{modal.data.status === 'repairing' && <label>Kết quả sửa chữa<textarea name="service_resolution" rows={3} maxLength={1000} style={{ ...input, width: '100%' }} value={resolution} onChange={event => setResolution(event.target.value)} /></label>}<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{nextService[modal.data.status].map(next => <button type="button" key={next} style={next === 'rejected' ? button : primary} onClick={() => changeService(next)}>{serviceLabels[next]}</button>)}</div><small>Chỉ chuyển bước khi đã thực hiện thực tế. Đóng hồ sơ khi khách đã nhận lại thiết bị.</small></fieldset>}
            </>}
        </section></div>}
    </section>;
}
