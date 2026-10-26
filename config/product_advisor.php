<?php

return [
    'timeout' => 18,
    'cache_seconds' => 90,
    'enabled' => env('AI_ADVISOR_ENABLED', true),
    'api_key' => env('GEMINI_API_KEY', ''),
    'model' => env('GEMINI_MODEL', 'gemini-3.5-flash-lite'),
    'daily_call_limit' => (int) env('AI_ADVISOR_DAILY_CALL_LIMIT', 80),
];
