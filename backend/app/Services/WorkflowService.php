<?php

namespace App\Services;

use App\Exceptions\TransicaoInvalidaException;
use App\Models\Auditoria;
use App\Models\Documento;
use App\Models\EstadoDocumento;
use App\Models\Utilizador;
use Illuminate\Support\Facades\DB;

/**
 * Máquina de estados do workflow do SGD (DOC05 - Máquina de Estados do Workflow).
 *
 * Todas as transições de estado de um Documento DEVEM passar por aqui.
 * Nenhum controller deve alterar `estado_atual` diretamente.
 */
class WorkflowService
{
    /**
     * Tabela de transições (secção 4 do DOC05).
     * Cada entrada: estado_origem => [ estado_destino => callable(Documento, Utilizador): bool ]
     * O callable determina se o utilizador tem o perfil "responsável" pela transição.
     */
    private function transicoes(): array
    {
        return [
            'recepcao' => [
                'submetido' => fn (Documento $doc, Utilizador $u) =>
                    in_array($u->perfil?->sigla, ['RECEP', 'SECR'], true),
            ],
            'submetido' => [
                'validado_secretariado' => fn (Documento $doc, Utilizador $u) =>
                    $u->perfil?->sigla === 'SECR',
            ],
            'validado_secretariado' => [
                'encaminhado' => fn (Documento $doc, Utilizador $u) =>
                    $u->perfil?->sigla === 'MIN',
            ],
            'encaminhado' => [
                'em_analise' => fn (Documento $doc, Utilizador $u) =>
                    $doc->servico_destino_id !== null && $u->perfil_id === $doc->servico_destino_id,
            ],
            'em_analise' => [
                'validado_servico' => fn (Documento $doc, Utilizador $u) =>
                    $doc->servico_destino_id !== null && $u->perfil_id === $doc->servico_destino_id,
            ],
            'validado_servico' => [
                'arquivado' => fn (Documento $doc, Utilizador $u) =>
                    $u->perfil?->sigla === 'ARQ',
            ],
        ];
    }

    /**
     * Estados a partir dos quais é possível rejeitar (qualquer estado "ativo",
     * ou seja, tudo exceto arquivado e o próprio rejeitado).
     */
    private const ESTADOS_REJEITAVEIS = [
        'recepcao', 'submetido', 'validado_secretariado',
        'encaminhado', 'em_analise', 'validado_servico',
    ];

    public function transicoesPossiveis(Documento $documento): array
    {
        return array_keys($this->transicoes()[$documento->estado_atual] ?? []);
    }

    /**
     * Reabre um documento rejeitado, devolvendo-o exatamente ao estado em
     * que estava antes da rejeição (não a um estado fixo) — determinado a
     * partir da entrada de histórico imediatamente anterior à rejeição
     * mais recente. Reservado a MIN e ADMIN.
     *
     * @throws TransicaoInvalidaException
     */
    public function reabrir(Documento $documento, Utilizador $utilizador, string $motivo): Documento
    {
        if ($documento->estado_atual !== Documento::ESTADO_REJEITADO) {
            throw new TransicaoInvalidaException('Só é possível reabrir documentos rejeitados.');
        }

        if (! in_array($utilizador->perfil?->sigla, ['MIN', 'ADMIN'], true)) {
            throw new TransicaoInvalidaException('Não tem permissão para reabrir este documento.');
        }

        $estadoDestino = $this->estadoAntesDaRejeicao($documento);

        if ($estadoDestino === null) {
            throw new TransicaoInvalidaException('Não foi possível determinar o estado anterior à rejeição.');
        }

        return DB::transaction(function () use ($documento, $estadoDestino, $utilizador, $motivo) {
            $documento->estado_atual = $estadoDestino;
            $documento->save();

            EstadoDocumento::create([
                'documento_id' => $documento->id,
                'estado' => $estadoDestino,
                'alterado_por' => $utilizador->id,
                'justificacao' => $motivo,
                'alterado_em' => now(),
            ]);

            Auditoria::create([
                'utilizador_id' => $utilizador->id,
                'acao' => 'reabertura_processo',
                'entidade_afetada' => 'documentos',
                'entidade_id' => $documento->id,
                'detalhes' => [
                    'estado_anterior' => Documento::ESTADO_REJEITADO,
                    'estado_novo' => $estadoDestino,
                    'motivo' => $motivo,
                ],
                'ocorrido_em' => now(),
            ]);

            return $documento->fresh();
        });
    }

