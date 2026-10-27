import React,{useEffect,useRef,useState} from 'react';
import {getSupportThreadsApi,createSupportThreadApi,getMyOrdersApi} from '../services/api';
import useSupportMutation,{supportError} from '../hooks/useSupportMutation';
import SupportConversation,{supportLabels,supportDate} from './SupportConversation';
import './SupportCenter.css';

function NewSupport({userId,onCreated,onCancel,onBusyChange}){
    const write=useSupportMutation(`techstore_support_new_v1:${userId}`);
    const [form,setForm]=useState(()=>({subject:write.pending?.subject||'',body:write.pending?.body||'',order_id:write.pending?.order_id||''})),[orders,setOrders]=useState([]),[orderError,setOrderError]=useState(''),[revision,setRevision]=useState(0);
    useEffect(()=>{onBusyChange?.(write.busy);return()=>onBusyChange?.(false);},[write.busy,onBusyChange]);
    useEffect(()=>{let live=true;getMyOrdersApi().then(({data})=>{if(live){setOrders(data.data||[]);setOrderError('');}}).catch(()=>{if(live)setOrderError('Chưa tải được đơn hàng. Bạn vẫn có thể gửi yêu cầu không gắn đơn.');});return()=>{live=false;};},[revision]);
    const submit=async e=>{e.preventDefault();const result=await write.send({...form,subject:form.subject.trim(),body:form.body.trim(),order_id:form.order_id?Number(form.order_id):null},createSupportThreadApi);if(result)onCreated(result.data.id);};
    return <form onSubmit={submit} className="support-new"><h3>Tạo yêu cầu hỗ trợ</h3><fieldset disabled={write.busy||!!write.pending}>
        <label>Tiêu đề<input aria-label="Tiêu đề hỗ trợ" required maxLength={160} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
        <label>Đơn hàng liên quan (tùy chọn)<select aria-label="Đơn hàng liên quan" value={form.order_id} onChange={e=>setForm({...form,order_id:e.target.value})}><option value="">Không gắn đơn hàng</option>{orders.map(o=><option key={o.id} value={o.id}>{o.maDH}</option>)}</select></label>
        <label>Nội dung<textarea aria-label="Nội dung hỗ trợ mới" required maxLength={4000} rows="6" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
    </fieldset>{orderError&&<p className="support-error">{orderError} <button type="button" disabled={write.busy} onClick={()=>setRevision(v=>v+1)}>Tải lại đơn để gắn</button></p>}
        {write.error&&<p role="alert" className="support-error">{write.error}</p>}{write.pending&&!write.busy&&<p>Yêu cầu đang chờ xác nhận kết quả. Gửi lại giữ nguyên mã và nội dung.</p>}
        <div className="support-actions"><button type="submit" disabled={write.busy}>{write.busy?'Đang tạo...':write.pending?'Gửi lại cùng yêu cầu':'Gửi yêu cầu hỗ trợ'}</button><button type="button" disabled={write.busy} onClick={onCancel}>Về danh sách hỗ trợ</button></div>
    </form>;
}

