<?php

return [
    'anexo_tamanho_maximo_mb' => env('SGD_ANEXO_TAMANHO_MAXIMO_MB', 20),
    'duplo_fator_perfis_obrigatorios' => env('SGD_2FA_PERFIS_OBRIGATORIOS', 'MIN,SG,CG'),

    // 's3' em producao (MinIO). 'local' em desenvolvimento sem MinIO (ex.: XAMPP) —
    // grava em backend/storage/app/private, sem alterar nenhuma linha de codigo.
    'disco_anexos' => env('SGD_DISCO_ANEXOS', 'local'),
];
