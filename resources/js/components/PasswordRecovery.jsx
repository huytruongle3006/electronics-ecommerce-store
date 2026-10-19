import React, { useEffect, useRef, useState } from 'react';
import { X, LockKeyhole } from 'lucide-react';
import { forgotPasswordApi, resetPasswordApi } from '../services/api';

export function parsePasswordResetLink(location) {
    if (location.pathname.replace(/\/$/, '') !== '/reset-password') return null;
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    return { token: params.get('token') || '', email: params.get('email') || '' };
}

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit' };
const buttonStyle = { padding: '11px 16px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 };

export default function PasswordRecovery({ resetData = null, onClose, onLogin, onResetComplete = () => {} }) {
    const [mode, setMode] = useState(resetData ? 'reset' : 'forgot');
    const [email, setEmail] = useState(resetData?.email || '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [cooldown, setCooldown] = useState(0);
    const closeRef = useRef(null);
    const dialogRef = useRef(null);
    const validLink = !!resetData?.email && /^[a-f0-9]{64}$/.test(resetData?.token || '');

    useEffect(() => {
        const previousFocus = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => { document.body.style.overflow = overflow; previousFocus?.focus(); };
    }, []);
    useEffect(() => {
        if (!cooldown) return;
        const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const requestNewLink = () => {
        setMode('forgot'); setPassword(''); setConfirmation(''); setError(''); setErrors({}); setMessage('');
    };
    const submit = async event => {
        event.preventDefault();
        if (busy || (mode === 'forgot' && cooldown)) return;
        setError(''); setErrors({}); setMessage('');
        if (mode === 'reset' && !validLink) return;
        if (mode === 'reset' && password !== confirmation) {
            setErrors({ password_confirmation: ['Mật khẩu xác nhận chưa khớp.'] }); return;
        }
        if (mode === 'reset' && new TextEncoder().encode(password).length > 72) {
            setErrors({ password: ['Mật khẩu quá dài. Vui lòng dùng ít ký tự hơn.'] }); return;
        }
        setBusy(true);
        try {
            if (mode === 'forgot') {
                const { data } = await forgotPasswordApi({ email: email.trim() });
                setMessage(data.message); setCooldown(60);
            } else {
                const { data } = await resetPasswordApi({ email: resetData.email, token: resetData.token, password, password_confirmation: confirmation });
                setPassword(''); setConfirmation(''); setMode('success'); setMessage(data.message);
                onResetComplete();
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setError('Bạn thao tác quá nhiều lần. Vui lòng đợi một phút rồi thử lại.');
                if (mode === 'forgot') setCooldown(60);
            } else {
                setErrors(err.response?.data?.errors || {});
                setError(err.response?.data?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.');
            }
        } finally { setBusy(false); }
    };
    const fieldError = name => errors[name] && <small id={`recovery-${name}-error`} style={{ color: '#b91c1c' }}>{errors[name][0]}</small>;
    const keyDown = event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };

    return <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 80, display: 'grid', placeItems: 'center', padding: 16 }}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recovery-title" onKeyDown={keyDown}
            style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', background: '#fff', color: '#0f172a', borderRadius: 16, padding: 24, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 id="recovery-title" style={{ fontSize: 22, margin: 0 }}>{mode === 'forgot' ? 'Quên mật khẩu' : mode === 'reset' ? 'Đặt lại mật khẩu' : 'Đặt lại thành công'}</h2>
                <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Đóng" style={{ background: 'none', border: 0, cursor: 'pointer' }}><X /></button>
            </div>
            <LockKeyhole size={36} color="#2563eb" style={{ marginTop: 20 }} />
            {mode === 'forgot' && <p style={{ color: '#64748b', lineHeight: 1.6 }}>Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết giúp bạn tạo mật khẩu mới.</p>}
            {mode === 'reset' && <p style={{ color: '#64748b', lineHeight: 1.6 }}>Tạo mật khẩu mới cho tài khoản của bạn. Liên kết chỉ dùng được một lần.</p>}
            {message && <p role="status" style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, color: '#166534', lineHeight: 1.6 }}>{message}</p>}
            {error && <p role="alert" style={{ color: '#b91c1c', lineHeight: 1.6 }}>{error}</p>}
            {mode === 'reset' && !validLink && <p role="alert" style={{ color: '#b91c1c' }}>Liên kết thiếu thông tin hoặc không hợp lệ. Hãy yêu cầu email mới.</p>}
            {mode !== 'success' && <form onSubmit={submit}>
                <fieldset disabled={busy} style={{ display: 'grid', gap: 16, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                    <label style={{ display: 'grid', gap: 6 }}>Email đăng ký
                        <input name="email" type="email" autoComplete="email" required maxLength={100} readOnly={mode === 'reset'}
                            value={email} onChange={event => { setEmail(event.target.value); setErrors({}); setError(''); }}
                            style={inputStyle} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'recovery-email-error' : undefined} />
                        {fieldError('email')}
                    </label>
                    {mode === 'reset' && <>
                        <label style={{ display: 'grid', gap: 6 }}>Mật khẩu mới (8–72 ký tự)
                            <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
                                value={password} onChange={event => setPassword(event.target.value)} style={inputStyle}
                                aria-invalid={!!errors.password} aria-describedby={errors.password ? 'recovery-password-error' : undefined} />
                            {fieldError('password')}
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>Nhập lại mật khẩu mới
                            <input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
                                value={confirmation} onChange={event => setConfirmation(event.target.value)} style={inputStyle}
                                aria-invalid={!!errors.password_confirmation} aria-describedby={errors.password_confirmation ? 'recovery-password_confirmation-error' : undefined} />
                            {fieldError('password_confirmation')}
                        </label>
                        <small style={{ color: '#64748b' }}>Sau khi đặt lại, các phiên đăng nhập cũ sẽ kết thúc.</small>
                        {fieldError('token')}
                    </>}
                    <button type="submit" disabled={busy || (mode === 'forgot' ? cooldown > 0 : !validLink)} style={buttonStyle}>
                        {busy ? 'Đang xử lý...' : mode === 'reset' ? 'Lưu mật khẩu mới' : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi liên kết đặt lại'}
                    </button>
                </fieldset>
            </form>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
                {mode === 'reset' && <button type="button" disabled={busy} onClick={requestNewLink} style={{ background: 'none', border: 0, padding: 0, color: '#2563eb', cursor: 'pointer' }}>Yêu cầu liên kết mới</button>}
                <button type="button" disabled={busy} onClick={onLogin} style={{ background: 'none', border: 0, padding: 0, color: '#2563eb', cursor: 'pointer' }}>Quay lại đăng nhập</button>
            </div>
        </section>
    </div>;
}
