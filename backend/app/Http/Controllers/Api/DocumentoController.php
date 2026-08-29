<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Documento;
use App\Services\WorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DocumentoController extends Controller
{
    public function __construct(private WorkflowService $workflow)
    {
    }

    public function index(Request $request)
    {
        Gate::authorize('verQualquer', Documento::class);

        $utilizador = $request->user();
        $query = Documento::query()->with(['servicoDestino', 'criadoPor']);

        if ($utilizador->possuiPerfil('RECEP')) {
            $query->whereIn('estado_atual', [
                Documento::ESTADO_RECEPCAO,
                Documento::ESTADO_SUBMETIDO,
            ]);
        } elseif ($utilizador->possuiPerfil('ARQ')) {
            $query->whereIn('estado_atual', [Documento::ESTADO_VALIDADO_SERVICO, Documento::ESTADO_ARQUIVADO]);
        } elseif ($utilizador->possuiPerfil('MIN')) {
            $query->whereIn('estado_atual', [Documento::ESTADO_VALIDADO_SECRETARIADO, Documento::ESTADO_ENCAMINHADO]);
        } elseif (! $utilizador->possuiPerfil('SECR', 'ADMIN')) {
            $query->where(function ($q) use ($utilizador) {
                $q->where('servico_destino_id', $utilizador->perfil_id)
                    ->orWhereHas('encaminhamentos', fn ($e) => $e->where('servico_destino_id', $utilizador->perfil_id));
            });
        }

        $perPage = (int) $request->input('per_page', 15);

        return $query->orderByDesc('criado_em')->paginate($perPage);
    }

    public function store(Request $request)
    {
        Gate::authorize('criar', Documento::class);

        $dados = $request->validate([
            'remetente' => ['required', 'string', 'max:200'],
            'assunto' => ['required', 'string', 'max:300'],
            'tipo_documento' => ['required', 'in:Oficio,Carta,Memo,Nota,Outro'],
            'data_documento' => ['nullable', 'date'],
            'numero_referencia' => ['nullable', 'string', 'max:100'],
            'observacoes' => ['nullable', 'string'],
            'prioridade' => ['nullable', 'in:Normal,Urgente,Muito Urgente'],
            'servico_destino_id' => ['nullable', 'exists:perfis,id'],
        ]);

        $dados['numero_registo'] = Documento::gerarNumeroRegisto();
        $dados['estado_atual'] = Documento::ESTADO_RECEPCAO;
        $dados['criado_por'] = $request->user()->id;

        $documento = Documento::create($dados);

        $this->workflow->registarCriacao($documento, $request->user());

        return response()->json($documento, 201);
    }

    public function show(Request $request, Documento $documento)
    {
        Gate::authorize('ver', $documento);

        return $documento->load(['servicoDestino', 'criadoPor', 'anexos', 'assinatura.utilizador:id,nome']);
    }

    public function update(Request $request, Documento $documento)
    {
        Gate::authorize('editar', $documento);

        $dados = $request->validate([
            'remetente' => ['sometimes', 'string', 'max:200'],
            'assunto' => ['sometimes', 'string', 'max:300'],
            'tipo_documento' => ['sometimes', 'in:Oficio,Carta,Memo,Nota,Outro'],
            'data_documento' => ['nullable', 'date'],
            'numero_referencia' => ['nullable', 'string', 'max:100'],
            'observacoes' => ['nullable', 'string'],
            'prioridade' => ['sometimes', 'in:Normal,Urgente,Muito Urgente'],
            'servico_destino_id' => ['nullable', 'exists:perfis,id'],
        ]);

        $documento->update($dados);

        return $documento->fresh();
    }

    public function validar(Request $request, Documento $documento)
    {
        Gate::authorize('validarSecretariado', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_VALIDADO_SECRETARIADO, $request->user());
    }

    /**
     * POST /documentos/{documento}/submeter
     * Primeira transição do workflow: recepcao -> submetido.
     */
    public function submeter(Request $request, Documento $documento)
    {
        Gate::authorize('submeter', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_SUBMETIDO, $request->user());
    }

    public function encaminhar(Request $request, Documento $documento)
    {
        Gate::authorize('encaminhar', $documento);

        $dados = $request->validate([
            'servico_destino_id' => ['required', 'exists:perfis,id'],
        ]);

        $documento->servico_destino_id = $dados['servico_destino_id'];
        $documento->save();

        $documento = $this->workflow->transitar($documento, Documento::ESTADO_ENCAMINHADO, $request->user());

        \App\Models\Encaminhamento::create([
            'documento_id' => $documento->id,
            'servico_destino_id' => $dados['servico_destino_id'],
            'encaminhado_por' => $request->user()->id,
            'encaminhado_em' => now(),
        ]);

        return $documento->fresh();
    }

    public function rejeitar(Request $request, Documento $documento)
    {
        Gate::authorize('rejeitar', $documento);

        $dados = $request->validate([
            'justificacao' => ['required', 'string', 'min:5'],
        ]);

        $documento = $this->workflow->transitar(
            $documento,
            Documento::ESTADO_REJEITADO,
            $request->user(),
            $dados['justificacao']
        );

        \App\Models\Comentario::create([
            'documento_id' => $documento->id,
            'autor_id' => $request->user()->id,
            'texto' => '[Rejeição] '.$dados['justificacao'],
            'estado_criacao' => $documento->estado_atual,
            'criado_em' => now(),
        ]);

        return $documento;
    }

    /**
     * POST /documentos/{documento}/reabrir
     * Reservado a MIN/ADMIN. Devolve o documento ao estado anterior à
     * rejeição (calculado dinamicamente pelo WorkflowService) e regista
     * um comentário com o motivo da reabertura.
     */
    public function reabrir(Request $request, Documento $documento)
    {
        Gate::authorize('reabrir', $documento);

        $dados = $request->validate([
            'motivo' => ['required', 'string', 'min:5'],
        ]);

        $documento = $this->workflow->reabrir($documento, $request->user(), $dados['motivo']);

        \App\Models\Comentario::create([
            'documento_id' => $documento->id,
            'autor_id' => $request->user()->id,
            'texto' => '[Reabertura] '.$dados['motivo'],
            'estado_criacao' => $documento->estado_atual,
            'criado_em' => now(),
        ]);

        return $documento;
    }

    /**
     * POST /documentos/{documento}/assinar
     * Registo simples de assinatura (não PAdES/CAdES): guarda quem
     * assinou, quando, e um hash SHA-256 dos dados canónicos do
     * documento nesse momento, para deteção de alterações posteriores.
     */
    public function assinar(Request $request, Documento $documento)
    {
        Gate::authorize('assinar', $documento);

        $hash = hash('sha256', json_encode([
            'numero_registo' => $documento->numero_registo,
            'remetente' => $documento->remetente,
            'assunto' => $documento->assunto,
            'tipo_documento' => $documento->tipo_documento,
            'prioridade' => $documento->prioridade,
            'estado_atual' => $documento->estado_atual,
            'criado_por' => $documento->criado_por,
        ]));

        \App\Models\Assinatura::create([
            'documento_id' => $documento->id,
            'utilizador_id' => $request->user()->id,
            'hash_documento' => $hash,
            'assinado_em' => now(),
        ]);

        \App\Models\Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'assinar_documento',
            'entidade_afetada' => 'documentos',
            'entidade_id' => $documento->id,
            'detalhes' => ['hash_documento' => $hash],
            'ocorrido_em' => now(),
        ]);

        return $documento->fresh()->load('assinatura.utilizador:id,nome');
    }

    public function arquivar(Request $request, Documento $documento)
    {
        Gate::authorize('arquivar', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_ARQUIVADO, $request->user());
    }

    public function desarquivar(Request $request, Documento $documento)
    {
        Gate::authorize('desarquivar', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_VALIDADO_SERVICO, $request->user());
    }

    public function historico(Request $request, Documento $documento)
    {
        Gate::authorize('ver', $documento);

        return $documento->historicoEstados()
            ->with('alteradoPor:id,nome')
            ->orderBy('alterado_em')
            ->get();
    }

    /**
     * GET /documentos/{id}/encaminhamentos
     */
    public function encaminhamentos(Request $request, Documento $documento)
    {
        Gate::authorize('ver', $documento);

        return $documento->encaminhamentos()
            ->with(['servicoDestino', 'encaminhadoPor:id,nome'])
            ->orderByDesc('encaminhado_em')
            ->get();
    }
}
