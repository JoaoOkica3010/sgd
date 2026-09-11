<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Utilizador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AuditoriaController extends Controller
{
    /**
     * GET /auditoria (RNF006)
     */
    public function index(Request $request)
    {
        Gate::authorize('administrar', Utilizador::class);

        $query = Auditoria::query()->with('utilizador:id,nome,email');

        if ($request->filled('utilizador_id')) {
            $query->where('utilizador_id', $request->input('utilizador_id'));
        }

        if ($request->filled('acao')) {
            $query->where('acao', $request->input('acao'));
        }

        return $query->orderByDesc('ocorrido_em')
            ->paginate((int) $request->input('per_page', 30));
    }
}
