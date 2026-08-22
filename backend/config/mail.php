<?php

return [
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => [
        'smtp' => ['transport' => 'smtp', 'host' => env('MAIL_HOST', 'localhost'), 'port' => env('MAIL_PORT', 1025)],
        'log' => ['transport' => 'log', 'channel' => env('MAIL_LOG_CHANNEL')],
    ],
    'from' => ['address' => env('MAIL_FROM_ADDRESS', 'nao-responder@mttecd.gov.gw'), 'name' => env('MAIL_FROM_NAME', 'SGD')],
];
