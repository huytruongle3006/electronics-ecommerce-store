import {useEffect,useRef,useState} from 'react';
export const supportError=err=>({401:'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',403:'Bạn không có quyền truy cập yêu cầu hỗ trợ này.',404:'Không tìm thấy yêu cầu hỗ trợ thuộc quyền truy cập của bạn.',429:'Bạn gửi hơi nhanh. Vui lòng đợi một phút rồi thử lại.'}[err.response?.status]||Object.values(err.response?.data?.errors||{}).flat()[0]||err.response?.data?.message||'Chưa xác nhận được kết quả gửi. Dùng Gửi lại cùng yêu cầu để tránh gửi trùng.');
export default function useSupportMutation(key){
    const [pending,setPending]=useState(()=>{try{const value=JSON.parse(sessionStorage.getItem(key));return value&&typeof value.client_id==='string'&&typeof value.body==='string'?value:null;}catch{return null;}});
    const [busy,setBusy]=useState(false),[error,setError]=useState('');
    const attempt=useRef(pending),running=useRef(false),live=useRef(true);
    useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
    const send=async(data,operation)=>{
        if(running.current)return null;
        const payload=attempt.current||{...data,client_id:crypto.randomUUID()};
        try{sessionStorage.setItem(key,JSON.stringify(payload));}catch{setError('Trình duyệt không cho lưu mã gửi an toàn. Kiểm tra lịch sử trước khi thử lại và cho phép lưu dữ liệu phiên.');return null;}
        attempt.current=payload;setPending(payload);running.current=true;setBusy(true);setError('');
        try{
            const response=await operation(payload);
            if(!live.current)return null;
            try{sessionStorage.removeItem(key);}catch{}
            attempt.current=null;setPending(null);return response.data;
        }catch(err){
            if(live.current){setError(supportError(err));if([409,422].includes(err.response?.status)){try{sessionStorage.removeItem(key);}catch{}attempt.current=null;setPending(null);}}
            return null;
        }finally{running.current=false;if(live.current)setBusy(false);}
    };
    return {pending,busy,error,send,running};
}
