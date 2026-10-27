import {useCallback,useEffect,useState} from 'react';
import {getProducts} from '../services/api';

const initial=()=>({search:'',category_id:'ALL',sort:'newest',min_price:'',max_price:'',in_stock:false,min_warranty_months:'',page:1});
export default function useProductCatalog(){
    const [query,setQuery]=useState(initial),[revision,setRevision]=useState(0);
    const [state,setState]=useState({items:[],loading:true,error:'',current_page:1,last_page:1,total:0});
    useEffect(()=>{
        let live=true;const controller=new AbortController();setState(previous=>({...previous,loading:true,error:''}));
        const timer=setTimeout(()=>{
            const params={page:query.page,limit:12,sort:query.sort};
            if(query.search.trim())params.search=query.search.trim();
            if(query.category_id!=='ALL')params.category_id=query.category_id;
            for(const key of ['min_price','max_price','min_warranty_months'])if(query[key]!=='')params[key]=query[key];
            if(query.in_stock)params.in_stock=1;
            getProducts(params,controller.signal).then(({data})=>{
                if(!live)return;const p=data.data;
                if(!p||!Array.isArray(p.data))throw Error('Không đọc được danh sách sản phẩm. Vui lòng tải lại.');
                if(query.page>p.last_page){setQuery(previous=>({...previous,page:Math.max(1,p.last_page)}));return;}
                setState({items:p.data,loading:false,error:'',current_page:p.current_page,last_page:p.last_page,total:p.total});
            }).catch(err=>{if(live)setState(previous=>({...previous,items:[],loading:false,error:Object.values(err.response?.data?.errors||{}).flat()[0]||err.response?.data?.message||'Không tải được sản phẩm. Vui lòng thử lại.'}));});
        },250);
        return()=>{live=false;clearTimeout(timer);controller.abort();};
    },[query,revision]);
    const update=useCallback(fields=>setQuery(previous=>({...previous,...fields,page:1})),[]);
    const reset=useCallback(()=>setQuery(initial()),[]);
    const reload=useCallback(()=>setRevision(value=>value+1),[]);
    const goToPage=page=>{if(!state.loading&&page>=1&&page<=state.last_page)setQuery(previous=>({...previous,page}));};
    return {...state,query,update,reset,reload,goToPage};
}
