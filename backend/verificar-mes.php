<?php
// rodar com: php artisan tinker < backend/verificar-mes.php

$query = App\Models\Documento::whereBetween("criado_em", [now()->startOfMonth(), now()]);

echo "Total de documentos este mes (todos os estados): " . $query->count() . PHP_EOL;
echo PHP_EOL . "Por estado:" . PHP_EOL;
$query->clone()
    ->selectRaw("estado_atual, count(*) as total")
    ->groupBy("estado_atual")
    ->get()
    ->each(fn($r) => print($r->estado_atual . ": " . $r->total . PHP_EOL));