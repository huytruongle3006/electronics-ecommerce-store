import React, {useEffect,useRef,useState} from 'react';
import {confirmOrderReceivedApi,getAdminDeliveryApi,getOrderDetailApi,updateOrderDeliveryApi} from '../services/api';

const button={padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
const stamp=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):null;
const day=value=>value?value.slice(0,10).split('-').reverse().join('/'):null;
const errorText=err=>Object.values(err.response?.data?.errors||{}).flat()[0]||err.response?.data?.message||'Chưa xác nhận được kết quả. Tải lại thông tin đơn trước khi thử lại.';

export function DeliveryInfo({order}) {
    return <section aria-label="Thông tin vận chuyển" style={{padding:14,border:'1px solid #bfdbfe',borderRadius:10,background:'#f8fbff',marginBottom:16,overflowWrap:'anywhere'}}>
        <h4 style={{margin:'0 0 10px',fontWeight:700}}>Thông tin vận chuyển</h4>
        <div><strong>Đơn vị vận chuyển:</strong> {order.carrier_name||'Cửa hàng chưa cập nhật'}</div>
        <div><strong>Mã vận đơn:</strong> {order.tracking_number||'Chưa có mã vận đơn'}</div>
        <div><strong>Dự kiến giao:</strong> {day(order.estimated_delivery_date)||'Chưa có ngày dự kiến'}</div>
        {order.dispatched_at&&<div><strong>Bắt đầu giao:</strong> {stamp(order.dispatched_at)}</div>}
        {order.delivered_at&&<div><strong>Giao thành công:</strong> {stamp(order.delivered_at)}</div>}
        {order.receipt_confirmed_at&&<div style={{color:'#15803d'}}><strong>Bạn đã xác nhận nhận hàng:</strong> {stamp(order.receipt_confirmed_at)}</div>}
        <small>Thời gian hiển thị theo giờ Việt Nam. Thông tin do cửa hàng cập nhật; ngày giao là dự kiến.</small>
    </section>;
}

export function DeliveryReceiptPanel({order,onUpdated,onBusyChange,disabled=false}) {
    const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
    const pending=useRef(false),live=useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
    const run=async operation=>{
        if(pending.current||disabled)return;pending.current=true;setBusy(true);onBusyChange?.(true);setError('');
        try{const {data}=await operation();if(live.current){onUpdated(data.data);setConfirm(false);setNotice(data.message||'Đã tải lại đơn hàng.');}}
        catch(err){if(live.current)setError(errorText(err));}
        finally{pending.current=false;onBusyChange?.(false);if(live.current)setBusy(false);}
    };
    return <div style={{marginBottom:18}}>
        <DeliveryInfo order={order}/>
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
        {notice&&<p role="status" style={{color:'#15803d'}}>{notice}</p>}
        <button type="button" style={button} disabled={busy||disabled} onClick={()=>run(()=>getOrderDetailApi(order.id))}>Tải lại giao hàng</button>
        {order.status==='shipping'&&!confirm&&<button type="button" style={{...button,marginLeft:8,background:'#2563eb',color:'#fff'}} disabled={busy||disabled} onClick={()=>setConfirm(true)}>Đã nhận hàng</button>}
        {order.status==='shipping'&&confirm&&<div style={{padding:12,marginTop:12,background:'#fffbeb',borderRadius:8}}>
            <p>Bạn đã nhận đủ hàng của đơn {order.maDH}? Xác nhận sẽ chuyển đơn sang Hoàn tất. Thao tác này không xác nhận đã thu tiền.</p>
            <button type="button" style={button} disabled={busy||disabled} onClick={()=>run(()=>confirmOrderReceivedApi(order.id))}>{busy?'Đang xác nhận...':'Xác nhận đã nhận hàng'}</button>{' '}
            <button type="button" style={button} disabled={busy||disabled} onClick={()=>setConfirm(false)}>Chưa nhận hàng</button>
        </div>}
    </div>;
}

export function AdminDeliveryEditor({order,onUpdated,onBusyChange}) {
    const [form,setForm]=useState({carrier_name:order.carrier_name||'',tracking_number:order.tracking_number||'',estimated_delivery_date:order.estimated_delivery_date?.slice(0,10)||''});
    const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
    const pending=useRef(false),live=useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
    const editable=['confirmed','shipping'].includes(order.status);
    const run=async operation=>{
        if(pending.current)return;pending.current=true;setBusy(true);onBusyChange?.(true);setError('');
        try{const {data}=await operation();if(live.current){setNotice(data.message);onUpdated(data.data);}}
        catch(err){if(live.current)setError(errorText(err));}
        finally{pending.current=false;onBusyChange?.(false);if(live.current)setBusy(false);}
    };
    return <section aria-label="Quản lý giao hàng">
        <DeliveryInfo order={order}/>
        {editable?<form onSubmit={e=>{e.preventDefault();run(()=>updateOrderDeliveryApi(order.id,{...form,expected_version:order.delivery_version||0}));}}>
            <fieldset disabled={busy} style={{border:0,padding:0,margin:0,display:'grid',gap:10,minWidth:0}}>
                <label>Đơn vị vận chuyển<input aria-label="Đơn vị vận chuyển" required maxLength={100} value={form.carrier_name} onChange={e=>setForm({...form,carrier_name:e.target.value})} style={{display:'block',width:'100%',boxSizing:'border-box',padding:9,border:'1px solid #cbd5e1',borderRadius:8}}/></label>
                <label>Mã vận đơn<input aria-label="Mã vận đơn" required maxLength={100} value={form.tracking_number} onChange={e=>setForm({...form,tracking_number:e.target.value})} style={{display:'block',width:'100%',boxSizing:'border-box',padding:9,border:'1px solid #cbd5e1',borderRadius:8}}/></label>
                <label>Ngày giao dự kiến<input aria-label="Ngày giao dự kiến" required type="date" value={form.estimated_delivery_date} onChange={e=>setForm({...form,estimated_delivery_date:e.target.value})} style={{display:'block',padding:9,border:'1px solid #cbd5e1',borderRadius:8}}/></label>
                <small>Lưu thông tin sẽ gửi thông báo cho khách. Chuyển trạng thái Đang giao ở danh sách đơn khi thực sự bàn giao cho đơn vị vận chuyển.</small>
                <button type="submit" style={button}>{busy?'Đang lưu...':'Lưu vận chuyển và thông báo'}</button>
            </fieldset>
        </form>:<p>Chỉ sửa vận chuyển ở đơn đã xác nhận hoặc đang giao.</p>}
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
        <button type="button" style={{...button,marginTop:10}} disabled={busy} onClick={()=>run(()=>getAdminDeliveryApi(order.id))}>Tải lại thông tin vận chuyển</button>
    </section>;
}
