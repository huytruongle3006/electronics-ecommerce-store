<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShippingAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShippingAddressController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => ShippingAddress::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')->orderBy('id')->get()]);
    }

    private function validated(Request $request): array
    {
        // Ignore user_id and other unexpected fields; ownership always comes from auth.
        foreach (['label', 'recipient_name', 'recipient_phone', 'shipping_address'] as $field) {
            if (is_string($request->input($field))) $request->merge([$field => trim($request->input($field))]);
        }
        return $request->validate([
            'label' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:100',
            'recipient_phone' => ['bail', 'required', 'string', 'max:20', function ($attribute, $value, $fail) {
                if (!preg_match('/^\+?[0-9]{7,15}$/', preg_replace('/[ ().-]/', '', $value))) {
                    $fail('Số điện thoại cần có 7–15 chữ số, có thể bắt đầu bằng dấu +.');
                }
            }],
            'shipping_address' => 'required|string|max:1000',
            'is_default' => 'sometimes|boolean',
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        return DB::transaction(function () use ($request, $data) {
            $userId = $request->user()->id;
            // Serialize address writes for one user, including the first address/default.
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            $count = ShippingAddress::where('user_id', $userId)->count();
            abort_if($count >= 20, 422, 'Bạn chỉ có thể lưu tối đa 20 địa chỉ.');
            $data['is_default'] = $count === 0 || ($data['is_default'] ?? false);
            if ($data['is_default']) ShippingAddress::where('user_id', $userId)->update(['is_default' => false]);
            $address = new ShippingAddress($data);
            $address->user_id = $userId;
            $address->save();
            return response()->json(['data' => $address, 'message' => 'Đã lưu địa chỉ.'], 201);
        }, 3);
    }

    public function update(Request $request, int $id)
    {
        $data = $this->validated($request);
        return DB::transaction(function () use ($request, $id, $data) {
            $userId = $request->user()->id;
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);
            // Keep a default at all times; choose another address to replace it.
            $data['is_default'] = $address->is_default || ($data['is_default'] ?? false);
            if ($data['is_default']) ShippingAddress::where('user_id', $userId)->where('id', '!=', $id)->update(['is_default' => false]);
            $address->update($data);
            return response()->json(['data' => $address, 'message' => 'Đã cập nhật địa chỉ.']);
        }, 3);
    }

    public function makeDefault(Request $request, int $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $userId = $request->user()->id;
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);
            ShippingAddress::where('user_id', $userId)->where('id', '!=', $id)->update(['is_default' => false]);
            $address->update(['is_default' => true]);
            return response()->json(['data' => $address, 'message' => 'Đã chọn địa chỉ mặc định.']);
        }, 3);
    }

    public function destroy(Request $request, int $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $userId = $request->user()->id;
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            $address = ShippingAddress::where('user_id', $userId)->findOrFail($id);
            $wasDefault = $address->is_default;
            $address->delete();
            if ($wasDefault) ShippingAddress::where('user_id', $userId)->orderBy('id')->first()?->update(['is_default' => true]);
            return response()->json(['message' => 'Đã xóa địa chỉ. Các đơn đã đặt vẫn giữ địa chỉ cũ.']);
        }, 3);
    }
}
