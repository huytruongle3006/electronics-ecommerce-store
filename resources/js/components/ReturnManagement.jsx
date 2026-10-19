import React, { useEffect, useRef, useState } from 'react';
import { getAdminReturnsApi, getAdminReturnApi, updateAdminReturnApi } from '../services/api';
import { ReturnTimeline, returnStatusLabels, returnError, refundMoney } from './ReturnRequestPanel';

const control = { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', boxSizing: 'border-box', maxWidth: '100%' };
const button = { ...control, background: '#fff', cursor: 'pointer' };
const primary = { ...button, background: '#2563eb', color: '#fff', border: '1px solid #2563eb' };
const cell = { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '12px 10px' };

export default function ReturnManagement() {
    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [message, setMessage] = useState('');
    const [reload, setReload] = useState(0);
    const [detail, setDetail] = useState(null);
    const [note, setNote] = useState('');
    const [reference, setReference] = useState('');
    const [restock, setRestock] = useState(false);
    const [received, setReceived] = useState(false);
    const [paidBack, setPaidBack] = useState(false);
    const dialog = useRef(null);
    useEffect(() => {
        let active = true; setLoading(true); setError('');
        const timer = setTimeout(() => {
            getAdminReturnsApi({ status, search, page }).then(({ data }) => {
                if (active) { setRows(data.data.data); setLastPage(data.data.last_page); }
            }).catch(err => { if (active) setError(returnError(err)); }).finally(() => { if (active) setLoading(false); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [status, search, page, reload]);
    const detailOpen = !!detail;
    useEffect(() => {
        if (!detailOpen) return;
        const previous = document.activeElement; const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; dialog.current?.querySelector('button')?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, [detailOpen]);
    const open = async id => {
        setBusy(true); setError(''); setFormError(''); setMessage('');
        try { const { data } = await getAdminReturnApi(id); setDetail(data.data); setNote(''); setReference(''); setRestock(false); setReceived(false); setPaidBack(false); }
        catch (err) { setError(returnError(err)); } finally { setBusy(false); }
    };
    const act = async action => {
        if (busy) return; setFormError(''); setMessage('');
        if (action === 'reject' && !note.trim()) { setFormError('Nhập lý do từ chối để khách hàng biết.'); return; }
        if (action === 'receive' && !received) { setFormError('Cần xác nhận đã nhận đủ hàng trả về.'); return; }
        if (action === 'refund' && (!paidBack || !reference.trim())) { setFormError('Cần mã chứng từ và xác nhận đã hoàn tiền thực tế.'); return; }
        setBusy(true);
        try {
            const { data } = await updateAdminReturnApi(detail.id, { action, note: note.trim(), restock, confirmed_received: received, refund_reference: reference.trim(), confirmed_paid_back: paidBack });
            setDetail(data.data); setMessage(data.message); setNote(''); setReference(''); setPaidBack(false); setReceived(false); setReload(value => value + 1);
        } catch (err) {
            setFormError(returnError(err));
            if (err.response?.status === 409) {
                try { const { data } = await getAdminReturnApi(detail.id); setDetail(data.data); } catch { /* Preserve original error for retry. */ }
            }
        } finally { setBusy(false); }
    };
    const keyDown = event => {
        if (event.key === 'Escape' && !busy) setDetail(null);
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const canRefund = detail && ((detail.kind === 'refund_only' && detail.status === 'approved') || (detail.kind === 'return_refund' && detail.status === 'received'));
    return <section style={{ background: '#fff', borderRadius: 12, padding: 24, color: '#0f172a' }}>
        <h2 style={{ marginTop: 0 }}>Trả hàng & hoàn tiền</h2>
        <p style={{ color: '#64748b' }}>Duyệt yêu cầu, kiểm tra hàng trả và ghi nhận giao dịch hoàn tiền đã thực hiện.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input aria-label="Tìm yêu cầu theo đơn" placeholder="Tìm mã đơn hàng" style={control} maxLength={100} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            <select aria-label="Lọc trạng thái đổi trả" style={control} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">Tất cả trạng thái</option>{Object.entries(returnStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <button type="button" style={button} onClick={() => setReload(value => value + 1)}>Tải lại</button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        {!detail && message && <p role="status">{message}</p>}
        {loading ? <p role="status">Đang tải yêu cầu...</p> : <>
            <div style={{ overflowX: 'auto', marginTop: 16 }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}><thead><tr>{['Đơn hàng', 'Khách hàng', 'Loại yêu cầu', 'Số tiền', 'Trạng thái', 'Xử lý'].map(label => <th key={label} style={cell}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td style={cell}>{row.order?.maDH}</td><td style={cell}>{row.user?.full_name}</td><td style={cell}>{row.kind === 'return_refund' ? 'Trả toàn bộ hàng' : 'Hoàn tiền đơn hủy'}</td><td style={cell}>{refundMoney(row.amount)}</td><td style={cell}>{returnStatusLabels[row.status]}</td><td style={cell}><button type="button" style={button} disabled={busy} onClick={() => open(row.id)}>Xem yêu cầu #{row.id}</button></td></tr>)}</tbody></table></div>
            {!rows.length && <p>Chưa có yêu cầu phù hợp.</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}><button type="button" disabled={page <= 1} style={button} onClick={() => setPage(value => value - 1)}>Trước</button>Trang {page}/{lastPage}<button type="button" disabled={page >= lastPage} style={button} onClick={() => setPage(value => value + 1)}>Sau</button></div>
        </>}
        {detail && <div style={{ position: 'fixed', inset: 0, zIndex: 90, padding: 16, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center' }}>
            <section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label={`Xử lý yêu cầu ${detail.id}`} style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 760, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h3>Yêu cầu #{detail.id} · {detail.order?.maDH}</h3><button type="button" style={button} disabled={busy} onClick={() => setDetail(null)}>Đóng</button></div>
                {formError && <p role="alert" style={{ color: '#b91c1c' }}>{formError}</p>}{message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
                <p>{detail.user?.full_name} · {detail.user?.email} · {detail.user?.phone}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}><strong>Lý do:</strong> {detail.reason}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}><strong>Thông tin nhận hoàn tiền:</strong> {detail.refund_instructions || 'Liên hệ khách hàng để đối soát.'}</p>
                {(detail.evidence_urls || []).map((url, i) => <p key={i}><a href={url} target="_blank" rel="noopener noreferrer">Mở minh chứng {i + 1}</a></p>)}
                <ul>{(detail.order?.details || []).map(item => <li key={item.id}>{item.product?.tenSP || 'Sản phẩm'} × {item.quantity}</li>)}</ul>
                <ReturnTimeline request={detail} />
                {!['rejected', 'refunded'].includes(detail.status) && <fieldset disabled={busy} style={{ display: 'grid', gap: 14, border: 0, padding: 0, marginTop: 16, minWidth: 0 }}>
                    <label>Ghi chú / hướng dẫn cho khách<textarea name="return_admin_note" rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} style={{ ...control, width: '100%' }} /></label>
                    {detail.status === 'requested' && <div style={{ display: 'flex', gap: 10 }}><button type="button" style={primary} onClick={() => act('approve')}>Duyệt yêu cầu</button><button type="button" style={button} onClick={() => act('reject')}>Từ chối yêu cầu</button></div>}
                    {detail.status === 'approved' && detail.kind === 'return_refund' && <>
                        <label><input name="return_received" type="checkbox" checked={received} onChange={event => setReceived(event.target.checked)} /> Đã nhận đủ toàn bộ sản phẩm của đơn</label>
                        <label><input name="return_restock" type="checkbox" checked={restock} onChange={event => setRestock(event.target.checked)} /> Hàng đủ điều kiện bán lại, nhập toàn bộ vào kho</label>
                        <small>Hàng lỗi cần giữ riêng: bỏ chọn nhập lại kho. Sau xác nhận, lựa chọn nhập kho không thể sửa ở yêu cầu này.</small>
                        <button type="button" style={primary} onClick={() => act('receive')}>Xác nhận nhận hàng trả</button>
                    </>}
                    {canRefund && <>
                        <p><strong>Hoàn toàn bộ: {refundMoney(detail.amount)}</strong>. Thực hiện chuyển/chi tiền và đối soát người nhận trước khi ghi nhận.</p>
                        <label>Mã giao dịch / chứng từ hoàn tiền<input name="refund_reference" maxLength={100} value={reference} onChange={event => setReference(event.target.value)} style={{ ...control, width: '100%' }} /></label>
                        <label><input name="refund_paid_back" type="checkbox" checked={paidBack} onChange={event => setPaidBack(event.target.checked)} /> Tôi xác nhận đã hoàn đủ tiền thực tế, đúng người nhận</label>
                        <button type="button" style={primary} onClick={() => act('refund')}>Ghi nhận đã hoàn tiền</button>
                    </>}
                </fieldset>}
            </section>
        </div>}
    </section>;
}
