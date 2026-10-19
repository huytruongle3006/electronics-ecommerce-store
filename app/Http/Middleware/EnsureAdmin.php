<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user()?->roles()->where('maRole', 'ADMIN')->exists()) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền quản trị.'], 403);
        }
        return $next($request);
    }
}
