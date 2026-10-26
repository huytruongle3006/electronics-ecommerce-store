<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderRebuyController extends Controller
{
    private function originalLines(Order $order)
    {
        return $order->details()->get()->groupBy('product_id')->map(function ($lines, $id) {
            $prices = $lines->pluck('price')->unique();
            return ['product_id'=>(int)$id, 'original_quantity'=>(int)$lines->sum('quantity'), 'old_price'=>$prices->count()===1 ? (string)$prices->first() : null];
        });
    }

    public function preview(Request $request, int $id)
    {
        $order = Order::where('user_id',$request->user()->id)->findOrFail($id);
        $lines = $this->originalLines($order);
        $products = Product::whereIn('id',$lines->keys())->get()->keyBy('id');
        $cart = Cart::where('user_id',$request->user()->id)->first();
        $cartItems = $cart ? CartItem::where('cart_id',$cart->id)->get()->keyBy('product_id') : collect();
        $result = $lines->map(function($line) use($products,$cartItems) {
            $p = $products->get($line['product_id']);
            $inCart = (int)($cartItems->get($line['product_id'])?->quantity ?? 0);
            $available = $p && $p->status==='active' ? max(0,min(999,$p->quantity)-$inCart) : 0;
            $maximum = min(max(0,$line['original_quantity']),$available,999);
            $reason = !$p ? 'Sản phẩm đã bị xóa.' : ($p->status!=='active' ? 'Sản phẩm đã ngừng bán.' : ($p->quantity<=0 ? 'Sản phẩm tạm hết hàng.' : ($maximum===0 ? 'Giỏ hàng đã đạt số lượng có thể mua.' : ($maximum<$line['original_quantity'] ? 'Không đủ số lượng cũ; đã đề xuất số lượng còn có thể thêm.' : null))));
            return array_merge($line,['name'=>$p?->tenSP ?? 'Sản phẩm không còn tồn tại','price'=>$p ? (string)$p->price : null,
                'cart_quantity'=>$inCart,'max_quantity'=>$maximum,'suggested_quantity'=>$maximum,'reason'=>$reason]);
        })->values();
        return response()->json(['data'=>['order_id'=>$order->id,'order_code'=>$order->maDH,'lines'=>$result]]);
    }

    private function money(string $value): string
    {
        $parts = explode('.',$value,2);
        return (ltrim($parts[0],'0') ?: '0').'.'.str_pad($parts[1] ?? '',2,'0');
    }

    public function store(Request $request, int $id)
    {
        $data=$request->validate(['batch_id'=>'required|uuid','items'=>'required|array|min:1|max:100',
            'items.*.product_id'=>'required|integer|min:1|distinct','items.*.quantity'=>'required|integer|between:1,999',
            'items.*.price'=>['required','string','regex:/^\d{1,13}(\.\d{1,2})?$/']]);
        $lines=collect($data['items'])->map(fn($i)=>['product_id'=>(int)$i['product_id'],'quantity'=>(int)$i['quantity'],'price'=>$this->money($i['price'])])->sortBy('product_id')->values()->all();
        $fingerprint=hash('sha256',json_encode(['order_id'=>$id,'items'=>$lines]));
        return DB::transaction(function()use($request,$id,$data,$lines,$fingerprint){
            $owner=$request->user()->id;
            DB::table('users')->where('id',$owner)->lockForUpdate()->first();
            $order=Order::where('user_id',$owner)->whereKey($id)->lockForUpdate()->firstOrFail();
            $receipt=DB::table('order_rebuy_batches')->where('user_id',$owner)->where('batch_id',$data['batch_id'])->first();
            $cart=Cart::firstOrCreate(['user_id'=>$owner]);
            if($receipt){
                abort_unless(hash_equals($receipt->fingerprint,$fingerprint),409,'Mã yêu cầu đã dùng cho nội dung khác. Hãy kiểm tra lại giỏ hàng.');
                $result=json_decode($receipt->result,true);
            }else{
                $original=$this->originalLines($order);$added=[];
                foreach($lines as $line){
                    abort_unless($original->has($line['product_id']) && $line['quantity']<=$original[$line['product_id']]['original_quantity'],422,'Sản phẩm hoặc số lượng không thuộc nội dung đơn cũ.');
                    $product=Product::whereKey($line['product_id'])->lockForUpdate()->first();
                    abort_unless($product && $product->status==='active',409,'Một sản phẩm đã bị xóa hoặc ngừng bán. Vui lòng kiểm tra lại.');
                    abort_unless($this->money((string)$product->price)===$line['price'],409,'Giá sản phẩm vừa thay đổi. Vui lòng tải lại để xác nhận giá mới.');
                    $item=CartItem::where('cart_id',$cart->id)->where('product_id',$product->id)->first();
                    $total=(int)($item?->quantity ?? 0)+$line['quantity'];
                    abort_if($total>min(999,$product->quantity),409,'Tồn kho hoặc giỏ hàng vừa thay đổi. Vui lòng kiểm tra lại số lượng.');
                    if($item)$item->update(['quantity'=>$total]);
                    else CartItem::create(['cart_id'=>$cart->id,'product_id'=>$product->id,'quantity'=>$line['quantity']]);
                    $added[]=['product_id'=>$product->id,'name'=>$product->tenSP,'quantity'=>$line['quantity'],'price'=>(string)$product->price];
                }
                $result=['added'=>$added];
                DB::table('order_rebuy_batches')->insert(['user_id'=>$owner,'order_id'=>$id,'batch_id'=>$data['batch_id'],'fingerprint'=>$fingerprint,'result'=>json_encode($result,JSON_UNESCAPED_UNICODE),'created_at'=>now()]);
            }
            return response()->json(['success'=>true,'message'=>$receipt ? 'Yêu cầu này đã được thêm trước đó; không cộng lần nữa.' : 'Đã thêm vào giỏ theo giá hiện tại. Hãy kiểm tra giỏ trước khi đặt hàng.',
                'rebuy'=>$result,'replayed'=>(bool)$receipt,'items'=>CartItem::with('product')->where('cart_id',$cart->id)->get()]);
        },3);
    }
}
