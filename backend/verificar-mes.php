$total = App\Models\Documento::whereBetween("criado_em", [now()->startOfMonth(), now()])->count();
echo "Total de documentos este mes (todos os estados): " . $total . PHP_EOL;
echo PHP_EOL . "Por estado:" . PHP_EOL;
App\Models\Documento::whereBetween("criado_em", [now()->startOfMonth(), now()])
    ->selectRaw("estado_atual, count(*) as total")
    ->groupBy("estado_atual")
    ->get()
    ->each(fn($r) => print($r->estado_atual . ": " . $r->total . PHP_EOL));
