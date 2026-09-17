<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\ConfiguracaoInstituicao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ConfigController extends Controller
{
    /**
     * GET /config
     *
     * Endpoint público (sem autenticação) com a identidade visual desta
     * instalação. Permite ao frontend mostrar o nome/sigla do ministério
     * correto mesmo antes do login (ver ecrã de Login), sem depender de
     * texto fixo no código.
     */
    public function index(Request $request)
    {
        $config = ConfiguracaoInstituicao::atual();

        return response()->json([
            'sigla_instituicao' => $config->sigla_instituicao,
            'subtitulo' => $config->subtitulo,
            'selo' => $config->selo,
            'url_publica' => config('sgd.url_publica'),
        ]);
    }

    /**
     * PUT /config
     *
     * Só o SADMIN pode alterar a identidade visual — pela interface, sem
     * precisar de mexer no .env nem reiniciar o servidor.
     */
    public function update(Request $request)
    {
        Gate::authorize('gerir', ConfiguracaoInstituicao::class);

        $dados = $request->validate([
            'sigla_instituicao' => ['sometimes', 'string', 'max:30'],
            'subtitulo' => ['sometimes', 'string', 'max:100'],
            'selo' => ['sometimes', 'string', 'max:4'],
        ]);

        $config = ConfiguracaoInstituicao::atual();
        $config->update($dados);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_configuracao_instituicao',
            'entidade_afetada' => 'configuracao_instituicao',
            'entidade_id' => (string) $config->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['campos_alterados' => array_keys($dados)],
            'ocorrido_em' => now(),
        ]);

        return response()->json([
            'sigla_instituicao' => $config->sigla_instituicao,
            'subtitulo' => $config->subtitulo,
            'selo' => $config->selo,
        ]);
    }
}

