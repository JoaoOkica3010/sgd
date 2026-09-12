<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    // Content-Disposition precisa de ser exposto para o frontend conseguir
    // ler o nome de ficheiro sugerido pelos endpoints de relatórios
    // (RelatorioController) ao descarregar o CSV via XHR/fetch.
    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,

];
