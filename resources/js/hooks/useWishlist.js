import { useEffect, useRef, useState } from 'react';
import { getWishlistApi, saveFavoriteApi, removeFavoriteApi } from '../services/api';

export default function useWishlist(user) {
    const owner = user?.id ?? null;
    const identity = useRef(owner);
    identity.current = owner;
    const generation = useRef(0);
    const pending = useRef(false);
    const [state, setState] = useState({ owner: null, items: [], loading: false, busy: false, error: '' });

    const reload = async () => {
        if (!owner || pending.current) return;
        const request = ++generation.current;
        setState(previous => ({ ...previous, owner, loading: true, error: '' }));
        try {
            const response = await getWishlistApi();
            if (identity.current === owner && generation.current === request) {
                setState({ owner, items: response.data.items, loading: false, busy: false, error: '' });
            }
        } catch (error) {
            if (identity.current === owner && generation.current === request) {
                setState(previous => ({ ...previous, loading: false, error: error.response?.status === 401
                    ? 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất rồi đăng nhập lại.'
                    : 'Không tải được danh sách yêu thích. Hãy thử lại.' }));
            }
        }
    };

    useEffect(() => {
        pending.current = false;
        setState({ owner, items: [], loading: !!owner, busy: false, error: '' });
        reload();
        return () => { generation.current++; };
    }, [owner]);

    const visible = state.owner === owner ? state : { items: [], loading: !!owner, busy: false, error: '' };
    const toggle = async (product) => {
        if (!owner || pending.current || visible.loading || visible.error) return false;
        const request = ++generation.current;
        pending.current = true;
        const exists = visible.items.some(item => item.product_id === product.id);
        setState(previous => ({ ...previous, busy: true }));
        try {
            await (exists ? removeFavoriteApi(product.id) : saveFavoriteApi(product.id));
            if (identity.current === owner && generation.current === request) {
                setState(previous => ({ ...previous, busy: false, items: exists
                    ? previous.items.filter(item => item.product_id !== product.id)
                    : [{ product_id: product.id, product }, ...previous.items] }));
            }
            return true;
        } catch (error) {
            if (identity.current === owner && generation.current === request) {
                // Keep the server-confirmed list; failed writes must not change the heart/count.
                alert(error.response?.data?.errors?.wishlist?.[0] || error.response?.data?.message || 'Không lưu được thay đổi. Hãy thử lại.');
                setState(previous => ({ ...previous, busy: false }));
            }
            return false;
        } finally {
            if (identity.current === owner && generation.current === request) pending.current = false;
        }
    };

    return { ...visible, reload, toggle, has: id => visible.items.some(item => item.product_id === id) };
}
