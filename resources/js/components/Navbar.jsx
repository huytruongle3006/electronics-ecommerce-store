import React, { useEffect, useRef, useState } from 'react';
import { Search, ShieldCheck, ShoppingCart, User, LogOut, Package, LayoutDashboard, Heart, MessageSquare, ChevronDown, Zap } from 'lucide-react';
import './Navbar.css';

export default function Navbar({ searchQuery, setSearchQuery, cartCount, onOpenCart, onOpenWarranty, onResetFilter, user, onOpenAuth, onLogout, onOpenOrders, onOpenAccount, onOpenMyReviews, onOpenAdmin, favoriteCount = 0, onOpenFavorites, cartBusy = false }) {
    const [expanded, setExpanded] = useState(false);
    const account = useRef(null), trigger = useRef(null);
    const admin = !!user && (user.is_admin || user.roles_list?.includes('ADMIN') || user.roles?.some(role => role === 'ADMIN' || role.maRole === 'ADMIN'));
    useEffect(() => { setExpanded(false); }, [user?.id]);
    useEffect(() => {
        if (!expanded) return;
        const outside = event => { if (!account.current?.contains(event.target)) setExpanded(false); };
        const escape = event => { if (event.key === 'Escape') { setExpanded(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [expanded]);
    const act = handler => { setExpanded(false); handler?.(); };
    return <header className="store-header">
        <div className="store-header__main">
            <button className="store-brand" type="button" onClick={onResetFilter} aria-label="TECHSTORE — về trang sản phẩm"><span className="store-brand__mark"><Zap size={26} fill="currentColor" /></span><span><strong>TECHSTORE</strong><small>Thiết bị tốt · Trải nghiệm tốt</small></span></button>
            <div className="store-search"><Search size={19} aria-hidden="true" /><input aria-label="Tìm kiếm sản phẩm" type="search" placeholder="Bạn đang tìm thiết bị gì?" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div>
            <div className="store-header__tools">
                <button type="button" className="store-warranty" onClick={onOpenWarranty} aria-label="Tra cứu bảo hành" title="Tra cứu bảo hành"><ShieldCheck size={20} /><span>Bảo hành</span></button>
                <button type="button" className="store-cart" onClick={onOpenCart} aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}><ShoppingCart size={21} /><span>Giỏ hàng</span><b>{cartBusy ? '…' : cartCount}</b></button>
                {user ? <div className="store-account" ref={account}>
                    <button ref={trigger} className="store-account__trigger" type="button" aria-expanded={expanded} aria-controls="store-account-panel" onClick={() => setExpanded(value => !value)}><span className="store-avatar">{user.full_name?.charAt(0)?.toUpperCase() || 'U'}</span><span className="store-account__name"><small>Xin chào,</small><strong>{user.full_name || 'Khách hàng'}</strong></span><ChevronDown size={16} className={expanded ? 'store-chevron--open' : ''} /></button>
                    {expanded && <div className="store-account__panel" id="store-account-panel"><div className="store-account__intro"><strong>{user.full_name}</strong><span>Tài khoản TECHSTORE của bạn</span></div><nav aria-label="Tùy chọn tài khoản">
                        <button type="button" onClick={() => act(onOpenAccount)}><User size={17} />Quản lý tài khoản</button>
                        <button type="button" onClick={() => act(onOpenOrders)}><Package size={17} />Đơn hàng của tôi</button>
                        <button type="button" onClick={() => act(onOpenMyReviews)}><MessageSquare size={17} />Đánh giá của tôi</button>
                        <button type="button" onClick={() => act(onOpenFavorites)}><Heart size={17} />Sản phẩm yêu thích{favoriteCount > 0 && <span className="store-account__badge">{favoriteCount}</span>}</button>
                        {admin && <button type="button" onClick={() => act(onOpenAdmin)}><LayoutDashboard size={17} />Trang quản trị</button>}
                        <button type="button" className="store-account__logout" onClick={() => act(onLogout)}><LogOut size={17} />Đăng xuất</button>
                    </nav></div>}
                </div> : <button className="store-login" type="button" onClick={onOpenAuth}><User size={19} /><span>Đăng nhập</span></button>}
            </div>
        </div>
    </header>;
}
