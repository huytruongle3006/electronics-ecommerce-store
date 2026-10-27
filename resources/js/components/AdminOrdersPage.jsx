import React,{useEffect,useState} from 'react';
import {getAdminOrdersApi} from '../services/api';
import AdminOrderDetail,{statusLabels,money,stamp} from './AdminOrderDetail';
import OrderPrintButton from './OrderPrintButton';

const button={padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
export default function AdminOrdersPage({initialOrderId}){
    const [query,setQuery]=useState({status:'all',search:'',payment_status:'all',from:'',to:'',page:1});
    const [draft,setDraft]=useState({search:'',payment_status:'all',from:'',to:''});
    const [rows,setRows]=useState([]),[pagination,setPagination]=useState({current_page:1,last_page:1,total:0});
    const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState(initialOrderId||null);
    useEffect(()=>{
        const abort=new AbortController();let live=true;setLoading(true);setError('');
        getAdminOrdersApi(query.status,query.search,query.page,{payment_status:query.payment_status,from:query.from,to:query.to},abort.signal).then(({data})=>{
            if(!live)return;const p=data.data;
            if(query.page>p.last_page){setQuery(q=>({...q,page:Math.max(1,p.last_page)}));return;}
            setRows(p.data);setPagination({current_page:p.current_page,last_page:p.last_page,total:p.total});
        }).catch(err=>{if(live)setError(Object.values(err.response?.data?.errors||{}).flat()[0]||err.response?.data?.message||'Không tải được đơn hàng. Vui lòng thử lại.');}).finally(()=>{if(live)setLoading(false);});
        return()=>{live=false;abort.abort();};
    },[query,revision]);
    return <div style={{display:'grid',gap:18,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><h2 style={{margin:0}}>Quản lý đơn hàng</h2><p>{pagination.total} đơn theo bộ lọc hiện tại</p></div><button type="button" style={button} disabled={loading} onClick={()=>setRevision(v=>v+1)}>Làm mới đơn hàng</button></div>
        <form aria-label="Tìm và lọc đơn hàng" onSubmit={e=>{e.preventDefault();setQuery(q=>({...q,...draft,search:draft.search.trim(),page:1}));}} style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end',padding:14,borderRadius:12,background:'#fff'}}>
            <label>Tìm đơn<input aria-label="Tìm đơn hàng" maxLength={100} placeholder="Mã đơn, tên, SĐT, email, vận đơn" value={draft.search} onChange={e=>setDraft({...draft,search:e.target.value})} style={{display:'block',padding:9,border:'1px solid #cbd5e1',borderRadius:8,minWidth:230}}/></label>
            <label>Thanh toán<select aria-label="Lọc thanh toán" value={draft.payment_status} onChange={e=>setDraft({...draft,payment_status:e.target.value})} style={{display:'block',padding:9}}>{[['all','Tất cả'],['pending','Chưa thu tiền'],['paid','Đã thanh toán'],['refunded','Đã hoàn tiền'],['failed','Thất bại'],['missing','Chưa có bản ghi']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label>Từ ngày<input aria-label="Từ ngày đặt" type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})} style={{display:'block',padding:8}}/></label>
            <label>Đến ngày<input aria-label="Đến ngày đặt" type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})} style={{display:'block',padding:8}}/></label>
            <button type="submit" style={button}>Áp dụng bộ lọc</button><button type="button" style={button} onClick={()=>{const initial={search:'',payment_status:'all',from:'',to:''};setDraft(initial);setQuery({...initial,status:'all',page:1});}}>Xóa bộ lọc</button>
        </form>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{[['all','Tất cả'],...Object.entries(statusLabels)].map(([value,label])=><button key={value} type="button" style={{...button,background:query.status===value?'#1d4ed8':'#fff',color:query.status===value?'#fff':'#1d4ed8'}} aria-pressed={query.status===value} onClick={()=>setQuery(q=>({...q,status:value,page:1}))}>{label}</button>)}</div>
        {error&&<p role="alert" style={{color:'#b91c1c'}}>{error} <button type="button" style={button} onClick={()=>setRevision(v=>v+1)}>Thử tải lại đơn hàng</button></p>}
        <div style={{overflowX:'auto',background:'#fff',border:'1px solid #e2e8f0',borderRadius:12}}><table style={{borderCollapse:'collapse',width:'100%',minWidth:850,fontSize:14}}>
            <thead><tr>{['Mã đơn / ngày đặt','Khách nhận','Tổng tiền','Thanh toán','Trạng thái','Thao tác'].map(text=><th key={text} style={{padding:14,textAlign:'left',background:'#f8fafc'}}>{text}</th>)}</tr></thead>
            <tbody>{loading?<tr><td colSpan="6" style={{padding:32}} role="status">Đang tải đơn hàng...</td></tr>:error?null:rows.length===0?<tr><td colSpan="6" style={{padding:32}}>Không tìm thấy đơn phù hợp.</td></tr>:rows.map(o=><tr key={o.id} style={{borderTop:'1px solid #e2e8f0'}}>
                <td style={{padding:14}}><strong>{o.maDH}</strong><small style={{display:'block'}}>{stamp(o.created_at)}</small><small>{o.details?.length||0} dòng sản phẩm</small></td>
                <td style={{padding:14}}>{o.recipient_name}<small style={{display:'block'}}>{o.recipient_phone}</small></td>
                <td style={{padding:14,fontWeight:700,color:'#dc2626'}}>{money(o.final_amount)}</td>
                <td style={{padding:14}}>{o.payment?.payment_method?.toUpperCase()||'Chưa có'}<small style={{display:'block'}}>{{pending:'Chưa xác nhận thu tiền',paid:'Đã thanh toán',refunded:'Đã hoàn tiền',failed:'Thất bại'}[o.payment?.payment_status]||'Chưa có bản ghi'}</small></td>
                <td style={{padding:14}}>{statusLabels[o.status]||o.status}{o.tracking_number&&<small style={{display:'block'}}>Vận đơn: {o.tracking_number}</small>}</td>
                <td style={{padding:14}}><button type="button" style={button} aria-label={`Chi tiết đơn ${o.maDH}`} onClick={()=>setSelected(o.id)}>Chi tiết đơn</button><OrderPrintButton key={`print:${o.id}`} orderId={o.id} admin label="In phiếu"/></td>
            </tr>)}</tbody>
        </table></div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12}}><button type="button" style={button} disabled={loading||query.page<=1} onClick={()=>setQuery(q=>({...q,page:q.page-1}))}>Trang trước</button><span>Trang {pagination.current_page}/{pagination.last_page}</span><button type="button" style={button} disabled={loading||query.page>=pagination.last_page} onClick={()=>setQuery(q=>({...q,page:q.page+1}))}>Trang sau</button></div>
        {selected&&<AdminOrderDetail key={selected} orderId={selected} onClose={()=>setSelected(null)} onChanged={()=>setRevision(v=>v+1)}/>}
    </div>;
}
