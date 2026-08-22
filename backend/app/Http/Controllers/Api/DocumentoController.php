<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Documento;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentoController extends Controller
{
    public function __construct(private readonly WorkflowService $workflow) {}

    /** RF018-RF019: listagem/pesquisa, sempre filtrada pelo ambito do perfil (RLS + Policy). */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('verQualquer', Documento::class);

        $query = Documento::query()->with(['servicoDestino', 'criadoPor']);

        if ($termo = $request->query('q')) {
            // PostgreSQL (producao): tsvector nativo. MySQL/XAMPP (desenvolvimento): FULLTEXT.
            if (DB::getDriverName() === 'pgsql') {
                $query->whereRaw("pesquisa_tsv @@ plainto_tsquery('portuguese', ?)", [$termo]);
            } elseif (DB::getDriverName() === 'mysql') {
                $query->whereRaw(
                    'MATCH(numero_registo, remetente, assunto) AGAINST (? IN NATURAL LANGUAGE MODE)',
                    [$termo]
                );
            } else {
                $query->where(function ($sub) use ($termo) {
                    $sub->where('numero_registo', 'like', "%{$termo}%")
                        ->orWhere('remetente', 'like', "%{$termo}%")
                        ->orWhere('assunto', 'like', "%{$termo}%");
                });
            }
        }
        if ($estado = $request->query('estado')) {
            $query->where('estado_atual', $estado);
        }

        $documentos = $query->orderByDesc('criado_em')->paginate($request->integer('per_page', 20));

        return response()->json($documentos);
    }

    /** RF006-RF010: criacao de registo, com numero e data/hora automaticos. */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('criar', Documento::class);

        $dados = $request->validate([
            'remetente' => ['required', 'string', 'max:200'],
            'assunto' => ['required', 'string', 'max:300'],
            'tipo_documento' => ['required', 'in:Oficio,Carta,Memo,Nota,Outro'],
            'data_documento' => ['nullable', 'date'],
            'numero_referencia' => ['nullable', 'string', 'max:100'],
            'observacoes' => ['nullable', 'string'],
            'prioridade' => ['required', 'in:Normal,Urgente,Muito Urgente'],
            'servico_destino_id' => ['nullable', 'exists:perfis,id'],
        ]);

        $documento = DB::transaction(function () use ($dados, $request) {
            $documento = Documento::create([
                ...$dados,
                'id' => (string) Str::uuid(),
                'numero_registo' => $this->gerarNumeroRegisto(),
                'estado_atual' => Documento::ESTADO_RECEPCAO,
                'criado_por' => $request->user()->id,
                'criado_em' => now(),
            ]);

            Auditoria::registar($request->user()->id, 'criar_documento', 'documentos', $documento->id);

            return $documento;
        });

        return response()->json($documento, 201);
    }

    public function show(Documento $documento): JsonResponse
    {
        $this->authorize('ver', $documento);

        return response()->json($documento->load(['anexos', 'servicoDestino', 'criadoPor']));
    }

    /** RF011-RF012: edicao apenas quando o estado e o perfil permitem. */
    public function update(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('editar', $documento);

        $dados = $request->validate([
            'remetente' => ['sometimes', 'string', 'max:200'],
            'assunto' => ['sometimes', 'string', 'max:300'],
            'observacoes' => ['nullable', 'string'],
            'prioridade' => ['sometimes', 'in:Normal,Urgente,Muito Urgente'],
        ]);

        $documento->update($dados);
        Auditoria::registar($request->user()->id, 'editar_documento', 'documentos', $documento->id);

        return response()->json($documento->fresh());
    }

    public function submeter(Request $request, Documento $documento): JsonResponse
    {
        $documento = $this->workflow->submeter($documento, $request->user());

        return response()->json($documento);
    }

    public function validar(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('validarSecretariado', $documento);
        $documento = $this->workflow->validarSecretariado($documento, $request->user());

        return response()->json($documento);
    }

    /** RF013: encaminhamento para um ou varios servicos. */
    public function encaminhar(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('encaminhar', $documento);

        $dados = $request->validate([
            'servico_destino_ids' => ['required', 'array', 'min:1'],
            'servico_destino_ids.*' => ['exists:perfis,id'],
            'comentario' => ['nullable', 'string'],
        ]);

        $documento = $this->workflow->encaminhar(
            $documento, $request->user(), $dados['servico_destino_ids'], $dados['comentario'] ?? null
        );

        return response()->json($documento);
    }

    public function iniciarAnalise(Request $request, Documento $documento): JsonResponse
    {
        $documento = $this->workflow->iniciarAnalise($documento, $request->user());

        return response()->json($documento);
    }

    public function validarServico(Request $request, Documento $documento): JsonResponse
    {
        $documento = $this->workflow->validarServico($documento, $request->user());

        return response()->json($documento);
    }

    public function rejeitar(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('rejeitar', $documento);

        $dados = $request->validate(['justificacao' => ['required', 'string', 'min:5']]);
        $documento = $this->workflow->rejeitar($documento, $request->user(), $dados['justificacao']);

        return response()->json($documento);
    }

    public function arquivar(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('arquivar', $documento);
        $documento = $this->workflow->arquivar($documento, $request->user());

        return response()->json($documento);
    }

    public function historico(Documento $documento): JsonResponse
    {
        $this->authorize('ver', $documento);

        return response()->json($documento->historicoEstados()->with('alteradoPor')->get());
    }

    /**
     * RF009: numero de registo unico, gerado de forma atomica mesmo com
     * varios utilizadores em concorrencia (RNF001). Usa lockForUpdate()
     * sobre a tabela numero_registo_sequencias — portavel entre PostgreSQL
     * (producao) e MySQL/MariaDB (desenvolvimento, ex.: XAMPP).
     */
    private function gerarNumeroRegisto(): string
    {
        $ano = now()->year;

        $sequencia = DB::transaction(function () use ($ano) {
            $linha = DB::table('numero_registo_sequencias')
                ->where('ano', $ano)
                ->lockForUpdate()
                ->first();

            if (! $linha) {
                DB::table('numero_registo_sequencias')->insert(['ano' => $ano, 'ultimo_numero' => 0]);
            }

            $proximo = ($linha->ultimo_numero ?? 0) + 1;

            DB::table('numero_registo_sequencias')->where('ano', $ano)->update(['ultimo_numero' => $proximo]);

            return $proximo;
        });

        return sprintf('SGD-%d-%06d', $ano, $sequencia);
    }
}