    /**
     * Encontra a entrada de histórico imediatamente anterior à rejeição
     * mais recente, para saber a que estado o documento deve regressar.
     */
    private function estadoAntesDaRejeicao(Documento $documento): ?string
    {
        $entradaRejeicao = $documento->historicoEstados()
            ->where('estado', Documento::ESTADO_REJEITADO)
            ->orderByDesc('alterado_em')
            ->first();

        if (! $entradaRejeicao) {
            return null;
        }

        $entradaAnterior = $documento->historicoEstados()
            ->where('alterado_em', '<', $entradaRejeicao->alterado_em)
            ->orderByDesc('alterado_em')
            ->first();

        return $entradaAnterior?->estado;
    }

    /**
     * Regista a entrada inicial no histórico (estado "recepção") no
     * momento em que o documento é criado. Sem isto, o histórico fica
     * vazio até à primeira transição real, e ecrãs que dependem dele
     * para saber "criado por" / "data de criação" ficam sem essa
     * informação enquanto o documento não muda de estado.
     */
    public function registarCriacao(Documento $documento, Utilizador $utilizador): void
    {
        EstadoDocumento::create([
            'documento_id' => $documento->id,
            'estado' => $documento->estado_atual,
            'alterado_por' => $utilizador->id,
            'justificacao' => null,
            'alterado_em' => now(),
        ]);
    }

    /**
     * Verifica se o utilizador pode executar a transição, sem a executar.
     */
    public function podeTransitar(Documento $documento, string $novoEstado, Utilizador $utilizador): bool
    {
        if ($novoEstado === 'rejeitado') {
            return $this->podeRejeitar($documento, $utilizador);
        }

        $regra = $this->transicoes()[$documento->estado_atual][$novoEstado] ?? null;

        return $regra !== null && $regra($documento, $utilizador);
    }

    private function podeRejeitar(Documento $documento, Utilizador $utilizador): bool
    {
        if (! in_array($documento->estado_atual, self::ESTADOS_REJEITAVEIS, true)) {
            return false;
        }

        // "Qualquer serviço envolvido": quem criou, o serviço de destino atual, ou MIN/SECR.
        return $utilizador->id === $documento->criado_por
            || $utilizador->perfil_id === $documento->servico_destino_id
            || in_array($utilizador->perfil?->sigla, ['MIN', 'SECR'], true);
    }

    /**
     * Executa a transição: valida, atualiza o documento, regista o histórico
     * (estados_documento), regista auditoria e, se aplicável, guarda a justificação.
     *
     * @throws TransicaoInvalidaException
     */
    public function transitar(
        Documento $documento,
        string $novoEstado,
        Utilizador $utilizador,
        ?string $justificacao = null,
    ): Documento {
        if (! in_array($novoEstado, Documento::ESTADOS, true)) {
            throw new TransicaoInvalidaException("Estado \"{$novoEstado}\" desconhecido.");
        }

        if ($novoEstado === 'rejeitado' && ! $justificacao) {
            throw new TransicaoInvalidaException('A rejeição exige justificação obrigatória.');
        }

        if (! $this->podeTransitar($documento, $novoEstado, $utilizador)) {
            throw new TransicaoInvalidaException(
                "Transição de \"{$documento->estado_atual}\" para \"{$novoEstado}\" não é permitida para o perfil {$utilizador->perfil?->sigla}."
            );
        }

        return DB::transaction(function () use ($documento, $novoEstado, $utilizador, $justificacao) {
            $estadoAnterior = $documento->estado_atual;

            $documento->estado_atual = $novoEstado;
            $documento->save();

            EstadoDocumento::create([
                'documento_id' => $documento->id,
                'estado' => $novoEstado,
                'alterado_por' => $utilizador->id,
                'justificacao' => $justificacao,
                'alterado_em' => now(),
            ]);

            Auditoria::create([
                'utilizador_id' => $utilizador->id,
                'acao' => 'transicao_estado',
                'entidade_afetada' => 'documentos',
                'entidade_id' => $documento->id,
                'detalhes' => [
                    'estado_anterior' => $estadoAnterior,
                    'estado_novo' => $novoEstado,
                ],
                'ocorrido_em' => now(),
            ]);

            // TODO: despachar notificação assíncrona (RF015) quando novoEstado
            // for 'encaminhado' ou 'rejeitado' — via fila (Redis em produção,
            // 'sync' em desenvolvimento local com XAMPP, ver QUEUE_CONNECTION no .env).

            return $documento->fresh();
        });
    }
}
