import React, {useEffect, useRef, useState} from 'react';
import {getCustomerVouchersApi, previewVoucherApi} from '../services/api';

const money = value => Number(value || 0).toLocaleString('vi-VN', {maximumFractionDigits: 2}) + ' đ';
const button = {padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:9,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
const failure = error => error.response?.data?.errors?.voucher_code?.[0] || error.response?.data?.message || 'Không tải được mã giảm giá. Vui lòng thử lại.';

export default function CustomerVouchers({code='', onCodeChange, quote, onQuoteChange, onBusyChange, disabled=false, cartSignature=''}) {
    const checkout = !!onQuoteChange;
    const [rows,setRows] = useState([]), [page,setPage] = useState(1), [lastPage,setLastPage] = useState(1);
    const [revision,setRevision] = useState(0), [loading,setLoading] = useState(false), [busy,setBusy] = useState(false);
    const [error,setError] = useState(''), [listError,setListError] = useState(''), [notice,setNotice] = useState('');
    const request = useRef(0), pending = useRef(null), live = useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;request.current++;pending.current?.abort();};},[]);
    useEffect(()=>{if(!quote)setNotice('');},[quote]);
    useEffect(()=>{
        const controller=new AbortController(); let active=true;
        setLoading(true);setListError('');
        getCustomerVouchersApi(page,controller.signal).then(({data})=>{
            if(!active)return;
            if(page>data.data.last_page){setPage(Math.max(1,data.data.last_page));return;}
            setRows(data.data.data);setLastPage(data.data.last_page);
        }).catch(error=>{if(active)setListError(failure(error));}).finally(()=>{if(active)setLoading(false);});
        return()=>{active=false;controller.abort();};
    },[page,revision,cartSignature]);
    const invalidate=()=>{request.current++;pending.current?.abort();setBusy(false);onBusyChange?.(false);onQuoteChange?.(null);setError('');setNotice('');};
    useEffect(()=>{if(checkout)invalidate();},[cartSignature]);
    const apply=async input=>{
        if(disabled||busy)return;
        const normalized=input.trim().toUpperCase();
        invalidate();onCodeChange(normalized);
        if(!normalized){setError('Vui lòng nhập mã giảm giá.');return;}
        const id=++request.current;pending.current=new AbortController();setBusy(true);onBusyChange?.(true);
        try {
            const {data}=await previewVoucherApi(normalized,pending.current.signal);
            if(live.current&&request.current===id){onQuoteChange(data.data);onCodeChange(data.data.voucher.code);setNotice('Đã áp dụng mã. Tổng tiền đã được cập nhật.');}
        } catch(error){if(live.current&&request.current===id){setError(failure(error));setRevision(v=>v+1);}}
        finally {if(live.current&&request.current===id){setBusy(false);onBusyChange?.(false);}}
    };
    const copy=async value=>{try{await navigator.clipboard.writeText(value);if(live.current)setNotice('Đã sao chép '+value+'. Nhập mã ở bước thanh toán.');}catch{if(live.current)setNotice('Mã của bạn: '+value+'. Bạn có thể chọn và sao chép mã trên thẻ.');}};
    return <section aria-label="Mã giảm giá cho khách hàng" style={{borderTop:'1px solid #e2e8f0',paddingTop:14}}>
        <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 10px'}}>Mã giảm giá</h3>
        <p style={{fontSize:13,color:'#64748b'}}>Mỗi đơn dùng một mã. Chỉ trừ lượt khi đặt hàng thành công; đơn đã hủy được hoàn lượt. Mã không được giữ chỗ khi xem trước.</p>
        {checkout&&<>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <input aria-label="Mã giảm giá" maxLength={20} value={code} disabled={disabled} placeholder="Nhập mã giảm giá" onChange={event=>{invalidate();onCodeChange(event.target.value.toUpperCase());}} style={{flex:1,minWidth:140,padding:10,border:'1px solid #cbd5e1',borderRadius:9}} />
                <button type="button" style={button} disabled={disabled||busy} onClick={()=>apply(code)}>{busy?'Đang kiểm tra mã...':'Áp dụng mã'}</button>
                {(quote||code)&&<button type="button" style={button} disabled={disabled} onClick={()=>{invalidate();onCodeChange('');}}>Bỏ mã</button>}
            </div>
            {code.trim()&&!quote&&!busy&&<p style={{color:'#b45309',fontSize:13}}>Nhấn Áp dụng mã để kiểm tra và xác nhận tổng tiền, hoặc Bỏ mã để đặt hàng không giảm giá.</p>}
        </>}
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
        {notice&&<p role="status" style={{color:'#15803d'}}>{notice}</p>}
        {quote&&<p style={{color:'#15803d'}}>Mã <strong>{quote.voucher.code}</strong>: giảm {money(quote.discount_amount)}.</p>}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:12}}><strong>Mã đang có</strong><button type="button" style={button} disabled={loading||disabled||busy} onClick={()=>setRevision(v=>v+1)}>Tải lại mã</button></div>
        {loading&&<p role="status">Đang tải mã giảm giá...</p>}
        {listError&&<p role="alert" style={{color:'#b91c1c'}}>{listError}</p>}
        {!loading&&!listError&&rows.length===0&&<p>Hiện chưa có mã còn hiệu lực.</p>}
        {!listError&&<div style={{display:'grid',gap:10,marginTop:12,opacity:loading?0.6:1}}>{rows.map(v=><article key={v.id} style={{border:'1px dashed #93c5fd',borderRadius:12,padding:12,background:'#f8fbff'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{color:'#1d4ed8',overflowWrap:'anywhere'}}>{v.code}</strong><strong>Giảm {Number(v.discount_percent)}%</strong></div>
            <p style={{fontSize:13,margin:'8px 0'}}>Đơn từ {money(v.min_order_amount)} · {Number(v.max_discount_amount)>0?'Giảm tối đa '+money(v.max_discount_amount):'Không giới hạn tiền giảm'}</p>
            <p style={{fontSize:13,margin:'8px 0'}}>Hạn: {v.expired_at?new Date(v.expired_at).toLocaleString('vi-VN'):'Không giới hạn'} · Còn {v.quantity} lượt toàn cửa hàng</p>
            <p style={{fontSize:13,margin:'8px 0'}}>Mỗi tài khoản {v.per_user_limit} lượt · Bạn còn {v.remaining_for_user} lượt</p>
            {!v.eligible&&<p style={{fontSize:13,color:'#b45309'}}>{v.reason}</p>}
            <button type="button" style={button} disabled={disabled||busy||loading||(checkout&&!v.eligible)} onClick={()=>checkout?apply(v.code):copy(v.code)}>{checkout?'Dùng mã '+v.code:'Sao chép '+v.code}</button>
        </article>)}</div>}
        {lastPage>1&&<div style={{display:'flex',gap:12,marginTop:12,alignItems:'center'}}><button type="button" style={button} disabled={page===1||loading||disabled||busy} onClick={()=>setPage(p=>p-1)}>Trang trước</button><span>{page}/{lastPage}</span><button type="button" style={button} disabled={page>=lastPage||loading||disabled||busy} onClick={()=>setPage(p=>p+1)}>Trang sau</button></div>}
    </section>;
}

export function CustomerVoucherModal({onClose,onOpenCart}) {
    const dialog=useRef(null);
    useEffect(()=>{const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();return()=>previous?.focus();},[]);
    const keyDown=event=>{
        if(event.key==='Escape'){event.stopPropagation();onClose();}
        if(event.key!=='Tab')return;
        const controls=[...dialog.current.querySelectorAll('button:not(:disabled)')];const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    return <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',zIndex:65,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <section ref={dialog} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-label="Mã giảm giá của cửa hàng" style={{width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',background:'#fff',padding:20,borderRadius:16,boxSizing:'border-box'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2>Mã giảm giá của cửa hàng</h2><button type="button" style={button} onClick={onClose} aria-label="Đóng mã giảm giá">Đóng</button></div>
            <CustomerVouchers />
            <button type="button" style={{...button,marginTop:16}} onClick={onOpenCart}>Xem giỏ hàng để thanh toán</button>
        </section>
    </div>;
}
