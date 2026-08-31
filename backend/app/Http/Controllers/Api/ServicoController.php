<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Servico;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ServicoController extends Controller
{
    /**
     * GET /servicos
     *
     * Lista de referência com apenas os serviços ATIVOS. É esta a lista
     * usada pelo Ministro no ecrã de encaminhamento — qualquer utilizador
     * autenticado pode consultar, tal como acontecia com GET /perfis.
     */
    public function index(Request $request)
    {
        return Servico::where('ativo', true)->orderBy('nome')->get();
    }

    /**
     * GET /servicos/todos
     *
     * Listagem completa (ativos e inativos), reservada ao SADMIN — é o
     * ecrã onde o SADMIN ativa/desativa serviços e vê o que criou.
     */
    public function indexAdmin(Request $request)
    {
        Gate::authorize('gerir', Servico::class);

        $query = Servico::query();

        if ($request->filled('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query->orderBy('nome')->paginate((int) $request->input('per_page', 20));
    }

    /**
     * POST /servicos
     */
    public function store(Request $request)
    {
        Gate::authorize('gerir', Servico::class);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:150', 'unique:servicos,nome'],
            'descricao' => ['nullable', 'string'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        $dados['ativo'] = $dados['ativo'] ?? true;
        $dados['criado_por'] = $request->user()->id;

        $servico = Servico::create($dados);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'criar_servico',
            'entidade_afetada' => 'servicos',
            'entidade_id' => (string) $servico->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['nome' => $servico->nome, 'ativo' => $servico->ativo],
            'ocorrido_em' => now(),
        ]);

        return response()->json($servico, 201);
    }

    /**
     * PUT /servicos/{servico}
     *
     * Usado tanto para editar nome/descrição como para ativar/desativar
     * (basta enviar { "ativo": false }).
     */
    public function update(Request $request, Servico $servico)
    {
        Gate::authorize('gerir', Servico::class);

        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:150', 'unique:servicos,nome,'.$servico->id],
            'descricao' => ['nullable', 'string'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        $servico->update($dados);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_servico',
            'entidade_afetada' => 'servicos',
            'entidade_id' => (string) $servico->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['campos_alterados' => array_keys($dados)],
            'ocorrido_em' => now(),
        ]);

        return $servico->fresh();
    }
}
