import React,{useEffect,useState} from 'react';
const empty=()=>({min_price:'',max_price:'',in_stock:false,min_warranty_months:''});
const button={padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#1d4ed8',cursor:'pointer'};
const field={display:'block',padding:10,border:'1px solid #cbd5e1',borderRadius:8,marginTop:5,maxWidth:'100%',boxSizing:'border-box'};
export default function ProductFilters({categories,selectedCategory,onSelectCategory,sortBy,onSelectSort,filters={},onApplyFilters,onReset}){
    const [draft,setDraft]=useState(()=>({...empty(),...Object.fromEntries(Object.keys(empty()).map(key=>[key,filters[key]??empty()[key]]))})),[error,setError]=useState('');
    useEffect(()=>{setDraft({min_price:filters.min_price??'',max_price:filters.max_price??'',in_stock:filters.in_stock??false,min_warranty_months:filters.min_warranty_months??''});setError('');},[filters.min_price,filters.max_price,filters.in_stock,filters.min_warranty_months]);
    const apply=next=>{
        for(const key of ['min_price','max_price'])if(next[key]!==''&&(!/^\d+(?:\.\d{1,2})?$/.test(String(next[key]))||Number(next[key])>9999999999999.99)){setError('Nhập giá không âm, tối đa 2 số thập phân.');return;}
        if(next.min_price!==''&&next.max_price!==''&&Number(next.min_price)>Number(next.max_price)){setError('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');return;}
        setError('');onApplyFilters(next);
    };
    return <section aria-label="Lọc sản phẩm nâng cao" style={{background:'#fff',padding:18,border:'1px solid #e2e8f0',borderRadius:12,display:'grid',gap:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:14,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><strong>Danh mục:</strong>{[{id:'ALL',tenLoai:'Tất cả'},...categories].map(c=><button type="button" key={c.id} aria-pressed={String(selectedCategory)===String(c.id)} style={{...button,background:String(selectedCategory)===String(c.id)?'#eff6ff':'#fff'}} onClick={()=>onSelectCategory(c.id)}>{c.tenLoai}</button>)}</div>
            <label>Sắp xếp<select aria-label="Sắp xếp sản phẩm" value={sortBy} onChange={e=>onSelectSort(e.target.value)} style={field}><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="warranty_desc">Bảo hành dài nhất</option><option value="name_asc">Tên A–Z</option></select></label>
        </div>
        <form aria-label="Bộ lọc giá và tồn kho" onSubmit={e=>{e.preventDefault();apply(draft);}}>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
                <label>Giá từ (đ)<input aria-label="Giá tối thiểu" type="number" min="0" max="9999999999999.99" step="0.01" placeholder="Không giới hạn" value={draft.min_price} onChange={e=>setDraft({...draft,min_price:e.target.value})} style={{...field,width:180}}/></label>
                <label>Giá đến (đ)<input aria-label="Giá tối đa" type="number" min="0" max="9999999999999.99" step="0.01" placeholder="Không giới hạn" value={draft.max_price} onChange={e=>setDraft({...draft,max_price:e.target.value})} style={{...field,width:180}}/></label>
                <label>Bảo hành tối thiểu<select aria-label="Bảo hành tối thiểu" value={draft.min_warranty_months} onChange={e=>setDraft({...draft,min_warranty_months:e.target.value})} style={field}><option value="">Tất cả</option>{[6,12,24,36].map(month=><option key={month} value={month}>{month} tháng</option>)}</select></label>
                <label style={{paddingBottom:10}}><input type="checkbox" checked={draft.in_stock} onChange={e=>setDraft({...draft,in_stock:e.target.checked})}/> Chỉ còn hàng</label>
                <button type="submit" style={{...button,background:'#2563eb',color:'#fff'}}>Áp dụng bộ lọc</button><button type="button" style={button} onClick={()=>{setDraft(empty());setError('');onReset();}}>Xóa tất cả bộ lọc</button>
            </div>
            {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
        </form>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span>Chọn nhanh:</span>{[['Đến 10 triệu','','10000000'],['10–20 triệu','10000000','20000000'],['20–30 triệu','20000000','30000000'],['Từ 30 triệu','30000000','']].map(([label,min_price,max_price])=><button key={label} type="button" style={button} onClick={()=>{const next={...draft,min_price,max_price};setDraft(next);apply(next);}}>{label}</button>)}</div>
        <small style={{color:'#64748b'}}>Lọc theo giá bán hiện tại. Mốc giá được tính bao gồm cả giá từ/đến. Bấm Áp dụng sau khi sửa giá, tồn kho hoặc thời hạn bảo hành.</small>
    </section>;
}
