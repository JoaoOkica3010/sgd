<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Documento;
use App\Services\WorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class DocumentoController extends Controller
{
    public function __construct(private WorkflowService $workflow)
    {
    }

    public function index(Request $request)
    {
        Gate::authorize('verQualquer', Documento::class);

        $query = Documento::query()->with(['servicoDestino', 'criadoPor']);

        if ($request->filled('data_inicio')) {
            $query->where('criado_em', '>=', $request->input('data_inicio'));
        }

        if ($request->filled('data_fim')) {
            $query->where('criado_em', '<=', $request->input('data_fim'));
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
            'servico_destino_id' => ['nullable', 'exists:servicos,id'],
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
            'servico_destino_id' => ['nullable', 'exists:servicos,id'],
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

    /**
     * POST /documentos/{documento}/encaminhar
     *
     * Aceita um ou vários serviços de destino em simultâneo (o Ministro
     * pode encaminhar o mesmo documento a mais do que um serviço de uma
     * só vez) — por isso "encaminhamentos" não tem restrição de
     * unicidade por documento. servico_destino_id em "documentos" fica
     * com o primeiro destino escolhido (uso de exibição/edição); a
     * visibilidade de cada serviço já é determinada a partir da tabela
     * "encaminhamentos" (ver DocumentoPolicy::ver / index() acima).
     */
    public function encaminhar(Request $request, Documento $documento)
    {
        Gate::authorize('encaminhar', $documento);

        $dados = $request->validate([
            'servico_destino_ids' => ['required', 'array', 'min:1'],
            'servico_destino_ids.*' => [
                Rule::exists('servicos', 'id')->where('ativo', true),
            ],
            'comentario' => ['nullable', 'string'],
        ]);

        $servicoDestinoIds = array_values(array_unique($dados['servico_destino_ids']));

        $documento->servico_destino_id = $servicoDestinoIds[0];
        $documento->save();

        $documento = $this->workflow->transitar($documento, Documento::ESTADO_ENCAMINHADO, $request->user());

        foreach ($servicoDestinoIds as $servicoDestinoId) {
            \App\Models\Encaminhamento::create([
                'documento_id' => $documento->id,
                'servico_destino_id' => $servicoDestinoId,
                'encaminhado_por' => $request->user()->id,
                'encaminhado_em' => now(),
            ]);
        }

        if (! empty($dados['comentario'])) {
            \App\Models\Comentario::create([
                'documento_id' => $documento->id,
                'autor_id' => $request->user()->id,
                'texto' => '[Encaminhamento] '.$dados['comentario'],
                'estado_criacao' => $documento->estado_atual,
                'criado_em' => now(),
            ]);
        }

        return $documento->fresh()->load('encaminhamentos.servicoDestino');
    }

    /**
     * POST /documentos/{documento}/iniciar-analise
     * Serviço de destino começa a analisar: encaminhado -> em_analise.
     */
    public function iniciarAnalise(Request $request, Documento $documento)
    {
        Gate::authorize('iniciarAnalise', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_EM_ANALISE, $request->user());
    }

    /**
     * POST /documentos/{documento}/validar-servico
     * Serviço de destino conclui a análise: em_analise -> validado_servico.
     */
    public function validarServico(Request $request, Documento $documento)
    {
        Gate::authorize('validarServico', $documento);

        return $this->workflow->transitar($documento, Documento::ESTADO_VALIDADO_SERVICO, $request->user());
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
