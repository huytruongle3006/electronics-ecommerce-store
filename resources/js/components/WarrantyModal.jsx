import React, { useEffect, useRef, useState } from 'react';
import { checkWarranty, getMyWarrantiesApi, getMyWarrantyApi, requestWarrantyServiceApi } from '../services/api';
import { warrantyLabels, warrantyError, warrantyDate, ServiceTimeline } from './WarrantyShared';
const input = { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', boxSizing: 'border-box', maxWidth: '100%' };
const button = { ...input, background: '#fff', cursor: 'pointer' };
const primary = { ...button, background: '#2563eb', border: '1px solid #2563eb', color: '#fff' };
export default function WarrantyModal({ isOpen, onClose, user, initialWarrantyId }) {
    return isOpen ? <WarrantyContent key={(user?.id || 'guest') + ':' + (initialWarrantyId || '')} onClose={onClose} user={user} initialWarrantyId={initialWarrantyId} /> : null;
}
function WarrantyContent({ onClose, user, initialWarrantyId }) {
    const [tab, setTab] = useState(initialWarrantyId ? 'mine' : 'lookup');
    const [focusId, setFocusId] = useState(initialWarrantyId || null);
    const [serial, setSerial] = useState(''); const [result, setResult] = useState(null);
    const [rows, setRows] = useState([]); const [page, setPage] = useState(1); const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);
    const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [reload, setReload] = useState(0);
    const [device, setDevice] = useState(null); const [problem, setProblem] = useState(''); const [phone, setPhone] = useState('');
    const dialog = useRef(null);
    useEffect(() => {
        const previous = document.activeElement; const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; dialog.current?.querySelector('button')?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    useEffect(() => {
        if (tab !== 'mine' || !user) return;
        let active = true; setLoading(true); setError('');
        (focusId ? getMyWarrantyApi(focusId) : getMyWarrantiesApi(page)).then(({ data }) => { if (active) { setRows(focusId ? [data.data] : data.data.data); setLastPage(focusId ? 1 : data.data.last_page); } })
            .catch(err => { if (active) setError(warrantyError(err)); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [tab, page, reload, user, focusId]);
    const lookup = async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setError(''); setResult(null);
        try { const { data } = await checkWarranty(serial.trim()); setResult(data.data); }
        catch (err) { setError(warrantyError(err)); } finally { setBusy(false); }
    };
    const send = async event => {
        event.preventDefault(); if (busy) return;
        if (problem.trim().length < 10) { setError('Mô tả lỗi cần ít nhất 10 ký tự.'); return; }
        setBusy(true); setError(''); setMessage('');
        try { const { data } = await requestWarrantyServiceApi(device, { problem: problem.trim(), contact_phone: phone.trim() }); setMessage(data.message); setDevice(null); setReload(value => value + 1); }
        catch (err) { setError(warrantyError(err)); } finally { setBusy(false); }
    };
    const keyDown = event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    return <div style={{ position: 'fixed', inset: 0, zIndex: 70, padding: 16, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center' }}>
        <section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label="Bảo hành điện tử" style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto', background: '#fff', color: '#0f172a', borderRadius: 14, padding: 24, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>Bảo hành điện tử</h3><button type="button" style={button} disabled={busy} onClick={onClose}>Đóng</button></div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}><button type="button" style={tab === 'lookup' ? primary : button} onClick={() => { setTab('lookup'); setError(''); setDevice(null); }} disabled={busy}>Tra cứu serial</button>{user && <button type="button" style={tab === 'mine' ? primary : button} disabled={busy} onClick={() => { setTab('mine'); setError(''); }}>Bảo hành của tôi</button>}</div>
            {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}{message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
            {tab === 'lookup' ? <>
                <form onSubmit={lookup} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input name="warranty_serial" aria-label="Serial cần tra cứu" required minLength={4} maxLength={100} style={{ ...input, flex: 1, minWidth: 180 }} value={serial} onChange={event => setSerial(event.target.value)} placeholder="Nhập serial hoặc IMEI" /><button type="submit" style={primary} disabled={busy}>{busy ? 'Đang tra cứu...' : 'Tra cứu'}</button></form>
                {result && <div style={{ padding: 16, border: '1px solid #cbd5e1', marginTop: 16, borderRadius: 10 }}><strong>{result.product_name}</strong><p>Serial: {result.serial_number}</p><p>Từ {warrantyDate(result.start_date)} đến hết ngày {warrantyDate(result.end_date)}</p><strong>{warrantyLabels[result.effective_status] || 'Liên hệ cửa hàng'}</strong></div>}
                {!user && <p style={{ color: '#64748b' }}>Đăng nhập để xem thiết bị của bạn và gửi yêu cầu bảo hành.</p>}
            </> : loading ? <p role="status">Đang tải bảo hành...</p> : <>
                {focusId && <button type="button" style={button} disabled={busy} onClick={() => { setFocusId(null); setPage(1); }}>Xem tất cả bảo hành</button>}
                <button type="button" style={button} disabled={busy} onClick={() => setReload(value => value + 1)}>Tải lại danh sách</button>
                {!rows.length && <p>Chưa có phiếu bảo hành liên kết với đơn của bạn. Nếu đã nhận hàng, liên hệ cửa hàng để cấp serial.</p>}
                {rows.map(warranty => <article key={warranty.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 14 }}>
                    <strong>{warranty.product?.tenSP}</strong><p>Serial: {warranty.serial_number} · Đơn: {warranty.order?.maDH}</p><p>{warrantyDate(warranty.start_date)} – {warrantyDate(warranty.end_date)}</p><strong>{warrantyLabels[warranty.effective_status]}</strong>
                    {(warranty.service_requests || []).map(service => <ServiceTimeline key={service.id} service={service} />)}
                    {warranty.effective_status === 'valid' && (device !== warranty.id ? <button type="button" style={{ ...primary, marginTop: 12 }} onClick={() => { setDevice(warranty.id); setProblem(''); setPhone(user.phone || warranty.customer_phone || ''); setError(''); setMessage(''); }}>Yêu cầu bảo hành {warranty.serial_number}</button> : <form onSubmit={send} style={{ marginTop: 12 }}><fieldset disabled={busy} style={{ display: 'grid', gap: 12, border: 0, padding: 0 }}>
                        <label>Mô tả lỗi (10–1000 ký tự)<textarea name="warranty_problem" required minLength={10} maxLength={1000} rows={3} style={{ ...input, width: '100%' }} value={problem} onChange={event => setProblem(event.target.value)} /></label>
                        <label>Số điện thoại liên hệ<input name="warranty_phone" type="tel" required maxLength={20} style={{ ...input, width: '100%' }} value={phone} onChange={event => setPhone(event.target.value)} /></label>
                        <p style={{ margin: 0, color: '#64748b' }}>Chờ cửa hàng tiếp nhận và hướng dẫn trước khi gửi thiết bị.</p>
                        <div style={{ display: 'flex', gap: 10 }}><button type="submit" style={primary}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu bảo hành'}</button><button type="button" style={button} onClick={() => setDevice(null)}>Để sau</button></div>
                    </fieldset></form>)}
                </article>)}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}><button type="button" style={button} disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button>Trang {page}/{lastPage}<button type="button" style={button} disabled={busy || page >= lastPage} onClick={() => setPage(value => value + 1)}>Sau</button></div>
            </>}
        </section>
    </div>;
}
