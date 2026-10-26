import React, { useEffect, useRef, useState } from 'react';
import { getAddressesApi, createAddressApi, updateAddressApi, deleteAddressApi, defaultAddressApi } from '../services/api';

const input = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, font: 'inherit' };
const button = { padding: '8px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, cursor: 'pointer', color: '#1e40af' };
const blank = { label: '', recipient_name: '', recipient_phone: '', shipping_address: '', is_default: false };
const messageFor = err => err.response?.data?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.';

export default function AddressBook({ onChanged, onSessionExpired, onBusyChange }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState(null); // null: closed; 0: new address
    const [form, setForm] = useState(blank);
    const [deleting, setDeleting] = useState(null);
    const live = useRef(false);
    const pending = useRef(false);
    const callbacks = useRef({});
    callbacks.current = { onChanged, onSessionExpired, onBusyChange };
    useEffect(() => { callbacks.current.onBusyChange?.(busy || editing !== null); }, [busy, editing]);

    const fail = err => {
        if (err.response?.status === 401 && callbacks.current.onSessionExpired) callbacks.current.onSessionExpired();
        setError(messageFor(err)); setErrors(err.response?.data?.errors || {});
    };
    const load = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await getAddressesApi();
            if (live.current) setAddresses(data.data);
        } catch (err) { if (live.current) fail(err); }
        finally { if (live.current) setLoading(false); }
    };
    useEffect(() => { live.current = true; load(); return () => { live.current = false; }; }, []);

    const mutate = async action => {
        if (pending.current) return;
        pending.current = true; setBusy(true);
        setError(''); setErrors({}); setNotice('');
        try {
            const { data } = await action();
            if (!live.current) return;
            setEditing(null); setDeleting(null); setNotice(data.message);
            callbacks.current.onChanged?.(data.data || null);
            await load();
        } catch (err) { if (live.current) fail(err); }
        finally {
            pending.current = false;
            if (live.current) setBusy(false);
        }
    };
    const startEdit = address => {
        setEditing(address?.id || 0); setDeleting(null); setError(''); setErrors({}); setNotice('');
        setForm(address ? { label: address.label || '', recipient_name: address.recipient_name, recipient_phone: address.recipient_phone, shipping_address: address.shipping_address, is_default: address.is_default } : { ...blank });
    };
    const field = (name, label, maxLength, type = 'text') => (
        <label style={{ display: 'grid', gap: 5 }}>
            <span>{label}</span>
            {name === 'shipping_address' ? <textarea name={name} rows={3} required maxLength={maxLength} value={form[name]}
                onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))} style={input} aria-invalid={!!errors[name]} /> :
                <input name={name} type={type} required={name !== 'label'} maxLength={maxLength} value={form[name]}
                    onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))} style={input} aria-invalid={!!errors[name]} />}
            {errors[name] && <small style={{ color: '#b91c1c' }}>{errors[name][0]}</small>}
        </label>
    );
    return <section aria-label="Sổ địa chỉ giao hàng" style={{ display: 'grid', gap: 12 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Lưu tối đa 20 địa chỉ. Địa chỉ đầu tiên tự được chọn làm mặc định. Đơn đã đặt luôn giữ thông tin giao hàng lúc đặt.</p>
        {error && <div role="alert" style={{ color: '#b91c1c' }}>{error} <button type="button" disabled={busy || loading} onClick={load} style={button}>Tải lại địa chỉ</button></div>}
        {notice && <p role="status" style={{ color: '#15803d', margin: 0 }}>{notice}</p>}
        {loading ? <p role="status">Đang tải địa chỉ...</p> : <>
            {addresses.length === 0 && <p>Bạn chưa lưu địa chỉ nào.</p>}
            {addresses.map(address => <article key={address.id} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, overflowWrap: 'anywhere' }}>
                <strong>{address.label || 'Địa chỉ nhận hàng'}</strong> {address.is_default && <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 7px', borderRadius: 6, fontSize: 12 }}>Mặc định</span>}
                <p style={{ margin: '8px 0 4px' }}>{address.recipient_name} · {address.recipient_phone}</p>
                <p style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{address.shipping_address}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" disabled={busy} style={button} onClick={() => startEdit(address)}>Sửa {address.label || 'địa chỉ'}</button>
                    {!address.is_default && <button type="button" disabled={busy} style={button} onClick={() => mutate(() => defaultAddressApi(address.id))}>Đặt mặc định</button>}
                    <button type="button" disabled={busy} style={{ ...button, color: '#b91c1c' }} onClick={() => { setDeleting(address.id); setEditing(null); }}>Xóa {address.label || 'địa chỉ'}</button>
                </div>
                {deleting === address.id && <div role="group" aria-label="Xác nhận xóa địa chỉ" style={{ marginTop: 10 }}>
                    <p>Xóa địa chỉ này? Đơn đã đặt không bị thay đổi.{address.is_default && ' Địa chỉ còn lại được lưu sớm nhất sẽ làm mặc định.'}</p>
                    <button type="button" style={button} disabled={busy} onClick={() => mutate(() => deleteAddressApi(address.id))}>Xác nhận xóa địa chỉ</button>{' '}
                    <button type="button" style={button} disabled={busy} onClick={() => setDeleting(null)}>Giữ địa chỉ</button>
                </div>}
            </article>)}
            {editing === null ? <button type="button" style={{ ...button, background: '#2563eb', color: '#fff' }} disabled={busy || addresses.length >= 20} onClick={() => startEdit(null)}>Thêm địa chỉ mới</button> :
                <fieldset disabled={busy} style={{ padding: 14, border: '1px solid #cbd5e1', borderRadius: 10, display: 'grid', gap: 12, minWidth: 0 }}>
                    <legend>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</legend>
                    {field('label', 'Tên gợi nhớ (Nhà riêng, Công ty...)', 50)}
                    {field('recipient_name', 'Họ tên người nhận *', 100)}
                    {field('recipient_phone', 'Số điện thoại *', 20, 'tel')}
                    {field('shipping_address', 'Địa chỉ đầy đủ: số nhà, đường, phường/xã, tỉnh/thành phố *', 1000)}
                    <label><input type="checkbox" checked={form.is_default || addresses.length === 0} disabled={addresses.length === 0 || (editing !== 0 && addresses.find(a => a.id === editing)?.is_default)}
                        onChange={e => setForm(prev => ({ ...prev, is_default: e.target.checked }))} /> Dùng làm địa chỉ mặc định</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={button} onClick={() => mutate(() => editing ? updateAddressApi(editing, form) : createAddressApi(form))}>{busy ? 'Đang lưu...' : 'Lưu địa chỉ'}</button>
                        <button type="button" style={button} onClick={() => { setEditing(null); setError(''); setErrors({}); }}>Hủy chỉnh sửa</button>
                    </div>
                </fieldset>}
        </>}
    </section>;
}

