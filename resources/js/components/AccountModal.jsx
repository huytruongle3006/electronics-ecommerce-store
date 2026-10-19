import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getProfileApi, updateProfileApi, changePasswordApi } from '../services/api';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit' };
const buttonStyle = { padding: '10px 16px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 };
const emptyPasswords = { current_password: '', password: '', password_confirmation: '' };

export default function AccountModal({ user, onClose, onUpdated, onPasswordChanged, onSessionExpired }) {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ full_name: '', phone: '', address: '' });
    const [passwords, setPasswords] = useState(emptyPasswords);
    const [tab, setTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const dialogRef = useRef(null);
    const closeRef = useRef(null);

    useEffect(() => {
        let active = true;
        getProfileApi().then(({ data }) => {
            if (!active) return;
            setProfile(data.user);
            setForm({ full_name: data.user.full_name || '', phone: data.user.phone || '', address: data.user.address || '' });
        }).catch(err => {
            if (!active) return;
            if (err.response?.status === 401) onSessionExpired();
            else setError('Không tải được thông tin tài khoản. Hãy đóng và thử lại.');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const previousFocus = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = overflow;
            previousFocus?.focus();
        };
    }, []);

    const clearMessages = () => { setError(''); setErrors({}); setMessage(''); };
    const handleError = err => {
        if (err.response?.status === 401) { onSessionExpired(); return; }
        setErrors(err.response?.data?.errors || {});
        setError(err.response?.status === 422 ? 'Vui lòng kiểm tra các ô bên dưới.' : 'Không thể lưu thay đổi. Vui lòng thử lại.');
    };
    const saveProfile = async event => {
        event.preventDefault();
        if (busy) return;
        clearMessages(); setBusy(true);
        try {
            const { data } = await updateProfileApi(form);
            setProfile(data.user);
            setForm({ full_name: data.user.full_name || '', phone: data.user.phone || '', address: data.user.address || '' });
            onUpdated(data.user);
            setMessage(data.message);
        } catch (err) { handleError(err); }
        finally { setBusy(false); }
    };
    const savePassword = async event => {
        event.preventDefault();
        if (busy) return;
        clearMessages();
        if (passwords.password !== passwords.password_confirmation) {
            setErrors({ password_confirmation: ['Mật khẩu xác nhận chưa khớp.'] }); return;
        }
        setBusy(true);
        try {
            await changePasswordApi(passwords);
            setPasswords(emptyPasswords);
            onPasswordChanged();
        } catch (err) { handleError(err); }
        finally { setBusy(false); }
    };
    const field = (name, label, type = 'text', attrs = {}, password = false) => (
        <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            <input {...attrs} type={type} name={name} value={(password ? passwords : form)[name]}
                onChange={event => {
                    const value = event.target.value;
                    if (password) setPasswords(prev => ({ ...prev, [name]: value }));
                    else setForm(prev => ({ ...prev, [name]: value }));
                    setErrors(prev => ({ ...prev, [name]: undefined })); setMessage('');
                }} style={inputStyle} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `account-${name}-error` : undefined} />
            {errors[name] && <small id={`account-${name}-error`} style={{ color: '#b91c1c' }}>{errors[name][0]}</small>}
        </label>
    );
    const onKeyDown = event => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')];
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 70, display: 'grid', placeItems: 'center', padding: 16 }}>
            <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-title" onKeyDown={onKeyDown}
                style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 24, boxSizing: 'border-box', color: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 id="account-title" style={{ margin: 0, fontSize: 22 }}>Tài khoản của tôi</h2>
                    <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Đóng tài khoản" style={{ background: 'none', border: 0, cursor: 'pointer' }}><X /></button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[['profile', 'Thông tin cá nhân'], ['password', 'Đổi mật khẩu']].map(([key, label]) => (
                        <button key={key} type="button" disabled={busy} aria-pressed={tab === key}
                            onClick={() => { setTab(key); setPasswords(emptyPasswords); clearMessages(); }}
                            style={{ ...buttonStyle, background: tab === key ? '#2563eb' : '#f1f5f9', color: tab === key ? '#fff' : '#334155' }}>{label}</button>
                    ))}
                </div>
                {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
                {message && <p role="status" style={{ color: '#15803d' }}>{message}</p>}
                {loading ? <p role="status">Đang tải thông tin...</p> : profile && (
                    tab === 'profile' ? <form onSubmit={saveProfile}>
                        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16, minWidth: 0 }}>
                            {field('full_name', 'Họ và tên', 'text', { required: true, maxLength: 100, autoComplete: 'name' })}
                            <label style={{ display: 'grid', gap: 6 }}>Email đăng nhập
                                <input type="email" value={profile.email || user.email} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} />
                                <small style={{ color: '#64748b' }}>Email đăng nhập được giữ cố định.</small>
                            </label>
                            {field('phone', 'Số điện thoại', 'tel', { maxLength: 20, autoComplete: 'tel', placeholder: 'Ví dụ: 0912345678' })}
                            <label style={{ display: 'grid', gap: 6 }}>Địa chỉ nhận hàng
                                <textarea name="address" value={form.address} maxLength={1000} rows={3} autoComplete="street-address"
                                    onChange={event => { setForm(prev => ({ ...prev, address: event.target.value })); setMessage(''); }}
                                    style={{ ...inputStyle, resize: 'vertical' }} aria-invalid={!!errors.address} />
                                {errors.address && <small style={{ color: '#b91c1c' }}>{errors.address[0]}</small>}
                            </label>
                            <button type="submit" style={buttonStyle}>{busy ? 'Đang lưu...' : 'Lưu thông tin'}</button>
                        </fieldset>
                    </form> : <form onSubmit={savePassword}>
                        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16, minWidth: 0 }}>
                            {field('current_password', 'Mật khẩu hiện tại', 'password', { required: true, autoComplete: 'current-password' }, true)}
                            {field('password', 'Mật khẩu mới (8–72 ký tự)', 'password', { required: true, minLength: 8, maxLength: 72, autoComplete: 'new-password' }, true)}
                            {field('password_confirmation', 'Nhập lại mật khẩu mới', 'password', { required: true, minLength: 8, maxLength: 72, autoComplete: 'new-password' }, true)}
                            <small style={{ color: '#64748b' }}>Sau khi đổi mật khẩu, tất cả phiên đăng nhập sẽ kết thúc. Bạn cần đăng nhập lại.</small>
                            <button type="submit" style={buttonStyle}>{busy ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
                        </fieldset>
                    </form>
                )}
            </section>
        </div>
    );
}
