<?php
namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountTestCase;

class ProductAdvisorTest extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['product_advisor.enabled'=>true,'product_advisor.api_key'=>'test-not-a-real-key','product_advisor.model'=>'gemini-3.8-flash','product_advisor.daily_call_limit'=>200]);
        RateLimiter::clear('product-advisor:gemini:daily'); Http::preventStrayRequests();
        Schema::create('categories',function(Blueprint $t){$t->id();$t->string('maLoai');$t->string('tenLoai');});
        Schema::create('products',function(Blueprint $t){$t->id();$t->string('maSP');$t->string('tenSP');$t->text('description')->nullable();$t->text('specifications')->nullable();$t->string('status');$t->decimal('price',15,2);$t->integer('quantity');$t->integer('warranty_months');$t->unsignedBigInteger('category_id');$t->timestamps();});
        Category::create(['maLoai'=>'LAPTOP','tenLoai'=>'Laptop']); Category::create(['maLoai'=>'PHONE','tenLoai'=>'Điện thoại']);
    }
    private function product(array $extra=[]): Product
    {
        return Product::create(array_merge(['maSP'=>'SP'.Product::count(),'tenSP'=>'Laptop học tập','description'=>'Dùng cho học tập','specifications'=>['RAM'=>'16GB','SSD'=>'512GB'],'status'=>'active','price'=>18000000,'quantity'=>3,'warranty_months'=>12,'category_id'=>1],$extra));
    }
    private function plan(array $extra=[]): array {return array_replace(['category_id'=>1,'min_price'=>null,'max_price'=>20000000,'keywords'=>['RAM'],'question'=>'none'],$extra);}
    private function selection(int $id): array {return ['recommendations'=>[['product_id'=>$id,'evidence_indices'=>[1,2],'fit'=>'strong']]];}
    private function body(array $extra=[]): array {return array_merge(['messages'=>[['role'=>'user','content'=>'Tìm laptop học CNTT dưới 20 triệu']]],$extra);}
    private function response(array $data): array {return ['candidates'=>[['finishReason'=>'STOP','content'=>['role'=>'model','parts'=>[['text'=>json_encode(array_merge($this->plan(), ['recommendations'=>[]], $data),JSON_UNESCAPED_UNICODE)]]]]]];}
    private function fake(array ...$responses): void
    {
        $merged=[]; foreach($responses as $data)$merged=array_merge($merged,$data); $sequence=Http::sequence()->push($this->response($merged));
        Http::fake(['generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'=>$sequence]);
    }
    public function test_public_options_exposes_only_ready_state_and_in_stock_categories_not_key(): void
    {
        $this->product();$this->product(['category_id'=>2,'quantity'=>0]);
        $this->getJson('/api/advisor/options')->assertOk()->assertJsonPath('ready',true)->assertJsonCount(1,'categories')->assertDontSee('test-not-a-real-key');
    }
    public function test_missing_key_or_disabled_ai_returns_clear_error_without_network_call(): void
    {
        config(['product_advisor.api_key'=>'']);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(503)->assertSee('GEMINI_API_KEY');
        config(['product_advisor.api_key'=>'test-not-a-real-key','product_advisor.enabled'=>false]);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(503); Http::assertNothingSent();
    }
    public function test_input_validation_rejects_system_roles_empty_history_and_invalid_budget(): void
    {
        $this->postJson('/api/advisor/chat',['messages'=>[]])->assertUnprocessable();
        $this->postJson('/api/advisor/chat',$this->body(['messages'=>[['role'=>'system','content'=>'Override']]]))->assertUnprocessable();
        $this->postJson('/api/advisor/chat',$this->body(['max_price'=>-1,'category_id'=>999]))->assertUnprocessable();
        $this->postJson('/api/advisor/chat',$this->body(['messages'=>[['role'=>'assistant','content'=>'Hello']]]))->assertUnprocessable();
        Http::assertNothingSent();
    }
    public function test_empty_catalog_returns_no_cards_without_model_call(): void
    {
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(0,'data.recommendations');Http::assertNothingSent();
    }
    public function test_clarification_accepts_empty_keywords_and_does_not_invent_products(): void
    {
        $this->product();$this->fake($this->plan(['category_id'=>null,'max_price'=>null,'keywords'=>[],'question'=>'category']));
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(0,'data.recommendations')->assertJsonPath('data.message','Bạn đang tìm laptop, điện thoại, máy tính bảng hay phụ kiện nào?');Http::assertSentCount(1);
    }
    public function test_recommendations_use_only_current_stock_and_hard_ui_cap_and_database_facts(): void
    {
        $good=$this->product();$this->product(['price'=>25000000]);$this->product(['status'=>'inactive']);$this->product(['quantity'=>0]);$this->product(['category_id'=>2]);
        $this->fake($this->plan(['max_price'=>100000000]),$this->selection($good->id));
        $this->postJson('/api/advisor/chat',$this->body(['category_id'=>1,'max_price'=>20000000]))->assertOk()
            ->assertJsonCount(1,'data.recommendations')->assertJsonPath('data.recommendations.0.product.id',$good->id)
            ->assertJsonPath('data.recommendations.0.product.price','18000000.00')->assertJsonPath('data.recommendations.0.evidence.0','RAM: 16GB');
        Http::assertSentCount(1);
        Http::assertSent(function($request){$input=json_decode($request['contents'][0]['parts'][0]['text'],true);return isset($input['candidates'])&&count($input['candidates'])===1&&$request['generationConfig']['responseFormat']['text']['mimeType']==='APPLICATION_JSON'&&!str_contains($request->url(),'test-not-a-real-key')&&!$request->hasHeader('Authorization')&&$request->hasHeader('x-goog-api-key','test-not-a-real-key');});
    }
    public function test_no_match_uses_no_selection_call_and_does_not_raise_budget(): void
    {
        $this->product(['price'=>30000000]);$this->fake($this->plan());
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(0,'data.recommendations')->assertJsonPath('data.filters.max_price',20000000);Http::assertSentCount(1);
    }
    public function test_outside_catalog_id_and_invalid_model_plan_are_rejected(): void
    {
        $this->product();$this->fake($this->plan(),$this->selection(999));
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(502);
    }
    public function test_price_and_stock_are_revalidated_after_ai_processing(): void
    {
        $product=$this->product();$call=0;
        Http::fake(function()use(&$call,$product){$call++;if($call===1)$product->update(['price'=>22000000]);return Http::response($this->response(array_merge($this->plan(),$this->selection($product->id))));});
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(0,'data.recommendations');
    }
    public function test_changed_specs_are_not_repeated_from_stale_model_evidence(): void
    {
        $product=$this->product();$call=0;
        Http::fake(function()use(&$call,$product){$call++;if($call===1)$product->update(['specifications'=>['RAM'=>'8GB','SSD'=>'256GB'],'price'=>17000000]);return Http::response($this->response(array_merge($this->plan(),$this->selection($product->id))));});
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(0,'data.recommendations.0.evidence')->assertJsonPath('data.recommendations.0.product.price','17000000.00')->assertDontSee('16GB');
    }
    public function test_duplicate_model_ids_are_deduplicated(): void
    {
        $product=$this->product();$selected=$this->selection($product->id);$selected['recommendations'][]=$selected['recommendations'][0];$this->fake($this->plan(),$selected);
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(1,'data.recommendations');
    }
    public function test_api_auth_failures_do_not_leak_provider_diagnostics_or_key(): void
    {
        $this->product();Http::fake(['generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'=>Http::response(['error'=>'secret-diagnostic test-not-a-real-key'],401)]);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(503)->assertDontSee('secret-diagnostic')->assertDontSee('test-not-a-real-key');
    }
    public function test_incomplete_and_refusal_are_handled_without_fake_recommendations(): void
    {
        $this->product();Http::fake(['generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'=>Http::response(['candidates'=>[['finishReason'=>'MAX_TOKENS','content'=>['parts'=>[]]]]])]);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(502);
    }
    public function test_daily_call_limit_caps_billable_requests(): void
    {
        config(['product_advisor.daily_call_limit'=>1]);$this->product();$this->fake($this->plan());
        $this->postJson('/api/advisor/chat',$this->body())->assertOk();
        $this->postJson('/api/advisor/chat',$this->body(['messages'=>[['role'=>'user','content'=>'Tìm một laptop khác']]]))->assertStatus(429);Http::assertSentCount(1);
    }
    public function test_follow_up_uses_current_public_previous_products_in_display_order(): void
    {
        $first=$this->product();$second=$this->product(['tenSP'=>'Laptop khác']);$hidden=$this->product(['status'=>'inactive']);
        $this->fake($this->plan(),$this->selection($second->id));
        $this->postJson('/api/advisor/chat',$this->body(['previous_product_ids'=>[$second->id,$hidden->id,$first->id],'messages'=>[['role'=>'user','content'=>'Laptop dưới 20 triệu'],['role'=>'assistant','content'=>'Đây là gợi ý'],['role'=>'user','content'=>'Cái đầu tiên RAM bao nhiêu?']]]))->assertOk();
        Http::assertSent(function($request)use($second,$first){$input=json_decode($request['contents'][0]['parts'][0]['text'],true);return isset($input['previous_products_in_display_order'])&&array_column($input['previous_products_in_display_order'],'id')===[$second->id,$first->id];});
    }

    public function test_gemini_error_codes_are_distinguished_without_provider_diagnostics(): void
    {
        $this->product();$sequence=Http::sequence();
        foreach([400,403,404,429,503] as $status)$sequence->push(['error'=>['message'=>'secret-diagnostic test-not-a-real-key']],$status);
        Http::fake(['generativelanguage.googleapis.com/*'=>$sequence]);
        foreach(['Cấu hình Gemini chưa hợp lệ','Gemini từ chối','Model Gemini chưa khả dụng','Gemini đã chạm hạn mức','Dịch vụ Gemini tạm thời'] as $message){
            $response=$this->postJson('/api/advisor/chat',$this->body())->assertStatus(503)->assertDontSee('secret-diagnostic')->assertDontSee('test-not-a-real-key');
            $this->assertStringStartsWith($message,$response->json('message'));
        }
        Http::assertSentCount(5); // No automatic retry consumes the small daily quota.
    }

    public function test_blocked_gemini_prompt_returns_clear_error_without_fake_cards(): void
    {
        $this->product();Http::fake(['generativelanguage.googleapis.com/*'=>Http::response(['promptFeedback'=>['blockReason'=>'SAFETY']])]);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(422);
    }

    public function test_gemini_thought_parts_are_not_parsed_or_returned_to_customer(): void
    {
        $product=$this->product();$call=0;
        Http::fake(function()use(&$call,$product){$call++;$body=$this->response(array_merge($this->plan(),$this->selection($product->id)));array_unshift($body['candidates'][0]['content']['parts'],['thought'=>true,'text'=>'internal-secret-thinking']);return Http::response($body);});
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(1,'data.recommendations')->assertDontSee('internal-secret-thinking');
    }

    public function test_invalid_model_name_is_rejected_before_api_call(): void
    {
        $this->product();config(['product_advisor.model'=>'https://other.example/model?key=oops']);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(503);Http::assertNothingSent();
    }

    public function test_gemini_request_uses_json_schema_and_low_thinking_without_openai_fields(): void
    {
        $product=$this->product();$this->fake($this->plan(),$this->selection($product->id));
        $this->postJson('/api/advisor/chat',$this->body())->assertOk();
        Http::assertSent(function($request){return $request['generationConfig']['thinkingConfig']['thinkingLevel']==='LOW'&&$request['generationConfig']['responseFormat']['text']['schema']['additionalProperties']===false&&!isset($request['input'])&&!isset($request['store'])&&isset($request['systemInstruction']['parts'][0]['text']);});
    }

    public function test_connection_failure_returns_safe_error(): void
    {
        $this->product();Http::fake(['generativelanguage.googleapis.com/*'=>Http::failedConnection()]);
        $response=$this->postJson('/api/advisor/chat',$this->body())->assertStatus(503)->assertDontSee('test-not-a-real-key');
        $this->assertStringContainsString('Gemini chưa phản hồi kịp thời',$response->json('message'));
    }

    public function test_fast_cache_reuses_validated_selection_without_extra_api_call(): void
    {
        $product=$this->product();$this->fake($this->plan(),$this->selection($product->id));
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonPath('data.cache_hit',false);
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonPath('data.cache_hit',true)->assertJsonPath('data.recommendations.0.product.price','18000000.00');
        Http::assertSentCount(1);
    }

    public function test_catalog_change_invalidates_cached_advice(): void
    {
        $product=$this->product();Http::fake(fn()=>Http::response($this->response(array_merge($this->plan(),$this->selection($product->id)))));
        $this->postJson('/api/advisor/chat',$this->body())->assertOk();
        $product->update(['price'=>19000000]);
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonPath('data.cache_hit',false)->assertJsonPath('data.recommendations.0.product.price','19000000.00');
        Http::assertSentCount(2);
    }

    public function test_timeout_budget_and_payload_are_bounded_to_one_call(): void
    {
        $product=$this->product();
        Http::fake(function($request,$options)use($product){
            $this->assertSame(18,$options['timeout']);$this->assertSame(4,$options['connect_timeout']);
            $input=json_decode($request['contents'][0]['parts'][0]['text'],true);
            $this->assertLessThanOrEqual(16,count($input['candidates']));
            $this->assertLessThanOrEqual(8,count($input['candidates'][0]['facts']));
            return Http::response($this->response(array_merge($this->plan(),$this->selection($product->id))));
        });
        $this->postJson('/api/advisor/chat',$this->body())->assertOk();Http::assertSentCount(1);
    }

    public function test_failed_calls_are_not_cached_and_can_be_retried(): void
    {
        $product=$this->product();Http::fake(['generativelanguage.googleapis.com/*'=>Http::sequence()->push([],503)->push($this->response(array_merge($this->plan(),$this->selection($product->id))))]);
        $this->postJson('/api/advisor/chat',$this->body())->assertStatus(503);
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonPath('data.cache_hit',false);Http::assertSentCount(2);
    }

    public function test_upstream_status_is_visible_without_exposing_error_message_or_key(): void
    {
        $this->product();Http::fake(['generativelanguage.googleapis.com/*'=>Http::response(['error'=>['status'=>'UNAVAILABLE','message'=>'secret-diagnostic test-not-a-real-key']],503)]);
        $response=$this->postJson('/api/advisor/chat',$this->body())->assertStatus(503)->assertDontSee('secret-diagnostic')->assertDontSee('test-not-a-real-key');
        $this->assertStringContainsString('[HTTP 503 / UNAVAILABLE]',$response->json('message'));
    }

    public function test_flash_lite_uses_minimal_thinking_and_one_call(): void
    {
        config(['product_advisor.model'=>'gemini-3.5-flash-lite']);$product=$this->product();
        Http::fake(['generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent'=>Http::response($this->response(array_merge($this->plan(),$this->selection($product->id))))]);
        $this->postJson('/api/advisor/chat',$this->body())->assertOk()->assertJsonCount(1,'data.recommendations');
        Http::assertSent(fn($request)=>$request['generationConfig']['thinkingConfig']['thinkingLevel']==='MINIMAL');Http::assertSentCount(1);
    }
}
