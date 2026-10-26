import React, { useEffect, useRef, useState } from 'react';
import { getRebuyPreviewApi } from '../services/api';
const button={padding:'9px 13px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
const money=p=>Number(p).toLocaleString('vi-VN')+' đ';
const uuid=()=>crypto.randomUUID();
export default function RebuyPanel({orderId,userId,onRebuy,onOpenCart,cartBusy,onBusyChange}){
    const storageKey=`techstore_rebuy_pending_v1:${userId}:${orderId}`;
    const [attempt,setAttempt]=useState(()=>{try{const v=JSON.parse(sessionStorage.getItem(storageKey));return v&&typeof v.batch_id==='string'&&Array.isArray(v.items)&&v.items.length?v:null;}catch{return null;}});
    const [preview,setPreview]=useState(null),[chosen,setChosen]=useState({}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
    const live=useRef(true),pending=useRef(false);
    useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
    useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
    const inspect=async()=>{
        setLoading(true);setError('');setResult(null);
        try{const {data}=await getRebuyPreviewApi(orderId);if(!live.current)return;setPreview(data.data);setChosen(Object.fromEntries(data.data.lines.filter(l=>l.max_quantity>0).slice(0,100).map(l=>[l.product_id,l.suggested_quantity])));}
        catch(err){if(live.current)setError(err.response?.data?.message||'Không tải được giá và tồn kho hiện tại. Hãy thử lại.');}
        finally{if(live.current)setLoading(false);}
    };
    const submit=async()=>{
        if(pending.current||cartBusy)return;
        let request=attempt;
        if(!request){
            const items=preview.lines.filter(l=>Object.hasOwn(chosen,l.product_id)).map(l=>({product_id:l.product_id,quantity:Number(chosen[l.product_id]),price:String(l.price)}));
            if(!items.length){setError('Chọn ít nhất một sản phẩm còn hàng.');return;}
            if(items.some(i=>!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>preview.lines.find(l=>l.product_id===i.product_id).max_quantity)){setError('Vui lòng kiểm tra số lượng.');return;}
            request={batch_id:uuid(),items};
            try{sessionStorage.setItem(storageKey,JSON.stringify(request));}catch{setError('Trình duyệt không cho lưu mã yêu cầu. Hãy cho phép lưu dữ liệu phiên rồi thử lại để tránh thêm trùng khi mất mạng.');return;}
            setAttempt(request);
        }
        pending.current=true;setBusy(true);setError('');
        try{
            const data=await onRebuy(orderId,request);
            if(data?.success){sessionStorage.removeItem(storageKey);if(live.current){setAttempt(null);setPreview(null);setResult(data);}}
            else if(live.current){
                const status=data?.status||0;
                if(status>=400&&status<500){sessionStorage.removeItem(storageKey);setAttempt(null);setPreview(null);}
                setError(data?.message||'Chưa xác nhận được lần thêm vào giỏ. Gửi lại cùng yêu cầu để kiểm tra, không cộng trùng.');
            }
        }catch{if(live.current)setError('Chưa xác nhận được kết quả. Gửi lại cùng yêu cầu để tránh cộng trùng.');}
        finally{pending.current=false;if(live.current)setBusy(false);}
    };
    return <section aria-label="Mua lại đơn hàng" style={{padding:16,border:'1px solid #bfdbfe',borderRadius:10,marginBottom:20,background:'#f8fbff'}}>
        <strong>Mua lại từ đơn này</strong><p style={{fontSize:13,color:'#64748b'}}>Chọn hàng để thêm vào giỏ theo giá hiện tại. Không áp dụng lại voucher, thanh toán hoặc địa chỉ của đơn cũ; chưa tạo đơn mới.</p>
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
        {attempt?<><p>Có lần thêm vào giỏ chưa xác nhận kết quả. Gửi lại cùng mã yêu cầu để kiểm tra và tránh cộng trùng.</p><button type="button" style={button} disabled={busy||cartBusy} onClick={submit}>{busy?'Đang xử lý...':'Gửi lại cùng yêu cầu'}</button></>:<>
            {!preview&&<button type="button" style={button} disabled={loading||cartBusy} onClick={inspect}>{loading?'Đang kiểm tra...':'Mua lại'}</button>}
            {preview&&<div>
                {preview.lines.length>100&&<p>Chỉ chọn tối đa 100 loại sản phẩm mỗi lần.</p>}
                {preview.lines.map(line=><div key={line.product_id} style={{padding:'12px 0',borderBottom:'1px solid #e2e8f0'}}>
                    <label style={{display:'flex',gap:8}}><input type="checkbox" aria-label={`Chọn mua lại ${line.name}`} disabled={!line.max_quantity||busy} checked={Object.hasOwn(chosen,line.product_id)} onChange={e=>setChosen(prev=>{const next={...prev};if(e.target.checked){if(Object.keys(next).length>=100){setError('Chỉ chọn tối đa 100 loại sản phẩm.');return prev;}next[line.product_id]=line.suggested_quantity;}else delete next[line.product_id];return next;})}/><strong>{line.name}</strong></label>
                    <p style={{margin:'6px 0',fontSize:13}}>Đơn cũ: {line.original_quantity} sản phẩm{line.old_price!==null&&` · ${money(line.old_price)}/sản phẩm`}. {line.price!==null&&`Giá hiện tại: ${money(line.price)}.`}</p>
                    {line.reason&&<p style={{margin:'6px 0',color:'#b45309',fontSize:13}}>{line.reason}</p>}
                    {Object.hasOwn(chosen,line.product_id)&&<label>Số lượng thêm <input aria-label={`Số lượng mua lại ${line.name}`} type="number" min={1} max={line.max_quantity} value={chosen[line.product_id]} onChange={e=>setChosen(prev=>({...prev,[line.product_id]:e.target.value}))} style={{width:80,padding:7,border:'1px solid #cbd5e1',borderRadius:6}}/> <small>Đã có {line.cart_quantity} trong giỏ · Thêm tối đa {line.max_quantity}</small></label>}
                </div>)}
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" style={{...button,background:'#2563eb',color:'#fff'}} disabled={busy||cartBusy||!Object.keys(chosen).length} onClick={submit}>Xác nhận thêm vào giỏ</button><button type="button" style={button} disabled={busy} onClick={()=>setPreview(null)}>Để sau</button><button type="button" style={button} disabled={busy||loading} onClick={inspect}>Kiểm tra lại giá/tồn kho</button></div>
            </div>}
        </>}
        {result&&<div role="status"><p style={{color:'#15803d'}}>{result.message}</p><ul>{result.rebuy.added.map(i=><li key={i.product_id}>{i.name} × {i.quantity} · {money(i.price)}/sản phẩm</li>)}</ul><button type="button" style={button} onClick={onOpenCart}>Xem giỏ hàng</button></div>}
    </section>;
}