export default function SupportCenter({admin=false,userId,initialThreadId,onBusyChange}){
    const [query,setQuery]=useState({status:'all',search:'',page:1}),[search,setSearch]=useState(''),[revision,setRevision]=useState(0);
    const [rows,setRows]=useState([]),[pagination,setPagination]=useState({last_page:1,total:0}),[loading,setLoading]=useState(true),[error,setError]=useState('');
    const [selected,setSelected]=useState(initialThreadId||null),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false);
    const reload=()=>setRevision(v=>v+1);
    useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
    useEffect(()=>{if(initialThreadId){setSelected(initialThreadId);setCreating(false);}},[initialThreadId]);
    useEffect(()=>{
        let live=true,pending=false;let controller;
        const load=async()=>{if(pending||document.visibilityState==='hidden')return;pending=true;controller=new AbortController();
            try{const {data}=await getSupportThreadsApi(admin,query,controller.signal);if(!live)return;const p=data.data;
                if(query.page>p.last_page){setQuery(q=>({...q,page:Math.max(1,p.last_page)}));return;}setRows(p.data);setPagination({last_page:p.last_page,total:p.total});setError('');
            }catch(err){if(live)setError(err.response?supportError(err):'Không tải được danh sách hỗ trợ. Bấm Làm mới để thử lại.');}finally{pending=false;if(live)setLoading(false);}
        };
        setLoading(true);load();const timer=setInterval(load,8000);window.addEventListener('focus',load);document.addEventListener('visibilitychange',load);
        return()=>{live=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',load);};
    },[admin,query,revision]);
    const active=selected||creating;
    return <div className={'support-center'+(active?' support-center--active':'')}>
        <header className="support-heading"><div><h2>{admin?'Hỗ trợ khách hàng':'Hỗ trợ của tôi'}</h2><small>{pagination.total} yêu cầu · Tin nhắn tự cập nhật khi đang mở.</small></div>{!admin&&<button type="button" disabled={busy} onClick={()=>{setCreating(true);setSelected(null);}}>Tạo yêu cầu mới</button>}</header>
        <div className="support-layout">
            <aside className="support-list"><form onSubmit={e=>{e.preventDefault();setQuery(q=>({...q,search:search.trim(),page:1}));}}><input aria-label="Tìm yêu cầu hỗ trợ" maxLength={100} placeholder={admin?'Tiêu đề, đơn, khách, email':'Tiêu đề hoặc mã đơn'} value={search} onChange={e=>setSearch(e.target.value)}/><div className="support-actions"><select aria-label="Lọc trạng thái hỗ trợ" value={query.status} disabled={busy} onChange={e=>setQuery(q=>({...q,status:e.target.value,page:1}))}><option value="all">Tất cả</option>{Object.entries(supportLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button type="submit" disabled={busy}>Tìm</button><button type="button" disabled={busy} onClick={reload}>Làm mới</button></div></form>
                {error&&<p role="alert" className="support-error">{error}</p>}{loading&&<p role="status">Đang tải yêu cầu...</p>}
                {!loading&&!error&&!rows.length&&<p>Chưa có yêu cầu phù hợp.</p>}
                {rows.map(t=><button key={t.id} type="button" className={'support-thread'+(selected===t.id?' support-thread--active':'')} disabled={busy} onClick={()=>{setSelected(t.id);setCreating(false);}}><strong>#{t.id} · {t.subject}</strong><span>{supportLabels[t.status]}{t.unread_count>0&&` · ${t.unread_count} tin chưa đọc`}</span>{admin&&<small>{t.customer?.name}</small>}{t.order_code&&<small>Đơn {t.order_code}</small>}<time>{supportDate(t.last_message_at)}</time></button>)}
                <div className="support-actions"><button type="button" disabled={busy||loading||query.page<=1} onClick={()=>setQuery(q=>({...q,page:q.page-1}))}>Trước</button><span>{query.page}/{pagination.last_page}</span><button type="button" disabled={busy||loading||query.page>=pagination.last_page} onClick={()=>setQuery(q=>({...q,page:q.page+1}))}>Sau</button></div>
            </aside>
            <div className="support-content">{active&&<button type="button" className="support-back" disabled={busy} onClick={()=>{setSelected(null);setCreating(false);}}>← Danh sách yêu cầu</button>}
                {creating?<NewSupport key={`new:${userId}`} userId={userId} onBusyChange={setBusy} onCancel={()=>setCreating(false)} onCreated={id=>{setCreating(false);setSelected(id);setQuery(q=>({...q,page:1,status:'all',search:''}));setSearch('');reload();}}/>:selected?<SupportConversation key={`${admin?'admin':'customer'}:${userId}:${selected}`} id={selected} admin={admin} userId={userId} onBusyChange={setBusy} onActivity={reload}/>:<p>Chọn một yêu cầu để xem và trả lời{admin?'.':', hoặc tạo yêu cầu mới để nhắn với cửa hàng.'}</p>}
            </div>
        </div>
    </div>;
}

export function SupportModal({userId,initialThreadId,onClose}){
    const [busy,setBusy]=useState(false),dialog=useRef(null);
    useEffect(()=>{const old=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector('button')?.focus();return()=>{document.body.style.overflow=overflow;old?.focus();};},[]);
    const keyDown=e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose();}if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(node=>!node.closest('fieldset[disabled]'));const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
    return <div className="support-overlay"><section ref={dialog} role="dialog" aria-modal="true" aria-label="Trung tâm hỗ trợ" className="support-modal" onKeyDown={keyDown}><div className="support-modal-close"><button type="button" aria-label="Đóng hỗ trợ" disabled={busy} onClick={onClose}>Đóng</button></div><SupportCenter userId={userId} initialThreadId={initialThreadId} onBusyChange={setBusy}/></section></div>;
}
