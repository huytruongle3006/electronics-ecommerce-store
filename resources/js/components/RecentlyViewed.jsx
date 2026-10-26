import React,{useEffect,useRef,useState} from 'react';
import {getProductDetail} from '../services/api';
const button={padding:'8px 11px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
export default function RecentlyViewed({recent,onViewDetail,onAddToCart,cartBusy}){
    const [confirm,setConfirm]=useState(false),[adding,setAdding]=useState(null),[error,setError]=useState(''),pending=useRef(false),live=useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
    const add=async product=>{if(pending.current||cartBusy)return;pending.current=true;setAdding(product.id);setError('');try{const {data}=await getProductDetail(product.id);if(!live.current)return;if(data.data.status!=='active'||data.data.quantity<1)throw Error('Sản phẩm vừa hết hàng hoặc ngừng bán.');if(await onAddToCart(data.data,1)===false)throw Error('Chưa thêm được sản phẩm, hãy kiểm tra giỏ hàng.');}catch(e){if(live.current){setError(e.response?'Không tải được sản phẩm hiện tại.':e.message);recent.reload();}}finally{pending.current=false;if(live.current)setAdding(null);}};
    if(!recent.count&&!recent.error)return null;
    return <section aria-label="Sản phẩm đã xem gần đây" style={{maxWidth:1240,margin:'28px auto',padding:'0 20px',boxSizing:'border-box'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><h2 style={{fontSize:21}}>Sản phẩm đã xem gần đây</h2><button type="button" style={button} onClick={()=>setConfirm(true)}>Xóa lịch sử đã xem</button></div>
        {confirm&&<div><p>Xóa lịch sử đã xem của tài khoản/khách hiện tại trên trình duyệt này?</p><button type="button" style={button} onClick={()=>{recent.clear();setConfirm(false);}}>Xác nhận xóa lịch sử</button>{' '}<button type="button" style={button} onClick={()=>setConfirm(false)}>Giữ lịch sử</button></div>}
        {(error||recent.error)&&<p role="alert" style={{color:'#b91c1c'}}>{error||recent.error} <button type="button" style={button} onClick={recent.reload}>Tải lại sản phẩm đã xem</button></p>}
        {recent.loading&&<p role="status">Đang cập nhật sản phẩm đã xem...</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>{recent.items.map(row=><article key={row.id} style={{background:'#fff',padding:16,border:'1px solid #e2e8f0',borderRadius:12,overflowWrap:'anywhere'}}>
            {row.product?<><button type="button" style={{...button,border:0,padding:0,textAlign:'left',fontWeight:700}} onClick={()=>onViewDetail(row.id)}>{row.product.tenSP}</button><p style={{color:'#dc2626',fontWeight:700}}>{Number(row.product.price).toLocaleString('vi-VN')} đ</p><p style={{fontSize:13,color:'#64748b'}}>{row.product.quantity>0?'Còn hàng':'Tạm hết hàng'} · Bảo hành {row.product.warranty_months||0} tháng</p><button type="button" style={button} disabled={!!adding||cartBusy||row.product.quantity<1} onClick={()=>add(row.product)}>{adding===row.id?'Đang thêm...':'Thêm vào giỏ'}</button></>:<p>Sản phẩm không còn hiển thị hoặc đã bị xóa.</p>}
            <button type="button" style={{...button,display:'block',marginTop:10,color:'#64748b'}} aria-label={`Bỏ sản phẩm đã xem ${row.id}`} onClick={()=>recent.remove(row.id)}>Bỏ khỏi đã xem</button>
        </article>)}</div>
    </section>;
}
