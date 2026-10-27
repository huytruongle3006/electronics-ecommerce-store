import React,{useEffect,useRef,useState} from 'react';
import {getAdminOrderApi,updateOrderStatusApi} from '../services/api';
import OrderPrintButton from './OrderPrintButton';
import {AdminDeliveryEditor} from './OrderDelivery';
import ConfirmCodPayment from './ConfirmCodPayment';
import {canChangeOrderStatus,cancellationNote} from '../utils/orderStatus';

export const statusLabels={pending:'Chờ duyệt',confirmed:'Đã xác nhận',shipping:'Đang giao',completed:'Hoàn tất',cancelled:'Đã hủy'};
export const money=value=>Number(value||0).toLocaleString('vi-VN',{maximumFractionDigits:2})+' đ';
export const stamp=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ghi nhận';
const button={padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
const box={padding:16,border:'1px solid #e2e8f0',borderRadius:10,overflowWrap:'anywhere'};
const failure=err=>Object.values(err.response?.data?.errors||{}).flat()[0]||err.response?.data?.message||'Không xác nhận được kết quả. Hãy tải lại chi tiết trước khi thử lại.';
export default function AdminOrderDetail({orderId,onClose,onChanged}){
    const [order,setOrder]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
    const [action,setAction]=useState(''),[reason,setReason]=useState(''),[saving,setSaving]=useState(false),[deliveryBusy,setDeliveryBusy]=useState(false),[codBusy,setCodBusy]=useState(false);
    const live=useRef(true),sequence=useRef(0),controller=useRef(null),pending=useRef(false),dialog=useRef(null);
    const busy=saving||deliveryBusy||codBusy;
    const load=async()=>{
        const id=++sequence.current;controller.current?.abort();controller.current=new AbortController();setLoading(true);setError('');
        try{const {data}=await getAdminOrderApi(orderId,controller.current.signal);if(live.current&&id===sequence.current){setOrder(data.data);setAction('');}}
        catch(err){if(live.current&&id===sequence.current)setError(failure(err));}
        finally{if(live.current&&id===sequence.current)setLoading(false);}
    };
    useEffect(()=>{live.current=true;const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();load();return()=>{live.current=false;sequence.current++;controller.current?.abort();previous?.focus();};},[orderId]);
    const change=async()=>{
        if(pending.current||busy||!action||!order)return;
        if(action==='cancelled'&&!reason.trim()){setError('Vui lòng nhập lý do hủy đơn.');return;}
        pending.current=true;setSaving(true);setError('');setNotice('');
        try{const {data}=await updateOrderStatusApi(order.id,action,{expected_status:order.status,...(action==='cancelled'?{reason:reason.trim()}:{})});if(live.current){setNotice(data.message);setAction('');setReason('');onChanged?.();await load();}}
        catch(err){if(live.current){setError(failure(err));setAction('');}}
        finally{pending.current=false;if(live.current)setSaving(false);}
    };
    const reloadAfterMutation=()=>{if(live.current){onChanged?.();load();}};
    const keyDown=e=>{
        if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose();}
        if(e.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(node=>!node.closest('fieldset[disabled]'));const first=nodes[0],last=nodes.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    return <div style={{position:'fixed',inset:0,zIndex:95,background:'rgba(15,23,42,.65)',padding:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng admin" style={{width:'100%',maxWidth:1100,maxHeight:'92vh',display:'flex',flexDirection:'column',background:'#fff',borderRadius:16,overflow:'hidden'}}>
            <header style={{padding:18,borderBottom:'1px solid #e2e8f0',display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}><div><h2 style={{margin:0}}>Chi tiết đơn {order?.maDH||'#'+orderId}</h2><small>Thông tin cập nhật từ server · giờ Việt Nam</small></div><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><OrderPrintButton key={`print:${orderId}`} orderId={orderId} admin disabled={busy||loading||!!error}/><button type="button" style={button} disabled={busy||loading} onClick={load}>Tải lại chi tiết</button><button type="button" aria-label="Đóng chi tiết đơn" style={button} disabled={busy} onClick={onClose}>Đóng</button></div></header>
            <div style={{overflowY:'auto',padding:18,display:'grid',gap:16}}>
                {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}{notice&&<p role="status" style={{color:'#15803d'}}>{notice}</p>}
                {loading?<p role="status">Đang tải chi tiết đơn hàng...</p>:!order?<p>Chưa tải được đơn hàng. Bấm Tải lại chi tiết để thử lại.</p>:<>
                    <section style={box}><h3>Tình trạng và xử lý đơn</h3><p><strong>{statusLabels[order.status]||order.status}</strong> · Ngày đặt: {stamp(order.created_at)}</p>
                        {order.status==='cancelled'&&<p style={{color:'#b91c1c'}}>{cancellationNote(order)||'Đơn đã hủy.'}{order.payment?.payment_status==='paid'&&' Đơn đã thanh toán; cần xử lý hoàn tiền theo luồng hiện có.'}</p>}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{Object.entries(statusLabels).filter(([key])=>key!==order.status&&canChangeOrderStatus(order.status,key)).map(([key,label])=><button key={key} type="button" style={button} disabled={busy||!!error} onClick={()=>{setAction(key);setReason('');setError('');}}>Chuyển sang {label}</button>)}</div>
                        {['completed','cancelled'].includes(order.status)&&<p>Đơn đã kết thúc, không thể mở lại trạng thái.</p>}
                        {action&&<div style={{marginTop:12,padding:12,background:'#fffbeb',borderRadius:8}}><p>Xác nhận chuyển đơn {order.maDH} sang {statusLabels[action]}?</p>{action==='cancelled'&&<label>Lý do hủy<input aria-label="Lý do hủy đơn admin" maxLength={200} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',padding:8}}/></label>}<p>Khách sẽ nhận thông báo trong website. Chuyển trạng thái không tự xác nhận thu tiền.</p><button type="button" style={button} disabled={busy} onClick={change}>{saving?'Đang xử lý...':'Xác nhận cập nhật trạng thái'}</button>{' '}<button type="button" style={button} disabled={busy} onClick={()=>setAction('')}>Bỏ qua</button></div>}
                    </section>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16}}>
                        <section style={box}><h3>Tài khoản đặt hàng</h3><p>{order.user?.full_name||'Tài khoản không còn tồn tại'}</p><p>{order.user?.email||'Chưa có email'}</p><p>{order.user?.phone||'Chưa có số điện thoại tài khoản'}</p><small>Mã tài khoản: {order.user_id}</small></section>
                        <section style={box}><h3>Người nhận và địa chỉ</h3><p>{order.recipient_name} · {order.recipient_phone}</p><p style={{whiteSpace:'pre-wrap'}}>{order.shipping_address}</p><p style={{whiteSpace:'pre-wrap'}}>Ghi chú: {order.note||'Không có'}</p></section>
                    </div>
                    <section style={box}><h3>Sản phẩm đã đặt</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:580}}><thead><tr>{['Sản phẩm','Số lượng','Đơn giá đã đặt','Thành tiền'].map(text=><th key={text} style={{padding:10,textAlign:'left',borderBottom:'1px solid #cbd5e1'}}>{text}</th>)}</tr></thead><tbody>{order.details?.length?order.details.map(item=><tr key={item.id}><td style={{padding:10}}>{item.product?.tenSP||`Sản phẩm #${item.product_id} đã gỡ`}<small style={{display:'block'}}>{item.product?.maSP||''}</small></td><td style={{padding:10}}>{item.quantity}</td><td style={{padding:10}}>{money(item.price)}</td><td style={{padding:10}}>{money(item.total_line)}</td></tr>):<tr><td colSpan="4">Chưa có chi tiết sản phẩm.</td></tr>}</tbody></table></div></section>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:16}}>
                        <section style={box}><h3>Tổng tiền và giảm giá</h3><p>Tạm tính: {money(order.total_amount)}</p><p>Giảm giá: -{money(order.discount_amount)}</p><p>Mã giảm giá: {order.voucher?.maVoucher||'Không có hoặc mã đã gỡ'}</p><p style={{fontSize:18,fontWeight:700,color:'#dc2626'}}>Tổng thanh toán: {money(order.final_amount)}</p></section>
                        <section style={box}><h3>Thanh toán</h3><p>Phương thức: {order.payment?.payment_method?.toUpperCase()||'Chưa có bản ghi'}</p><p>Trạng thái: {{pending:'Chưa xác nhận thu tiền',paid:'Đã ghi nhận thanh toán',refunded:'Đã ghi nhận hoàn tiền',failed:'Thất bại'}[order.payment?.payment_status]||'Chưa có thông tin'}</p><p>Số tiền ghi nhận: {order.payment?money(order.payment.amount):'Chưa có'}</p><p>Mã giao dịch/phiếu thu: {order.payment?.transaction_code||'Chưa có'}</p><p>Thời gian thanh toán: {stamp(order.payment?.paid_at)}</p><fieldset disabled={saving||deliveryBusy||!!error} style={{border:0,padding:0,margin:0}}><ConfirmCodPayment key={`cod:${order.id}:${order.payment?.payment_status}`} order={order} onBusyChange={setCodBusy} onConfirmed={reloadAfterMutation}/></fieldset></section>
                    </div>
                    <fieldset disabled={saving||codBusy||!!error} style={{border:0,padding:0,margin:0,minWidth:0}}><AdminDeliveryEditor key={`delivery:${order.id}:${order.delivery_version||0}:${order.status}`} order={order} onBusyChange={setDeliveryBusy} onUpdated={reloadAfterMutation}/></fieldset>
                    <section style={box}><h3>Lịch sử xử lý</h3>{order.histories?.length?<ol style={{paddingLeft:22}}>{[...order.histories].sort((a,b)=>Number(a.id)-Number(b.id)).map(row=><li key={row.id} style={{marginBottom:14}}><strong>{statusLabels[row.status_changed]||row.status_changed}</strong> · {stamp(row.created_at)}<p>Người xử lý: {row.changer?.full_name||`Tài khoản #${row.changed_by||'không xác định'}`}</p><p style={{whiteSpace:'pre-wrap'}}>{row.note||'Không có ghi chú'}</p></li>)}</ol>:<p>Chưa có lịch sử xử lý.</p>}</section>
                </>}
            </div>
        </section>
    </div>;
}

