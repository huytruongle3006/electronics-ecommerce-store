<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['page' => 'nullable|integer|min:1']);
        return DB::transaction(function () use ($request) {
            $query = StoreNotification::where('user_id', $request->user()->id);
            return response()->json([
                'data' => (clone $query)->orderByDesc('id')->paginate(15),
                'unread_count' => (clone $query)->whereNull('read_at')->count(),
                'latest_id' => (clone $query)->max('id') ?? 0,
            ]);
        });
    }

    public function read(Request $request, int $id)
    {
        $query = StoreNotification::where('user_id', $request->user()->id)->whereKey($id);
        abort_unless((clone $query)->exists(), 404);
        $query->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }

    public function readAll(Request $request)
    {
        $data = $request->validate(['through_id' => 'required|integer|min:0']);
        // New notifications arriving after the displayed snapshot remain unread.
        StoreNotification::where('user_id', $request->user()->id)->where('id', '<=', $data['through_id'])
            ->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }
}
