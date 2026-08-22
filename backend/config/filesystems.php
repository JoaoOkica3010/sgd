<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        // Usado em desenvolvimento sem MinIO (ex.: XAMPP). Ficheiros gravados
        // em backend/storage/app/private — nunca acessivel diretamente pelo
        // navegador, sempre servido atraves do AnexoController (RF007/RF008).
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => true,
        ],

        // Usado em producao: MinIO (compativel S3), conforme o Documento de
        // Arquitetura Tecnica, seccao 3.5.
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => true,
        ],

    ],

];
