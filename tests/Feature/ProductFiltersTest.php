<?php

namespace Tests\Feature;

use App\Models\{Category,Product};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountTestCase;

class ProductFiltersTest extends AccountTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('categories',fn(Blueprint $t)=>[$t->id(),$t->string('maLoai'),$t->string('tenLoai')]);
        Schema::create('suppliers',fn(Blueprint $t)=>[$t->id(),$t->string('tenNCC')]);
        Schema::create('products',function(Blueprint $t){$t->id();$t->string('maSP');$t->string('tenSP');$t->decimal('price',15,2);$t->integer('quantity');$t->integer('warranty_months');$t->string('status');$t->unsignedBigInteger('category_id');$t->unsignedBigInteger('supplier_id')->nullable();$t->timestamps();});
        Category::create(['maLoai'=>'LAP','tenLoai'=>'Laptop']);Category::create(['maLoai'=>'PHONE','tenLoai'=>'Điện thoại']);
    }
    private function product(array $fields=[]): Product
    {
        return Product::create(array_merge(['maSP'=>'SP'.Product::count(),'tenSP'=>'Laptop mẫu '.Product::count(),'price'=>'15000000.00','quantity'=>5,'warranty_months'=>12,'status'=>'active','category_id'=>1],$fields));
    }
    public function test_public_catalog_excludes_inactive_even_when_client_supplies_status(): void
    {
        $a=$this->product();$this->product(['status'=>'inactive']);
        $this->getJson('/api/products?status=inactive')->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$a->id);
    }
    public function test_search_finds_products_outside_first_page_and_searches_name_or_code(): void
    {
        $target=$this->product(['tenSP'=>'Máy dành cho sinh viên','maSP'=>'SPECIAL-001']);
        foreach(range(1,15) as $i)$this->product();
        $this->getJson('/api/products')->assertOk()->assertJsonPath('data.total',16)->assertJsonCount(12,'data.data');
        $this->getJson('/api/products?search=SPECIAL-001')->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$target->id);
        $this->getJson('/api/products?search='.urlencode('  sinh viên  '))->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$target->id);
        $this->getJson('/api/products?search=NOT-FOUND')->assertJsonPath('data.total',0);
    }
    public function test_combines_category_price_stock_and_warranty_on_entire_catalog(): void
    {
        $target=$this->product(['warranty_months'=>24,'price'=>18000000]);
        $this->product(['category_id'=>2,'warranty_months'=>24]);$this->product(['quantity'=>0,'warranty_months'=>24]);
        $this->product(['warranty_months'=>12]);$this->product(['price'=>25000000,'warranty_months'=>24]);
        $this->getJson('/api/products?category_id=1&min_price=10000000&max_price=20000000&in_stock=1&min_warranty_months=24')->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$target->id);
    }
    public function test_price_range_includes_boundaries_and_zero_price(): void
    {
        $zero=$this->product(['price'=>0]);$a=$this->product(['price'=>'100.10']);$b=$this->product(['price'=>'200.20']);$this->product(['price'=>'200.21']);
        $this->getJson('/api/products?min_price=100.10&max_price=200.20&sort=price_asc')->assertOk()->assertJsonPath('data.total',2)->assertJsonPath('data.data.0.id',$a->id)->assertJsonPath('data.data.1.id',$b->id);
        $this->getJson('/api/products?min_price=0&max_price=0')->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.id',$zero->id);
    }
    public function test_stock_filter_is_optional_and_zero_does_not_hide_out_of_stock(): void
    {
        $this->product(['quantity'=>0]);$this->product(['quantity'=>1]);
        $this->getJson('/api/products')->assertJsonPath('data.total',2);
        $this->getJson('/api/products?in_stock=0')->assertJsonPath('data.total',2);
        $this->getJson('/api/products?in_stock=1')->assertJsonPath('data.total',1);
    }
    public function test_sorting_uses_all_matches_with_stable_id_tie_breaker(): void
    {
        $a=$this->product(['price'=>100,'warranty_months'=>12,'tenSP'=>'Alpha']);
        $b=$this->product(['price'=>200,'warranty_months'=>36,'tenSP'=>'Beta']);
        $c=$this->product(['price'=>100,'warranty_months'=>12,'tenSP'=>'Alpha']);
        $this->getJson('/api/products?sort=price_asc')->assertJsonPath('data.data.0.id',$c->id)->assertJsonPath('data.data.1.id',$a->id);
        $this->getJson('/api/products?sort=price_desc')->assertJsonPath('data.data.0.id',$b->id);
        $this->getJson('/api/products?sort=warranty_desc')->assertJsonPath('data.data.0.id',$b->id);
        $this->getJson('/api/products?sort=name_asc')->assertJsonPath('data.data.0.id',$c->id);
    }
    public function test_pagination_has_no_duplicates_and_ordering_is_stable_when_dates_tie(): void
    {
        foreach(range(1,25) as $i){$p=$this->product();$p->forceFill(['created_at'=>'2026-10-27 05:00:00'])->save();}
        $one=$this->getJson('/api/products?page=1')->assertOk()->assertJsonPath('data.last_page',3)->assertJsonPath('data.data.0.id',25)->json('data.data');
        $two=$this->getJson('/api/products?page=2')->assertOk()->assertJsonPath('data.data.0.id',13)->json('data.data');
        $this->assertSame([],array_values(array_intersect(array_column($one,'id'),array_column($two,'id'))));
        $this->getJson('/api/products?page=3')->assertJsonCount(1,'data.data')->assertJsonPath('data.data.0.id',1);
    }
    public function test_invalid_ranges_sort_and_paging_are_422_and_page_size_is_bounded(): void
    {
        foreach(['min_price=-1','min_price=100&max_price=99','max_price=not-a-number','min_price=1.001','max_price=100000000000000','in_stock=maybe','category_id=0','min_warranty_months=-1','min_warranty_months=121','sort=DROP','page=0','limit=0','limit=49','search='.str_repeat('x',101)] as $query)$this->getJson('/api/products?'.$query)->assertUnprocessable();
    }
    public function test_no_result_and_unknown_category_remain_valid_empty_pages(): void
    {
        $this->product();$this->getJson('/api/products?category_id=999')->assertOk()->assertJsonPath('data.total',0)->assertJsonPath('data.last_page',1)->assertJsonCount(0,'data.data');
        $this->getJson('/api/products?min_price=99999999')->assertJsonPath('data.total',0);
    }
}
