<?php

return [
    'default' => env('CACHE_STORE', 'file'),
    'stores' => [
        'file' => ['driver' => 'file', 'path' => storage_path('framework/cache/data')],
        'database' => ['driver' => 'database', 'connection' => null, 'table' => 'cache'],
        'redis' => ['driver' => 'redis', 'connection' => 'default'],
    ],
    'prefix' => env('CACHE_PREFIX', 'sgd_cache'),
];
