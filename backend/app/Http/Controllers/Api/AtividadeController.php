<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Documento;
use Illuminate\Http\Request;

/**
 * Alimenta o painel "Atividade" do Dashboard: um resumo, em português
 * simples, das últimas ações registadas em "auditoria" (RNF006).
 *
 * Não expõe login/logout nem endereços IP — isso fica reservado à
 * consulta de auditoria administrativa (AuditoriaController, gate
 * "administrar"). Aqui mostram-se só ações sobre documentos, visíveis a
 * qualquer utilizador autenticado, alinhado com a visibilidade já aberta
 * de DocumentoPolicy::ver().
 */
class AtividadeController extends Controller
{
    private const ACOES_VISIVEIS = ['criar_documento', 'transicao_estado', 'reabertura_processo', 'assinar_documento'];

    /**
     * Frase (sem sujeito nem número de registo, que o frontend acrescenta)
     * para cada transição "estado_anterior->estado_novo" do workflow.
     */
    private const FRASES_TRANSICAO = [
        'recepcao->submetido' => 'submeteu o documento',
        'submetido->validado_secretariado' => 'validou (Secretariado) o documento',
        'submetido->recepcao' => 'devolveu à Receção o documento',
        'validado_secretariado->validado_chefe_gabinete' => 'validou (Chefe de Gabinete) o documento',
        'validado_secretariado->submetido' => 'devolveu ao Secretariado o documento',
        'validado_chefe_gabinete->encaminhado' => 'encaminhou o documento',
        'encaminhado->em_analise' => 'iniciou a análise do documento',
        'em_analise->validado_servico' => 'validou (serviço) o documento',
        'validado_servico->arquivado' => 'arquivou o documento',
        'arquivado->validado_servico' => 'desarquivou o documento',
    ];

    /**
     * GET /atividade/recente
     */
    public function recente(Request $request)
    {
        $limite = min(max((int) $request->input('limite', 15), 1), 50);

        $registos = Auditoria::query()
            ->whereIn('acao', self::ACOES_VISIVEIS)
            ->with('utilizador:id,nome')
            ->orderByDesc('ocorrido_em')
            ->limit($limite)
            ->get();

        $documentos = Documento::query()
            ->whereIn('id', $registos->where('entidade_afetada', 'documentos')->pluck('entidade_id')->unique())
            ->get(['id', 'numero_registo'])
            ->keyBy('id');

        return $registos->map(fn (Auditoria $registo) => [
            'id' => $registo->id,
            'utilizador' => $registo->utilizador?->nome ?? 'Utilizador removido',
            'descricao' => $this->descrever($registo),
            'documento' => $registo->entidade_afetada === 'documentos'
                ? $documentos->get($registo->entidade_id)?->only(['id', 'numero_registo'])
                : null,
            'ocorrido_em' => $registo->ocorrido_em,
        ])->values();
    }

    private function descrever(Auditoria $registo): string
    {
        return match ($registo->acao) {
            'criar_documento' => 'criou o documento',
            'assinar_documento' => 'assinou digitalmente o documento',
            'reabertura_processo' => 'reabriu o processo do documento',
            'transicao_estado' => $this->descreverTransicao($registo),
            default => $registo->acao,
        };
    }

    private function descreverTransicao(Auditoria $registo): string
    {
        $anterior = $registo->detalhes['estado_anterior'] ?? null;
        $novo = $registo->detalhes['estado_novo'] ?? null;

        if ($novo === Documento::ESTADO_REJEITADO) {
            return 'rejeitou o documento';
        }

        return self::FRASES_TRANSICAO["{$anterior}->{$novo}"] ?? "alterou o estado do documento para \"{$novo}\"";
    }
}
