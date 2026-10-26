import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, RotateCcw, ShoppingCart } from 'lucide-react';
import { getAdvisorOptionsApi, askProductAdvisorApi, getProductDetail } from '../services/api';
import './ProductAdvisor.css';

const money = value => Number(value).toLocaleString('vi-VN') + ' đ';
export default function ProductAdvisor({ onViewProduct, onAddToCart, cartBusy = false }) {
    const [open, setOpen] = useState(false), [messages, setMessages] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const [draft, setDraft] = useState(''), [category, setCategory] = useState(''), [budget, setBudget] = useState('');
    const [options, setOptions] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
    const [error, setError] = useState(''), [notice, setNotice] = useState(''), [reload, setReload] = useState(0), [adding, setAdding] = useState(null);
    const dialog = useRef(null), launcher = useRef(null), bottom = useRef(null), active = useRef(true), sequence = useRef(0), controller = useRef(null), lastRequest = useRef(null), sending = useRef(false);
    useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
    useEffect(() => {
        if (!open) return;
        const abort = new AbortController();
        setLoading(true); setError('');
        getAdvisorOptionsApi(abort.signal).then(({ data }) => { if (!abort.signal.aborted) setOptions(data); })
            .catch(err => { if (!abort.signal.aborted) setError('Chưa tải được cấu hình trợ lý. Hãy thử tải lại.'); })
            .finally(() => { if (!abort.signal.aborted) setLoading(false); });
        return () => abort.abort();
    }, [open, reload]);
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement, overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; dialog.current?.querySelector('button')?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, [open]);
    useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages, busy, open]);
    useEffect(() => { if (!busy) return; setElapsed(0); const timer = setInterval(() => setElapsed(v => v + 1), 1000); return () => clearInterval(timer); }, [busy]);
    const stop = () => { sequence.current++; controller.current?.abort(); sending.current = false; setBusy(false); };
    const close = () => { stop(); setOpen(false); launcher.current?.focus(); };
    const keyDown = event => {
        if (event.key === 'Escape') close();
        if (event.key !== 'Tab') return;
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const send = async request => {
        if (sending.current) return;
        sending.current = true; setBusy(true); setError(''); setNotice(''); lastRequest.current = request;
        const id = ++sequence.current; controller.current = new AbortController();
        const requestController = controller.current;
        let deadline;
        try {
            const timeout = new Promise((_, reject) => { deadline = setTimeout(() => { requestController.abort(); const err = new Error('Trợ lý phản hồi quá lâu. Bạn có thể gửi lại hoặc dùng bộ lọc sản phẩm.'); err.advisorTimeout = true; reject(err); }, 30000); });
            const { data } = await Promise.race([askProductAdvisorApi(request, requestController.signal), timeout]);
            if (!active.current || id !== sequence.current) return;
            setMessages(prev => [...prev, { role: 'assistant', content: data.data.message, cards: data.data.recommendations, filters: data.data.filters, cacheHit: data.data.cache_hit }]);
            lastRequest.current = null;
        } catch (err) {
            if (!active.current || id !== sequence.current) return;
            setError((err.advisorTimeout || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') ? 'Trợ lý phản hồi quá lâu. Bạn có thể gửi lại hoặc dùng bộ lọc sản phẩm.' : err.response?.data?.message || (err.response?.status === 429 ? 'Bạn gửi hơi nhanh. Vui lòng đợi một phút rồi thử lại.' : 'Chưa nhận được tư vấn. Kiểm tra kết nối và thử lại.'));
        } finally { clearTimeout(deadline); if (active.current && id === sequence.current) { sending.current = false; setBusy(false); } }
    };
    const submit = event => {
        event.preventDefault(); if (!draft.trim() || busy || loading || !options?.ready) return;
        const userMessage = { role: 'user', content: draft.trim() };
        const previous = [...messages].reverse().find(m => m.cards?.length)?.cards.map(card => card.product.id) || [];
        const request = { messages: [...messages.slice(-7).map(m => ({ role: m.role, content: m.content })), userMessage], previous_product_ids: previous };
        if (category) request.category_id = Number(category);
        if (budget !== '') request.max_price = Number(budget);
        setMessages(prev => [...prev, userMessage]); setDraft(''); send(request);
    };
    const add = async product => {
        if (adding || cartBusy) return;
        setAdding(product.id); setError(''); setNotice('');
        try {
            const { data } = await getProductDetail(product.id); const fresh = data.data;
            if (!active.current) return;
            if (fresh.status !== 'active' || Number(fresh.quantity) < 1) throw Error('Sản phẩm vừa hết hàng hoặc ngừng bán. Hãy hỏi trợ lý lại để lấy gợi ý mới.');
            const added = await onAddToCart(fresh, 1);
            if (!active.current) return;
            if (added === false) setError('Chưa thêm được sản phẩm. Hãy kiểm tra giỏ hàng và thử lại.');
            else setNotice('Đã thêm sản phẩm vào giỏ với giá hiện tại: ' + money(fresh.price));
        } catch (err) { if (active.current) setError(err.response ? 'Chưa tải được sản phẩm hiện tại. Hãy thử lại.' : err.message); }
        finally { if (active.current) setAdding(null); }
    };
    return <>
        <button ref={launcher} type="button" className="advisor-launcher" onClick={() => setOpen(true)}><Sparkles size={20}/>AI chọn sản phẩm</button>
        {open && <div className="advisor-overlay"><section ref={dialog} className="advisor-dialog" role="dialog" aria-modal="true" aria-labelledby="advisor-title" onKeyDown={keyDown}>
            <header className="advisor-header"><div><strong id="advisor-title"><Sparkles size={20}/>Trợ lý AI chọn sản phẩm · Gemini</strong><small>Tư vấn từ sản phẩm đang bán và còn hàng của TECHSTORE</small></div><button type="button" aria-label="Đóng trợ lý" onClick={close}><X size={22}/></button></header>
            <div className="advisor-filters"><label>Loại thiết bị (tùy chọn)<select name="advisor_category" value={category} disabled={busy || loading} onChange={e => setCategory(e.target.value)}><option value="">Để AI xác định</option>{options?.categories.map(c => <option key={c.id} value={c.id}>{c.tenLoai}</option>)}</select></label>
                <label>Ngân sách tối đa, VND (tùy chọn)<input name="advisor_budget" type="number" min="0" max="1000000000000" step="1" placeholder="Ví dụ: 20000000" value={budget} disabled={busy} onChange={e => setBudget(e.target.value)}/></label></div>
            <div className="advisor-conversation" aria-live="polite" aria-relevant="additions text">
                {!messages.length && <div className="advisor-welcome"><h3>Bạn cần thiết bị cho việc gì?</h3><p>Nêu loại thiết bị, ngân sách và nhu cầu. Ví dụ: “Tìm laptop học CNTT dưới 20 triệu, ưu tiên RAM và gọn nhẹ”.</p><p>AI chọn ứng viên; giá, tồn kho và các thông số hiển thị được lấy từ database cửa hàng. Dữ liệu thiếu sẽ cần hỏi thêm, không cam kết FPS hay thời lượng pin nếu chưa được kiểm chứng.</p></div>}
                {messages.map((message, index) => <article key={index} className={'advisor-message advisor-message--'+message.role}><strong>{message.role === 'user' ? 'Bạn' : 'Trợ lý AI'}</strong><p>{message.content}</p>
                    {message.role === 'assistant' && message.filters?.max_price !== null && message.filters?.max_price !== undefined && <small>Giới hạn giá áp dụng: {money(message.filters.max_price)}</small>}
                    {message.cacheHit && <small>Đã dùng kết quả tư vấn gần đây; sản phẩm được đối chiếu lại với dữ liệu hiện tại.</small>}
                    {message.cards?.map((card, rank) => <div className="advisor-product" key={card.product.id}><span className="advisor-rank">Gợi ý {rank + 1}</span><h4>{card.product.tenSP}</h4><strong className="advisor-price">{money(card.product.price)}</strong><small>Còn {card.product.quantity} · Bảo hành {card.product.warranty_months || 0} tháng</small><p>{card.assessment}</p>
                        {card.evidence.length > 0 ? <ul>{card.evidence.map((fact, i) => <li key={i}>{fact}</li>)}</ul> : <p className="advisor-muted">Chưa có đủ thông số liên quan để giải thích chi tiết. Xem trang sản phẩm hoặc hỏi cửa hàng.</p>}
                        <div className="advisor-product-actions"><button type="button" onClick={() => { close(); onViewProduct(card.product.id); }}>Xem chi tiết</button><button type="button" disabled={!!adding || cartBusy} onClick={() => add(card.product)}><ShoppingCart size={15}/>{adding === card.product.id ? 'Đang thêm...' : 'Thêm vào giỏ'}</button></div>
                    </div>)}
                </article>)}
                {busy && <p role="status" className="advisor-muted">Đang phân tích nhu cầu và kiểm tra sản phẩm… {elapsed}s (tối đa khoảng 30 giây)</p>}
                <div ref={bottom}/>
            </div>
            <div className="advisor-status">{loading && <p role="status">Đang tải trợ lý...</p>}{options && !options.ready && <p role="status">Trợ lý Gemini chưa được bật. Cửa hàng cần cấu hình GEMINI_API_KEY ở backend.</p>}
                {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
                {!busy && lastRequest.current && error && <button type="button" onClick={() => send(lastRequest.current)}>Gửi lại yêu cầu</button>}
                {!busy && <button type="button" onClick={() => setReload(v => v + 1)}>Tải lại trạng thái AI</button>}
            </div>
            <form className="advisor-compose" onSubmit={submit}><label className="advisor-input-label">Nhu cầu của bạn<textarea name="advisor_message" required maxLength={1000} rows={2} value={draft} disabled={busy || !options?.ready} onChange={e => setDraft(e.target.value)} placeholder="Bạn muốn tìm sản phẩm nào?"/></label><div><button type="button" title="Xóa hội thoại" onClick={() => { stop(); setMessages([]); setError(''); setNotice(''); lastRequest.current = null; }} disabled={!!adding}><RotateCcw size={17}/>Hội thoại mới</button><button type="submit" disabled={busy || loading || !options?.ready || !draft.trim()}><Send size={17}/>Gửi</button></div></form>
            <small className="advisor-footer">Hội thoại tư vấn được gửi tới Google Gemini. Giá/tồn kho có thể thay đổi và được kiểm tra lại khi thêm vào giỏ, đặt hàng.</small>
        </section></div>}
    </>;
}
