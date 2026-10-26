<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class RecentlyViewedController extends Controller
{
    public function index(Request $request)
    {
        $data=$request->validate(['ids'=>'present|array|max:12','ids.*'=>'integer|min:1|distinct']);
        $products=Product::whereIn('id',$data['ids'])->where('status','active')
            ->get(['id','maSP','tenSP','price','quantity','warranty_months','status','img_url'])->keyBy('id');
        return response()->json(['data'=>collect($data['ids'])->map(fn($id)=>['id'=>(int)$id,'product'=>$products->get($id)])->values()]);
    }
}
