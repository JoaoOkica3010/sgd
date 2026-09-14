foreach (App\Models\Utilizador::with('perfil')->get() as $u) {
    echo $u->email . ' - ' . ($u->perfil?->sigla ?? '???') . PHP_EOL;
}