export function ShippingAddressPicker({ onSelect, onBusyChange, disabled }) {
    const [addresses, setAddresses] = useState([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [managing, setManaging] = useState(false);
    const [revision, setRevision] = useState(0);
    const [saving, setSaving] = useState(false);
    const choice = useRef(null); // null: initial default; empty string: explicit manual entry
    const callbacks = useRef({});
    callbacks.current = { onSelect, onBusyChange };
    useEffect(() => { onBusyChange(loading || saving); }, [loading, saving, onBusyChange]);
    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        getAddressesApi().then(({ data }) => {
            if (!active) return;
            const list = data.data;
            setAddresses(list);
            const address = choice.current === null ? list.find(a => a.is_default) :
                list.find(a => String(a.id) === choice.current) || (choice.current !== '' ? list.find(a => a.is_default) : null);
            choice.current = address ? String(address.id) : '';
            setSelected(choice.current); callbacks.current.onSelect(address || null);
        }).catch(err => {
            if (!active) return;
            // Retain a successfully saved selection if only the subsequent list refresh fails.
            setError(messageFor(err));
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [revision]);

    return <section aria-label="Chọn địa chỉ giao hàng" style={{ padding: 14, borderRadius: 10, background: '#f8fafc', display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>Địa chỉ đã lưu
            <select aria-label="Chọn địa chỉ đã lưu" disabled={disabled || loading || saving} value={selected} style={input} onChange={e => {
                choice.current = e.target.value; setSelected(e.target.value);
                onSelect(addresses.find(a => String(a.id) === e.target.value) || null);
            }}>
                <option value="">Nhập địa chỉ khác (không lưu)</option>
                {addresses.map(a => <option key={a.id} value={a.id}>{a.is_default ? '★ ' : ''}{a.label || a.recipient_name} — {a.recipient_name} — {a.shipping_address}</option>)}
            </select>
        </label>
        {loading && <small role="status">Đang tải địa chỉ...</small>}
        {error && <div role="alert" style={{ color: '#b91c1c' }}>{error} Bạn vẫn có thể nhập địa chỉ thủ công. <button type="button" style={button} disabled={disabled || loading} onClick={() => setRevision(v => v + 1)}>Thử tải lại</button></div>}
        <button type="button" style={button} disabled={disabled || loading || saving} onClick={() => setManaging(v => !v)}>{managing ? 'Đóng sổ địa chỉ' : 'Quản lý sổ địa chỉ'}</button>
        {managing && <AddressBook onBusyChange={setSaving} onChanged={address => {
            if (address) {
                choice.current = String(address.id);
                setSelected(choice.current);
                setAddresses(prev => [...prev.filter(a => a.id !== address.id), address]);
                callbacks.current.onSelect(address);
            }
            setRevision(v => v + 1);
        }} />}
    </section>;
}
