<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Comentario;
use App\Models\Documento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ComentarioController extends Controller
{
    /**
     * GET /documentos/{documento}/observacoes
     */
    public function index(Request $request, Documento $documento)
    {
        Gate::authorize('ver', $documento);

        return $documento->comentarios()
            ->with('autor.perfil')
            ->orderByDesc('criado_em')
            ->get()
            ->map(fn (Comentario $c) => $this->serializar($c));
    }

    /**
     * POST /documentos/{documento}/observacoes (RF016)
     */
    public function store(Request $request, Documento $documento)
    {
        Gate::authorize('criar', [Comentario::class, $documento]);

        $dados = $request->validate([
            'texto' => ['required', 'string', 'min:1'],
        ]);

        $comentario = Comentario::create([
            'documento_id' => $documento->id,
            'autor_id' => $request->user()->id,
            'texto' => $dados['texto'],
            'estado_criacao' => $documento->estado_atual,
            'criado_em' => now(),
        ]);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'adicionar_comentario',
            'entidade_afetada' => 'comentarios',
            'entidade_id' => $comentario->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['documento_id' => $documento->id],
            'ocorrido_em' => now(),
        ]);

        return response()->json($this->serializar($comentario->load('autor.perfil')), 201);
    }

    /**
     * PUT /documentos/{documento}/observacoes/{comentario}
     */
    public function update(Request $request, Documento $documento, Comentario $comentario)
    {
        $this->garantirPertenceAoDocumento($documento, $comentario);

        Gate::authorize('editar', $comentario);

        $dados = $request->validate([
            'texto' => ['required', 'string', 'min:1'],
        ]);

        $comentario->update(['texto' => $dados['texto']]);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_comentario',
            'entidade_afetada' => 'comentarios',
            'entidade_id' => $comentario->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['documento_id' => $documento->id],
            'ocorrido_em' => now(),
        ]);

        return $this->serializar($comentario->fresh()->load('autor.perfil'));
    }

    /**
     * DELETE /documentos/{documento}/observacoes/{comentario}
     */
    public function destroy(Request $request, Documento $documento, Comentario $comentario)
    {
        $this->garantirPertenceAoDocumento($documento, $comentario);

        Gate::authorize('eliminar', $comentario);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'eliminar_comentario',
            'entidade_afetada' => 'comentarios',
            'entidade_id' => $comentario->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['documento_id' => $documento->id],
            'ocorrido_em' => now(),
        ]);

        $comentario->delete();

        return response()->json(['message' => 'Observação eliminada.']);
    }

    private function garantirPertenceAoDocumento(Documento $documento, Comentario $comentario): void
    {
        abort_unless($comentario->documento_id === $documento->id, 404);
    }

    /**
     * Formato esperado pelo frontend (DetalheDocumento.tsx / ObservacaoApi):
     * id, autor_nome, autor_perfil, texto, estado_criacao, criado_em.
     */
    private function serializar(Comentario $comentario): array
    {
        return [
            'id' => $comentario->id,
            'autor_nome' => $comentario->autor->nome,
            'autor_perfil' => $comentario->autor->perfil?->sigla,
            'texto' => $comentario->texto,
            'estado_criacao' => $comentario->estado_criacao,
            'criado_em' => $comentario->criado_em,
        ];
    }
}

