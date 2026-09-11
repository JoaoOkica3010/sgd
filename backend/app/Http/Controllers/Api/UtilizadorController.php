<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Utilizador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;

class UtilizadorController extends Controller
{
    /**
     * GET /utilizadores
     */
    public function index(Request $request)
    {
        Gate::authorize('administrar', Utilizador::class);

        return Utilizador::with('perfil')
            ->orderBy('nome')
            ->paginate((int) $request->input('per_page', 20));
    }

    /**
     * POST /utilizadores
     */
    public function store(Request $request)
    {
        Gate::authorize('administrar', Utilizador::class);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:utilizadores,email'],
            'password' => ['required', 'string', 'min:8'],
            'perfil_id' => ['required', 'exists:perfis,id'],
        ]);

        $utilizador = Utilizador::create([
            'nome' => $dados['nome'],
            'email' => $dados['email'],
            'password_hash' => Hash::make($dados['password']),
            'perfil_id' => $dados['perfil_id'],
            'ativo' => true,
        ]);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'criar_utilizador',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['email' => $utilizador->email, 'perfil_id' => $utilizador->perfil_id],
            'ocorrido_em' => now(),
        ]);

        return response()->json($utilizador->load('perfil'), 201);
    }

    /**
     * PUT /utilizadores/{id}
     */
    public function update(Request $request, Utilizador $utilizador)
    {
        Gate::authorize('administrar', Utilizador::class);

        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', 'unique:utilizadores,email,'.$utilizador->id],
            'password' => ['sometimes', 'string', 'min:8'],
            'perfil_id' => ['sometimes', 'exists:perfis,id'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        if (isset($dados['password'])) {
            $dados['password_hash'] = Hash::make($dados['password']);
            unset($dados['password']);
        }

        $utilizador->update($dados);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_utilizador',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['campos_alterados' => array_keys($dados)],
            'ocorrido_em' => now(),
        ]);

        return $utilizador->fresh()->load('perfil');
    }
}
