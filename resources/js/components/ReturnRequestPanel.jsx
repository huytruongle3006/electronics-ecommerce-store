import React, { useEffect, useState } from 'react';
import { createOrderReturnApi, getOrderReturnApi } from '../services/api';

export const returnStatusLabels = { requested: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối', received: 'Đã nhận hàng trả', refunded: 'Đã ghi nhận hoàn tiền' };
export const returnError = error => error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.response?.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : error.response?.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : error.response?.data?.message || 'Không tải được yêu cầu. Vui lòng thử lại.';
export const refundMoney = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const input = { padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit', boxSizing: 'border-box', width: '100%' };

export function ReturnTimeline({ request }) {
    return <div>
        <p><strong>{returnStatusLabels[request.status]}</strong> · Số tiền: {refundMoney(request.amount)}</p>
        {request.admin_note && <p style={{ whiteSpace: 'pre-wrap' }}>Phản hồi cửa hàng: {request.admin_note}</p>}
        {request.status === 'received' && <p>{request.restocked ? 'Cửa hàng đã nhận hàng và nhập lại kho.' : 'Cửa hàng đã nhận hàng, không nhập lại kho bán.'}</p>}
        {request.refund_reference && <p>Chứng từ hoàn tiền: {request.refund_reference}</p>}
        <ol>{(request.events || []).map(event => <li key={event.id} style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{new Date(event.created_at).toLocaleString('vi-VN')} · {returnStatusLabels[event.action] || event.action}{event.note ? ` — ${event.note}` : ''}</li>)}</ol>
    </div>;
}

export default function ReturnRequestPanel({ orderId }) {
    const [request, setRequest] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [reason, setReason] = useState('');
    const [evidence, setEvidence] = useState('');
    const [instructions, setInstructions] = useState('');
    const [opened, setOpened] = useState(false);
    const [reload, setReload] = useState(0);
    useEffect(() => {
        let active = true; setLoading(true); setError('');
        getOrderReturnApi(orderId).then(({ data }) => {
            if (active) { setRequest(data.data); setEligibility(data.eligibility); }
        }).catch(err => { if (active) setError(returnError(err)); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [orderId, reload]);
    const submit = async event => {
        event.preventDefault(); if (busy) return; setError(''); setMessage('');
        const urls = evidence.split('\n').map(url => url.trim()).filter(Boolean);
        if (urls.length > 5 || urls.some(url => { try { return new URL(url).protocol !== 'https:'; } catch { return true; } })) { setError('Nhập tối đa 5 liên kết minh chứng HTTPS, mỗi dòng một liên kết.'); return; }
        if (reason.trim().length < 10) { setError('Vui lòng mô tả lý do ít nhất 10 ký tự.'); return; }
        setBusy(true);
        try {
            const { data } = await createOrderReturnApi(orderId, { reason: reason.trim(), evidence_urls: urls, refund_instructions: instructions.trim() });
            setRequest(data.data); setOpened(false); setMessage(data.message);
        } catch (err) { setError(returnError(err)); }
        finally { setBusy(false); }
    };
    return <section style={{ margin: '20px 0', padding: 16, border: '1px solid #cbd5e1', borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>Trả hàng & hoàn tiền</h4>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error} <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Tải lại</button></p>}
        {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
        {loading ? <p>Đang tải yêu cầu...</p> : request ? <>
            <p>Loại: {request.kind === 'return_refund' ? 'Trả toàn bộ hàng và hoàn tiền' : 'Hoàn tiền cho đơn đã hủy'}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>Lý do: {request.reason}</p>
            <ReturnTimeline request={request} />
        </> : <>
            <p>{eligibility?.message}</p>
            {eligibility?.eligible && (!opened ? <button type="button" onClick={() => setOpened(true)} style={{ padding: '9px 14px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Gửi yêu cầu {eligibility.kind === 'return_refund' ? 'trả hàng' : 'hoàn tiền'}</button> : <form onSubmit={submit}>
                <fieldset disabled={busy} style={{ display: 'grid', gap: 12, border: 0, padding: 0, minWidth: 0 }}>
                    <label>Lý do (10–1000 ký tự)<textarea name="return_reason" required minLength={10} maxLength={1000} rows={3} style={input} value={reason} onChange={event => setReason(event.target.value)} /></label>
                    <label>Liên kết ảnh/video minh chứng (HTTPS, tối đa 5, mỗi dòng một link)<textarea name="return_evidence" rows={2} maxLength={5004} style={input} value={evidence} onChange={event => setEvidence(event.target.value)} /></label>
                    <label>Thông tin nhận hoàn tiền / cách liên hệ (không gửi mật khẩu hoặc OTP)<textarea name="refund_instructions" rows={2} maxLength={1000} style={input} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
                    <p style={{ color: '#64748b', margin: 0 }}>Yêu cầu áp dụng cho toàn bộ đơn và số tiền đã thanh toán sau giảm giá. Chờ cửa hàng duyệt trước khi gửi trả hàng.</p>
                    <div style={{ display: 'flex', gap: 10 }}><button type="submit">{busy ? 'Đang gửi...' : 'Xác nhận gửi yêu cầu'}</button><button type="button" onClick={() => setOpened(false)}>Để sau</button></div>
                </fieldset>
            </form>)}
        </>}
    </section>;
}
