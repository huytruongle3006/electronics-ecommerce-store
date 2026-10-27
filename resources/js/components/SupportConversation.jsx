import React,{useEffect,useRef,useState} from 'react';
import {getSupportThreadApi,sendSupportMessageApi,readSupportThreadApi,setSupportStatusApi} from '../services/api';
import useSupportMutation,{supportError} from '../hooks/useSupportMutation';
export const supportLabels={open:'Chờ xử lý',in_progress:'Đang xử lý',resolved:'Đã giải quyết'};
export const supportDate=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';

export default function SupportConversation({id,admin,userId,onBusyChange,onActivity}){
    const [thread,setThread]=useState(null),[messages,setMessages]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
    const [moreBefore,setMoreBefore]=useState(false),[moreAfter,setMoreAfter]=useState(false),[draft,setDraft]=useState(''),[status,setStatus]=useState('open'),[statusBusy,setStatusBusy]=useState(false);
    const write=useSupportMutation(`techstore_support_send_v1:${admin?'admin':'customer'}:${userId}:${id}`);
    const rows=useRef([]),live=useRef(true),fetching=useRef(false),controller=useRef(null),reading=useRef(false),statusPending=useRef(false),bottom=useRef(null),nearBottom=useRef(true);
    const busy=write.busy||statusBusy;
    useEffect(()=>{onBusyChange?.(busy);return()=>{onBusyChange?.(false);};},[busy,onBusyChange]);
    const merge=newRows=>{const map=new Map([...rows.current,...newRows].map(row=>[row.id,row]));const result=[...map.values()].sort((a,b)=>a.id-b.id);rows.current=result;setMessages(result);};
    const load=async(mode='new')=>{
        if(fetching.current)return;fetching.current=true;setRefreshing(true);controller.current=new AbortController();
        const initial=rows.current.length===0,params=initial?{}:mode==='older'?{before_id:rows.current[0].id}:{after_id:rows.current.at(-1).id};
        try{const {data}=await getSupportThreadApi(id,admin,params,controller.current.signal);if(!live.current)return;
            setThread(data.thread);merge(data.messages);if(initial||mode==='older')setMoreBefore(data.has_more_before);if(mode!=='older')setMoreAfter(data.has_more_after);setError('');
        }catch(err){if(live.current)setError(err.response?supportError(err):'Không tải được hội thoại. Bấm Tải lại hội thoại để thử lại.');}finally{fetching.current=false;if(live.current){setLoading(false);setRefreshing(false);}}
    };
    useEffect(()=>{live.current=true;load();const poll=()=>{if(document.visibilityState!=='hidden'&&!write.running.current&&!statusPending.current)load();};const timer=setInterval(poll,5000);window.addEventListener('focus',poll);document.addEventListener('visibilitychange',poll);return()=>{live.current=false;controller.current?.abort();clearInterval(timer);window.removeEventListener('focus',poll);document.removeEventListener('visibilitychange',poll);};},[id,admin]);
    useEffect(()=>{if(thread)setStatus(thread.status);},[thread?.status]);
    const lastId=messages.at(-1)?.id||0;
    useEffect(()=>{if(nearBottom.current)bottom.current?.scrollIntoView?.({block:'nearest'});},[lastId]);
    useEffect(()=>{
        if(!thread?.unread_count||!lastId||reading.current||document.visibilityState==='hidden'||!document.hasFocus())return;
        reading.current=true;readSupportThreadApi(id,admin,lastId).then(({data})=>{if(live.current){setThread(previous=>({...previous,unread_count:data.unread_count}));onActivity?.();}}).catch(()=>{}).finally(()=>{reading.current=false;});
    },[lastId,thread?.unread_count]);
    const send=async e=>{
        e?.preventDefault();if(statusPending.current||(!draft.trim()&&!write.pending))return;
        const data=await write.send({body:draft.trim()},payload=>sendSupportMessageApi(id,admin,payload));
        if(data&&live.current){nearBottom.current=true;merge([data.message]);setDraft('');onActivity?.();load();}
    };
    const changeStatus=async()=>{
        if(statusPending.current||write.running.current||!thread)return;statusPending.current=true;setStatusBusy(true);
        try{const {data}=await setSupportStatusApi(id,{status,expected_version:thread.version});if(live.current){setThread(data.data);setError('');onActivity?.();}}
        catch(err){if(live.current)setError(supportError(err));}finally{statusPending.current=false;if(live.current)setStatusBusy(false);}
    };
    return <section className="support-conversation" aria-label="Nội dung hội thoại hỗ trợ">
        {loading?<p role="status">Đang tải hội thoại...</p>:<>
            {thread&&<header><h3>#{thread.id} · {thread.subject}</h3><p>{supportLabels[thread.status]}{thread.order_code&&' · Đơn '+thread.order_code}</p>{admin&&<p>{thread.customer?.name} · {thread.customer?.email}</p>}
                {admin&&<div className="support-actions"><select aria-label="Trạng thái hỗ trợ" value={status} disabled={busy} onChange={e=>setStatus(e.target.value)}>{Object.entries(supportLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button type="button" disabled={busy||refreshing} onClick={changeStatus}>Cập nhật trạng thái</button></div>}
            </header>}
            {error&&<p role="alert" className="support-error">{error}</p>}
            <div className="support-actions"><button type="button" disabled={busy||refreshing} onClick={()=>load()}>Tải lại hội thoại</button>{moreBefore&&<button type="button" disabled={refreshing||busy} onClick={()=>load('older')}>Xem tin nhắn cũ hơn</button>}{moreAfter&&<button type="button" disabled={refreshing||busy} onClick={()=>load()}>Tải tiếp tin mới</button>}</div>
            <div className="support-messages" aria-label="Lịch sử tin nhắn" onScroll={e=>{nearBottom.current=e.currentTarget.scrollHeight-e.currentTarget.scrollTop-e.currentTarget.clientHeight<100;}}>
                {messages.map(m=><article key={m.id} className={m.sender_role===(admin?'admin':'customer')?'support-message support-message--own':'support-message'}><strong>{m.sender_name}</strong><p>{m.body}</p><time>{supportDate(m.created_at)}</time></article>)}<div ref={bottom}/>
            </div>
            {thread&&<form onSubmit={send} className="support-composer"><label>Tin nhắn<textarea aria-label="Tin nhắn hỗ trợ" rows="3" maxLength={4000} value={write.pending?.body??draft} disabled={busy||!!write.pending} onChange={e=>setDraft(e.target.value)} placeholder="Nhập nội dung cần trao đổi..."/></label>
                {thread.status==='resolved'&&<small>Gửi tin mới sẽ mở lại yêu cầu để tiếp tục trao đổi.</small>}{write.error&&<p role="alert" className="support-error">{write.error}</p>}
                {write.pending&&!busy&&<p>Chưa xác nhận được lần gửi trước. Gửi lại cùng yêu cầu để không tạo tin trùng.</p>}
                <button type="submit" disabled={busy||(!draft.trim()&&!write.pending)}>{write.busy?'Đang gửi...':write.pending?'Gửi lại cùng yêu cầu':'Gửi tin nhắn'}</button>
                <small>Tự cập nhật khoảng 5 giây khi tab đang hiển thị. Chỉ hỗ trợ nội dung chữ, chưa có tệp đính kèm.</small>
            </form>}
        </>}
    </section>;
}
