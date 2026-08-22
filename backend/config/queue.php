<?php

return [
    // 'sync' em desenvolvimento (ex.: XAMPP, sem worker); 'redis' em producao (RF015).
    'default' => env('QUEUE_CONNECTION', 'sync'),
    'connections' => [
        'sync' => ['driver' => 'sync'],
        'database' => ['driver' => 'database', 'table' => 'jobs', 'queue' => 'default', 'retry_after' => 90],
        'redis' => ['driver' => 'redis', 'connection' => 'default', 'queue' => env('REDIS_QUEUE', 'notificacoes'), 'retry_after' => 90],
    ],
];
