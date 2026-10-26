import {useCallback,useEffect,useRef,useState} from 'react';
import {getRecentlyViewedApi} from '../services/api';
export const recentKey=owner=>`techstore_recent_views_v1:${owner??'guest'}`;
export function readRecent(key){
    try{const value=JSON.parse(localStorage.getItem(key));if(value?.version!==1||!Array.isArray(value.items))return [];const seen=new Set();return value.items.filter(i=>{if(!Number.isInteger(i.id)||i.id<1||!Number.isFinite(i.viewed_at)||i.viewed_at<=0||seen.has(i.id))return false;seen.add(i.id);return true;}).sort((a,b)=>b.viewed_at-a.viewed_at).slice(0,12).map(({id,viewed_at})=>({id,viewed_at}));}catch{return [];}
}
export default function useRecentlyViewed(user){
    const key=recentKey(user?.id),[snapshot,setSnapshot]=useState(()=>({key,records:readRecent(key)}));
    const records=snapshot.key===key?snapshot.records:readRecent(key),recordsRef=useRef(records);recordsRef.current=records;
    const [state,setState]=useState({key,items:[],loading:false,error:''}),[storageError,setStorageError]=useState(''),[revision,setRevision]=useState(0);
    const signature=records.map(r=>`${r.id}:${r.viewed_at}`).join(',');
    useEffect(()=>{setStorageError('');setSnapshot({key,records:readRecent(key)});const sync=e=>{if(e.key===key||e.key===null)setSnapshot({key,records:readRecent(key)});};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[key]);
    useEffect(()=>{
        let active=true;const controller=new AbortController();
        if(!records.length){setState({key,items:[],loading:false,error:''});return()=>controller.abort();}
        setState(prev=>({...prev,key,items:prev.key===key?prev.items:[],loading:true,error:''}));
        getRecentlyViewedApi(records.map(r=>r.id),controller.signal).then(({data})=>{if(active)setState({key,items:data.data,loading:false,error:''});}).catch(()=>{if(active)setState(prev=>({...prev,loading:false,error:'Không tải được giá hiện tại của sản phẩm đã xem.'}));});
        return()=>{active=false;controller.abort();};
    },[key,signature,revision]);
    const persist=useCallback(next=>{recordsRef.current=next;setSnapshot({key,records:next});try{if(next.length)localStorage.setItem(key,JSON.stringify({version:1,items:next}));else localStorage.removeItem(key);setStorageError('');}catch{setStorageError('Trình duyệt không cho lưu/xóa lịch sử. Thay đổi hiện tại có thể không giữ được khi tải lại trang.');}},[key]);
    const record=useCallback(product=>{if(!Number.isInteger(product?.id)||product.status!=='active')return;persist([{id:product.id,viewed_at:Date.now()},...recordsRef.current.filter(i=>i.id!==product.id)].slice(0,12));},[persist]);
    return {items:state.key===key?state.items:[],loading:state.key===key&&state.loading,error:storageError||(state.key===key?state.error:''),count:records.length,record,
        remove:id=>persist(recordsRef.current.filter(i=>i.id!==id)),clear:()=>persist([]),reload:()=>setRevision(v=>v+1)};
}
