import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { getNotificationsApi, readNotificationApi, readAllNotificationsApi } from '../services/api';
import './NotificationBell.css';

export default function NotificationBell({ onOpenNotification }) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [unread, setUnread] = useState(0);
    const [latest, setLatest] = useState(0);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const live = useRef(false), pending = useRef(false), container = useRef(null), trigger = useRef(null);
    const pageRef = useRef(page); pageRef.current = page;

    const fail = err => setError(err.response?.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : 'Không tải/cập nhật được thông báo. Hãy thử lại.');
    const load = async () => {
        if (!live.current || pending.current) return;
        pending.current = true; setBusy(true);
        try {
            const { data } = await getNotificationsApi(pageRef.current);
            if (!live.current) return;
            setRows(data.data.data); setUnread(data.unread_count); setLatest(data.latest_id);
            setLastPage(data.data.last_page); setLoaded(true); setError('');
        } catch (err) { if (live.current) fail(err); }
        finally { pending.current = false; if (live.current) setBusy(false); }
    };
    useEffect(() => {
        live.current = true;
        load();
        const refreshVisible = () => { if (document.visibilityState !== 'hidden') load(); };
        const timer = setInterval(refreshVisible, 20000);
        window.addEventListener('focus', refreshVisible);
        document.addEventListener('visibilitychange', refreshVisible);
        return () => { live.current = false; clearInterval(timer); window.removeEventListener('focus', refreshVisible); document.removeEventListener('visibilitychange', refreshVisible); };
    }, []);
    useEffect(() => { load(); }, [page]);
    useEffect(() => {
        if (!open) return;
        const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
        const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);

    const mark = async notification => {
        if (pending.current) return;
        pending.current = true; setBusy(true); setError('');
        let succeeded = false;
        try {
            if (!notification.read_at) await readNotificationApi(notification.id);
            if (!live.current) return;
            succeeded = true; setOpen(false); onOpenNotification?.(notification);
        } catch (err) { if (live.current) fail(err); }
        finally {
            pending.current = false;
            if (live.current) { setBusy(false); if (succeeded) load(); }
        }
    };
    const markAll = async () => {
        if (pending.current || !latest) return;
        pending.current = true; setBusy(true); setError('');
        try { await readAllNotificationsApi(latest); }
        catch (err) { if (live.current) fail(err); return; }
        finally { pending.current = false; if (live.current) setBusy(false); }
        if (live.current) load();
    };
    const date = value => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString('vi-VN');
    };
    return <div className="store-notifications" ref={container}>
        <button ref={trigger} type="button" className="store-notifications__trigger" aria-label={`Thông báo, ${unread} chưa đọc${error ? ', lỗi kết nối' : ''}`} aria-expanded={open} aria-controls="store-notifications-panel" onClick={() => { setOpen(v => !v); if (!open) load(); }}>
            <Bell size={21} aria-hidden="true" />{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}{error && <span className="store-notifications__warning" title="Không cập nhật được thông báo">!</span>}
        </button>
        {open && <section className="store-notifications__panel" id="store-notifications-panel" aria-label="Thông báo của tôi">
            <div className="store-notifications__header"><strong>Thông báo {unread > 0 && `(${unread} chưa đọc)`}</strong><button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={18}/></button></div>
            <div className="store-notifications__actions">
                <button type="button" disabled={busy} onClick={load}><RefreshCw size={15}/>Tải lại</button>
                <button type="button" disabled={busy || !unread} onClick={markAll}><CheckCheck size={15}/>Đánh dấu tất cả đã đọc</button>
            </div>
            {error && <p role="alert" className="store-notifications__error">{error}</p>}
            {busy && !loaded && <p role="status">Đang tải thông báo...</p>}
            <div className="store-notifications__list">
                {loaded && !rows.length && <p>Bạn chưa có thông báo. Cập nhật mới sẽ xuất hiện tại đây.</p>}
                {rows.map(row => <button type="button" key={row.id} disabled={busy} className={`store-notifications__item ${row.read_at ? '' : 'store-notifications__item--unread'}`} onClick={() => mark(row)}>
                    <strong>{!row.read_at && <span aria-label="Chưa đọc">● </span>}{row.title}</strong>
                    <span>{row.body}</span><time dateTime={row.created_at}>{date(row.created_at)}</time>
                </button>)}
            </div>
            {lastPage > 1 && <div className="store-notifications__pages"><button type="button" disabled={busy || page <= 1} onClick={() => setPage(v => v - 1)}>Trước</button><span>{page}/{lastPage}</span><button type="button" disabled={busy || page >= lastPage} onClick={() => setPage(v => v + 1)}>Sau</button></div>}
            <small className="store-notifications__hint">Tự cập nhật mỗi 20 giây khi tab đang hiển thị.</small>
        </section>}
    </div>;
}
