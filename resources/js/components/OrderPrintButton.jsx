import React, {useEffect,useRef,useState} from 'react';
import {getOrderPrintApi} from '../services/api';

export default function OrderPrintButton({orderId,admin=false,disabled=false,label='In phiếu / Lưu PDF'}) {
    const [busy,setBusy]=useState(false),[error,setError]=useState('');
    const pending=useRef(null),live=useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;pending.current?.controller.abort();try{pending.current?.tab.close();}catch{}pending.current=null;};},[]);
    const open=async()=>{
        if(pending.current||disabled)return;
        // Create the tab during the click so the browser does not block an async popup.
        let tab;
        try{tab=window.open('about:blank','_blank');}catch{}
        if(!tab){setError('Trình duyệt đang chặn cửa sổ in. Cho phép cửa sổ bật lên cho website rồi bấm lại.');return;}
        const request={tab,controller:new AbortController()};pending.current=request;setBusy(true);setError('');
        try {
            tab.opener=null;
            tab.document.title='Đang tải phiếu đơn hàng';tab.document.body.textContent='Đang tải phiếu đơn hàng...';
            const {data}=await getOrderPrintApi(orderId,admin,request.controller.signal);
            if(!live.current||pending.current!==request)return;
            if(tab.closed)throw Error('Cửa sổ in đã đóng. Bấm lại để mở phiếu mới.');
            if(!(data instanceof Blob)||!data.type.toLowerCase().startsWith('text/html'))throw Error('Không tải được phiếu hợp lệ. Vui lòng thử lại.');
            const url=URL.createObjectURL(data);let timer;
            const revoke=()=>{clearTimeout(timer);URL.revokeObjectURL(url);};
            // Loaded pages no longer need the object URL; the page has no external assets.
            timer=setTimeout(revoke,60000);tab.addEventListener('load',revoke,{once:true});
            try{tab.location.replace(url);}catch(err){revoke();throw err;}
            pending.current=null;
        } catch(err) {
            try{tab.close();}catch{}
            if(live.current&&pending.current===request){
                const status=err.response?.status;
                setError(status===401?'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.':status===403?'Bạn không có quyền in phiếu này.':status===404?'Không tìm thấy đơn hàng thuộc quyền truy cập của bạn.':err.response?'Không tải được phiếu. Vui lòng thử lại.':err.message||'Không tải được phiếu. Vui lòng thử lại.');
            }
        } finally {
            if(pending.current===request)pending.current=null;
            if(live.current)setBusy(false);
        }
    };
    return <div style={{margin:'12px 0'}}>
        <button type="button" disabled={busy||disabled} onClick={open} style={{padding:'10px 14px',border:'1px solid #93c5fd',borderRadius:8,color:'#1d4ed8',background:'#eff6ff',cursor:'pointer',fontWeight:600}}>{busy?'Đang tải phiếu...':label}</button>
        {error&&<p role="alert" style={{color:'#b91c1c',fontSize:13}}>{error}</p>}
    </div>;
}
