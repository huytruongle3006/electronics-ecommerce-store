<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Order,SupportThread,SupportMessage,User};
use App\Services\StoreNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportController extends Controller
{
    private function admin(Request $r): bool {return $r->routeIs('admin.support.*');}
    private function scope(Request $r){$q=SupportThread::query();return $this->admin($r)?$q:$q->where('user_id',$r->user()->id);}
    private function unread(SupportThread $t, bool $admin): int
    {
        return $t->messages()->where('sender_role',$admin?'customer':'admin')->where('id','>',$admin?$t->admin_read_id:$t->customer_read_id)->count();
    }
    private function thread(SupportThread $t, bool $admin): array
    {
        $t->loadMissing(['customer:id,full_name,email','order:id,maDH,user_id']);
        $data=['id'=>$t->id,'subject'=>$t->subject,'status'=>$t->status,'version'=>$t->version,
            'order_id'=>$t->order_id,'order_code'=>$t->order&&$t->order->user_id===$t->user_id?$t->order->maDH:null,
            'created_at'=>$t->created_at,'updated_at'=>$t->updated_at,'last_message_at'=>$t->last_message_at,'unread_count'=>$this->unread($t,$admin)];
        if($admin)$data['customer']=['id'=>$t->user_id,'name'=>$t->customer?->full_name??'Tài khoản đã gỡ','email'=>$t->customer?->email];
        return $data;
    }
    private function message(SupportMessage $m): array
    {
        return ['id'=>$m->id,'thread_id'=>$m->thread_id,'sender_role'=>$m->sender_role,
            'sender_name'=>$m->sender_role==='admin'?'Nhân viên cửa hàng':($m->sender?->full_name??'Khách hàng'),
            'body'=>$m->body,'created_at'=>$m->created_at];
    }
    public function index(Request $r)
    {
        $data=$r->validate(['status'=>'nullable|in:all,open,in_progress,resolved','search'=>'nullable|string|max:100','page'=>'nullable|integer|min:1|max:1000000']);
        $q=$this->scope($r)->with(['customer:id,full_name,email','order:id,maDH,user_id']);
        if(!empty($data['status'])&&$data['status']!=='all')$q->where('status',$data['status']);
        $search=trim($data['search']??'');
        if($search!=='')$q->where(function($q)use($search,$r){
            $q->where('subject','like','%'.$search.'%')->orWhereHas('order',fn($o)=>$o->where('maDH','like','%'.$search.'%'));
            if($this->admin($r))$q->orWhereHas('customer',fn($u)=>$u->where('full_name','like','%'.$search.'%')->orWhere('email','like','%'.$search.'%'));
        });
        $rows=$q->orderByDesc('updated_at')->orderByDesc('id')->paginate(12);
        $rows->getCollection()->transform(fn($t)=>$this->thread($t,$this->admin($r)));
        return response()->json(['data'=>$rows]);
    }
    public function store(Request $r)
    {
        $data=$r->validate(['subject'=>'required|string|max:160|regex:/\S/u','body'=>'required|string|max:4000|regex:/\S/u','order_id'=>'nullable|integer|min:1','client_id'=>'required|uuid']);
        $data['subject']=trim($data['subject']);$data['body']=trim($data['body']);$orderId=isset($data['order_id'])?(int)$data['order_id']:null;
        $hash=hash('sha256',json_encode([$data['subject'],$data['body'],$orderId],JSON_THROW_ON_ERROR));
        return DB::transaction(function()use($r,$data,$orderId,$hash){
            User::whereKey($r->user()->id)->lockForUpdate()->firstOrFail();
            $old=SupportThread::where('user_id',$r->user()->id)->where('client_id',$data['client_id'])->first();
            if($old){abort_unless(hash_equals($old->fingerprint,$hash),409,'Mã gửi đã được dùng cho nội dung khác.');return response()->json(['data'=>$this->thread($old,false),'replayed'=>true]);}
            if($orderId)abort_unless(Order::where('user_id',$r->user()->id)->whereKey($orderId)->exists(),422,'Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.');
            $t=SupportThread::create(['user_id'=>$r->user()->id,'order_id'=>$orderId,'subject'=>$data['subject'],'client_id'=>$data['client_id'],'fingerprint'=>$hash,'status'=>'open','version'=>1,'last_message_at'=>now()]);
            $m=SupportMessage::create(['thread_id'=>$t->id,'sender_id'=>$r->user()->id,'sender_role'=>'customer','body'=>$data['body'],'client_id'=>$data['client_id'],'fingerprint'=>hash('sha256','customer:'.$data['body']),'created_at'=>now()]);
            StoreNotifier::supportMessage($t,$m);
            return response()->json(['data'=>$this->thread($t,false),'replayed'=>false],201);
        },3);
    }
    public function show(Request $r,int $id)
    {
        $data=$r->validate(['before_id'=>'nullable|integer|min:1','after_id'=>'nullable|integer|min:0']);
        abort_if(isset($data['before_id'],$data['after_id']),422,'Chỉ dùng một chiều tải tin nhắn.');
        $t=$this->scope($r)->findOrFail($id);$q=$t->messages()->with('sender:id,full_name');
        if(isset($data['before_id']))$q->where('id','<',$data['before_id']);
        if(isset($data['after_id']))$q->where('id','>',$data['after_id']);
        $rows=isset($data['after_id'])?$q->orderBy('id')->limit(30)->get():$q->orderByDesc('id')->limit(30)->get()->reverse()->values();
        $first=$rows->first()?->id;$last=$rows->last()?->id;
        return response()->json(['thread'=>$this->thread($t,$this->admin($r)),'messages'=>$rows->map(fn($m)=>$this->message($m)),
            'has_more_before'=>$first?$t->messages()->where('id','<',$first)->exists():false,
            'has_more_after'=>$last?$t->messages()->where('id','>',$last)->exists():false]);
    }
    public function send(Request $r,int $id)
    {
        $data=$r->validate(['body'=>'required|string|max:4000|regex:/\S/u','client_id'=>'required|uuid']);$data['body']=trim($data['body']);
        $role=$this->admin($r)?'admin':'customer';$hash=hash('sha256',$role.':'.$data['body']);
        return DB::transaction(function()use($r,$id,$data,$role,$hash){
            $t=$this->scope($r)->whereKey($id)->lockForUpdate()->firstOrFail();
            $old=$t->messages()->where('sender_id',$r->user()->id)->where('client_id',$data['client_id'])->first();
            if($old){abort_unless(hash_equals($old->fingerprint,$hash),409,'Mã gửi đã được dùng cho nội dung khác.');return response()->json(['message'=>$this->message($old),'replayed'=>true]);}
            $m=SupportMessage::create(['thread_id'=>$t->id,'sender_id'=>$r->user()->id,'sender_role'=>$role,'body'=>$data['body'],'client_id'=>$data['client_id'],'fingerprint'=>$hash,'created_at'=>now()]);
            $status=$role==='admin'?'in_progress':($t->status==='resolved'?'open':$t->status);
            $t->update(['status'=>$status,'version'=>$t->version+1,'last_message_at'=>now(),'updated_at'=>now()]);
            StoreNotifier::supportMessage($t,$m);
            return response()->json(['message'=>$this->message($m),'replayed'=>false],201);
        },3);
    }
    public function read(Request $r,int $id)
    {
        $data=$r->validate(['through_id'=>'required|integer|min:0']);
        return DB::transaction(function()use($r,$id,$data){
            $t=$this->scope($r)->whereKey($id)->lockForUpdate()->firstOrFail();$admin=$this->admin($r);$field=$admin?'admin_read_id':'customer_read_id';
            $last=$t->messages()->where('id','<=',$data['through_id'])->max('id')??0;
            // Reading does not move a thread to the top of the inbox or change its revision.
            if($last>$t->$field){$t->$field=$last;$t->timestamps=false;$t->save();}
            return response()->json(['success'=>true,'unread_count'=>$this->unread($t,$admin)]);
        },3);
    }
    public function status(Request $r,int $id)
    {
        $data=$r->validate(['status'=>'required|in:open,in_progress,resolved','expected_version'=>'required|integer|min:1']);
        return DB::transaction(function()use($r,$id,$data){
            $t=SupportThread::whereKey($id)->lockForUpdate()->firstOrFail();
            if($t->status!==$data['status']){
                abort_unless($t->version===(int)$data['expected_version'],409,'Hội thoại vừa thay đổi. Hãy tải lại trước khi cập nhật trạng thái.');
                $t->update(['status'=>$data['status'],'version'=>$t->version+1]);StoreNotifier::supportStatus($t);
            }
            return response()->json(['data'=>$this->thread($t,true)]);
        },3);
    }
}
