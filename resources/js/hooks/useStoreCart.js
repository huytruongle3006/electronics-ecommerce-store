import { useEffect, useRef, useState } from 'react';
import { getCartApi, addToCartApi, updateCartItemApi, removeCartItemApi, mergeGuestCartApi } from '../services/api';

export const GUEST_CART_KEY = 'techstore_guest_cart_v1';
const uuid = () => globalThis.crypto?.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ (globalThis.crypto?.getRandomValues(new Uint8Array(1))[0] ?? Math.floor(Math.random() * 256)) & 15 >> Number(c) / 4).toString(16));
const empty = () => ({ version: 1, batch_id: uuid(), items: [] });
function readGuest() {
    try {
        const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY));
        if (!value || value.version !== 1 || !/^[a-f0-9-]{36}$/i.test(value.batch_id) || !Array.isArray(value.items)) return empty();
        const seen = new Set();
        value.items = value.items.filter(item => {
            if (!Number.isInteger(item.id) || item.id < 1 || seen.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999 || !item.product) return false;
            seen.add(item.id); return true;
        }).slice(0, 100);
        return value;
    } catch { return empty(); }
}
const message = error => error.response?.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : error.response?.data?.message || 'Không đồng bộ được giỏ hàng. Các món chưa gộp vẫn được giữ lại, hãy thử lại.';

export default function useStoreCart(user) {
    const owner = user?.id ?? null;
    const ownerRef = useRef(owner); ownerRef.current = owner;
    const [guest, setGuest] = useState(readGuest), guestRef = useRef(guest);
    const [state, setState] = useState({ owner, items: [], busy: false, error: '', info: '' });
    const sequence = useRef(0), pending = useRef(false);
    const persist = value => {
        guestRef.current = value; setGuest(value);
        try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(value)); }
        catch { setState(previous => ({ ...previous, error: 'Trình duyệt không cho lưu giỏ khách. Hãy cho phép lưu dữ liệu trang để giữ giỏ khi tải lại.' })); }
    };
    useEffect(() => {
        const sync = event => {
            if (event.key !== GUEST_CART_KEY) return;
            const value = readGuest(); guestRef.current = value; setGuest(value);
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);
    const load = async () => {
        if (!owner || pending.current) return;
        const current = ++sequence.current; pending.current = true;
        setState(previous => ({ ...previous, owner, busy: true, error: '' }));
        const valid = () => ownerRef.current === owner && sequence.current === current;
        try {
            let value = guestRef.current;
            if (value.items.length) {
                if (value.merge_owner && value.merge_owner !== owner) throw new Error('Giỏ khách đang chờ xác nhận cho tài khoản trước. Hãy đăng nhập lại tài khoản đó để hoàn tất gộp giỏ.');
                value = { ...value, merge_owner: owner }; persist(value);
                const response = await mergeGuestCartApi({ batch_id: value.batch_id, items: value.items.map(item => ({ product_id: item.id, quantity: item.quantity })) });
                if (!valid()) return;
                const skipped = new Set(response.data.merge.skipped.map(item => item.product_id));
                // Only clear the exact batch acknowledged by the server.
                if (guestRef.current.batch_id === value.batch_id) {
                    const remaining = value.items.filter(item => skipped.has(item.id));
                    persist({ ...empty(), items: remaining, ...(remaining.length ? { batch_id: response.data.merge.retry_batch_id, merge_owner: owner } : {}) });
                }
                setState({ owner, items: response.data.items, busy: false, error: '', info: skipped.size ? 'Một số món chưa gộp vì không đủ hàng hoặc ngừng bán. Các món này vẫn được giữ bên dưới.' : 'Đã gộp giỏ khách vào giỏ tài khoản.' });
            } else {
                const response = await getCartApi();
                if (valid()) setState(previous => ({ ...previous, owner, items: response.data.items || [], busy: false, error: '' }));
            }
        } catch (error) {
            if (valid()) {
                setState(previous => ({ ...previous, error: error.response ? message(error) : error.message || message(error), busy: false }));
                // A merge failure must not hide an existing account cart.
                try { const response = await getCartApi(); if (valid()) setState(previous => ({ ...previous, items: response.data.items || [] })); } catch {}
            }
        } finally { if (valid()) { pending.current = false; setState(previous => ({ ...previous, busy: false })); } }
    };
    useEffect(() => {
        pending.current = false;
        setState({ owner, items: [], busy: !!owner, error: '', info: '' });
        if (owner) load();
        return () => { sequence.current++; };
    }, [owner]);

    const transact = async action => {
        if (pending.current) return false;
        pending.current = true; const current = ++sequence.current;
        setState(previous => ({ ...previous, busy: true, error: '' }));
        const valid = () => ownerRef.current === owner && sequence.current === current;
        try {
            await action(); const response = await getCartApi();
            if (valid()) setState(previous => ({ ...previous, items: response.data.items || [], busy: false }));
            return valid();
        } catch (error) { if (valid()) setState(previous => ({ ...previous, busy: false, error: message(error) })); return false; }
        finally { if (valid()) pending.current = false; }
    };
    const add = async (product, quantity = 1) => {
        if (!Number.isInteger(quantity) || quantity < 1) return false;
        if (owner) return transact(() => addToCartApi(product.id, quantity));
        const value = guestRef.current;
        if (value.merge_owner) { setState(previous => ({ ...previous, error: 'Hãy đăng nhập lại để hoàn tất đồng bộ giỏ khách trước.' })); return false; }
        const existing = value.items.find(item => item.id === product.id), total = (existing?.quantity || 0) + quantity;
        if (total > Math.min(999, Number(product.quantity)) || (!existing && value.items.length >= 100)) {
            setState(previous => ({ ...previous, error: 'Không đủ tồn kho hoặc đã đạt giới hạn 100 loại sản phẩm trong giỏ khách.' })); return false;
        }
        const snapshot = { id: product.id, tenSP: product.tenSP, maSP: product.maSP, price: product.price, quantity: product.quantity, warranty_months: product.warranty_months };
        persist({ ...empty(), items: existing ? value.items.map(item => item.id === product.id ? { ...item, quantity: total, product: snapshot } : item) : [...value.items, { id: product.id, quantity: total, product: snapshot }] });
        setState(previous => ({ ...previous, error: '' })); return true;
    };
    const remove = id => {
        if (owner) return transact(() => removeCartItemApi(id));
        if (guestRef.current.merge_owner) return;
        persist({ ...empty(), items: guestRef.current.items.filter(item => item.id !== id) });
    };
    const update = (id, delta) => {
        const items = owner ? state.items : guestRef.current.items;
        const item = items.find(row => row.id === id); if (!item) return;
        const quantity = item.quantity + delta;
        if (quantity < 1) return remove(id);
        if (owner) return transact(() => updateCartItemApi(id, quantity));
        if (guestRef.current.merge_owner) return;
        if (quantity > Math.min(999, Number(item.product.quantity))) { setState(previous => ({ ...previous, error: 'Số lượng vượt tồn kho.' })); return; }
        persist({ ...empty(), items: guestRef.current.items.map(row => row.id === id ? { ...row, quantity } : row) });
    };
    const visible = state.owner === owner ? state : { items: [], busy: !!owner, error: '', info: '' };
    return { ...visible, items: owner ? visible.items : guest.merge_owner ? [] : guest.items, load, add, update, remove,
        remaining: owner && guest.merge_owner === owner ? guest.items : [],
        discardRemaining: () => { if (!pending.current) persist(empty()); },
    };
}
