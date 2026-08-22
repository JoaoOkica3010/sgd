<?php

namespace App\Services;

use App\Models\Auditoria;
use App\Models\Documento;
use App\Models\Encaminhamento;
use App\Models\EstadoDocumento;
use App\Models\Utilizador;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Motor de workflow do SGD.
 *
 * Implementa, como maquina de estados isolada (nao dispersa por
 * controladores), as transicoes definidas no documento
 * "Maquina de Estados do Workflow v1.0". Cada metodo publico corresponde
 * a uma transicao e e responsavel por:
 *   1. Validar que o perfil do utilizador pode executar a transicao;
 *   2. Validar a condicao de negocio associada;
 *   3. Aplicar a transicao e escrever uma entrada em estados_documento;
 *   4. Registar a acao em auditoria;
 *   5. Despachar notificacoes assincronas quando aplicavel (ver fila Redis).
 */
class WorkflowService
{
    /**
     * Tabela de transicoes: estado origem => [estado destino => [perfis autorizados]].
     * Reflete a seccao 4 do documento "Maquina de Estados do Workflow".
     */
    private const TRANSICOES = [
        Documento::ESTADO_RECEPCAO => [
            Documento::ESTADO_SUBMETIDO => ['RECEP', 'SECR'],
        ],
        Documento::ESTADO_SUBMETIDO => [
            Documento::ESTADO_VALIDADO_SECRETARIADO => ['SECR'],
            Documento::ESTADO_REJEITADO => ['SECR'],
        ],
        Documento::ESTADO_VALIDADO_SECRETARIADO => [
            Documento::ESTADO_ENCAMINHADO => ['MIN'],
        ],
        Documento::ESTADO_ENCAMINHADO => [
            Documento::ESTADO_EM_ANALISE => null, // qualquer servico de destino
            Documento::ESTADO_REJEITADO => null,
        ],
        Documento::ESTADO_EM_ANALISE => [
            Documento::ESTADO_VALIDADO_SERVICO => null, // servico de destino
            Documento::ESTADO_REJEITADO => null,
        ],
        Documento::ESTADO_VALIDADO_SERVICO => [
            Documento::ESTADO_ARQUIVADO => ['ARQ'],
        ],
        Documento::ESTADO_REJEITADO => [
            Documento::ESTADO_VALIDADO_SECRETARIADO => ['MIN', 'SECR'],
        ],
    ];

    public function submeter(Documento $documento, Utilizador $utilizador): Documento
    {
        return $this->transitar($documento, $utilizador, Documento::ESTADO_SUBMETIDO);
    }

    public function validarSecretariado(Documento $documento, Utilizador $utilizador): Documento
    {
        return $this->transitar($documento, $utilizador, Documento::ESTADO_VALIDADO_SECRETARIADO);
    }

    /**
     * RF013: encaminha para um ou varios servicos em simultaneo.
     * Cada servico avanca depois de forma independente pelos estados 4-6.
     */
    public function encaminhar(Documento $documento, Utilizador $utilizador, array $servicoDestinoIds, ?string $comentario = null): Documento
    {
        $this->garantirTransicaoPermitida($documento, Documento::ESTADO_ENCAMINHADO, $utilizador);

        return DB::transaction(function () use ($documento, $utilizador, $servicoDestinoIds, $comentario) {
            foreach ($servicoDestinoIds as $servicoId) {
                Encaminhamento::create([
                    'documento_id' => $documento->id,
                    'servico_destino_id' => $servicoId,
                    'encaminhado_por' => $utilizador->id,
                    'encaminhado_em' => now(),
                ]);
            }

            if ($comentario) {
                $documento->comentarios()->create([
                    'autor_id' => $utilizador->id,
                    'texto' => $comentario,
                    'criado_em' => now(),
                ]);
            }

            $this->registarEstado($documento, Documento::ESTADO_ENCAMINHADO, $utilizador);
            $this->despacharNotificacao($documento, 'encaminhado', $servicoDestinoIds);

            return $documento->fresh();
        });
    }

    public function iniciarAnalise(Documento $documento, Utilizador $utilizador): Documento
    {
        $this->garantirServicoDestinoAtual($documento, $utilizador);

        return $this->transitar($documento, $utilizador, Documento::ESTADO_EM_ANALISE, validarPerfil: false);
    }

    public function validarServico(Documento $documento, Utilizador $utilizador): Documento
    {
        $this->garantirServicoDestinoAtual($documento, $utilizador);

        return $this->transitar($documento, $utilizador, Documento::ESTADO_VALIDADO_SERVICO, validarPerfil: false);
    }

    public function arquivar(Documento $documento, Utilizador $utilizador): Documento
    {
        $documento = $this->transitar($documento, $utilizador, Documento::ESTADO_ARQUIVADO);
        Auditoria::registar($utilizador->id, 'arquivar_documento', 'documentos', $documento->id);

        return $documento;
    }

    /**
     * Rejeicao: disponivel a partir de varios estados, exige justificacao
     * obrigatoria e faz o documento retornar ao Ministro.
     */
    public function rejeitar(Documento $documento, Utilizador $utilizador, string $justificacao): Documento
    {
        if (trim($justificacao) === '') {
            throw new RuntimeException('A rejeicao exige justificacao obrigatoria.');
        }

        $origensPermitidas = [
            Documento::ESTADO_SUBMETIDO,
            Documento::ESTADO_ENCAMINHADO,
            Documento::ESTADO_EM_ANALISE,
        ];

        if (! in_array($documento->estado_atual, $origensPermitidas, true)) {
            throw new RuntimeException('Nao e possivel rejeitar um documento no estado atual.');
        }

        return DB::transaction(function () use ($documento, $utilizador, $justificacao) {
            $this->registarEstado($documento, Documento::ESTADO_REJEITADO, $utilizador, $justificacao);
            $this->despacharNotificacao($documento, 'rejeitado', [$documento->servico_destino_id]);
            Auditoria::registar($utilizador->id, 'rejeitar_documento', 'documentos', $documento->id, ['justificacao' => $justificacao]);

            return $documento->fresh();
        });
    }

    // ------------------------------------------------------------------
    // Metodos internos
    // ------------------------------------------------------------------

    private function transitar(Documento $documento, Utilizador $utilizador, string $estadoDestino, bool $validarPerfil = true): Documento
    {
        if ($validarPerfil) {
            $this->garantirTransicaoPermitida($documento, $estadoDestino, $utilizador);
        }

        return DB::transaction(function () use ($documento, $utilizador, $estadoDestino) {
            $this->registarEstado($documento, $estadoDestino, $utilizador);

            return $documento->fresh();
        });
    }

    private function registarEstado(Documento $documento, string $estadoDestino, Utilizador $utilizador, ?string $justificacao = null): void
    {
        $documento->update(['estado_atual' => $estadoDestino]);

        EstadoDocumento::create([
            'documento_id' => $documento->id,
            'estado' => $estadoDestino,
            'alterado_por' => $utilizador->id,
            'justificacao' => $justificacao,
            'alterado_em' => now(),
        ]);

        Auditoria::registar($utilizador->id, 'transicao_estado', 'documentos', $documento->id, [
            'estado_destino' => $estadoDestino,
        ]);
    }

    private function garantirTransicaoPermitida(Documento $documento, string $estadoDestino, Utilizador $utilizador): void
    {
        $transicoesDoEstado = self::TRANSICOES[$documento->estado_atual] ?? [];

        if (! array_key_exists($estadoDestino, $transicoesDoEstado)) {
            throw new RuntimeException(sprintf(
                'Transicao de "%s" para "%s" nao e permitida.',
                $documento->estado_atual,
                $estadoDestino
            ));
        }

        $perfisAutorizados = $transicoesDoEstado[$estadoDestino];

        if ($perfisAutorizados !== null && ! $utilizador->possuiPerfil(...$perfisAutorizados)) {
            throw new RuntimeException('O seu perfil nao tem permissao para executar esta transicao.');
        }
    }

    /** Garante que o utilizador pertence ao servico de destino do documento (RF013-RF017). */
    private function garantirServicoDestinoAtual(Documento $documento, Utilizador $utilizador): void
    {
        $ehDestino = Encaminhamento::where('documento_id', $documento->id)
            ->where('servico_destino_id', $utilizador->perfil_id)
            ->exists();

        if (! $ehDestino) {
            throw new RuntimeException('O seu servico nao e destinatario deste documento.');
        }
    }

    /** Despacha notificacao assincrona via fila Redis (RF015). */
    private function despacharNotificacao(Documento $documento, string $evento, array $servicoIds): void
    {
        dispatch(new \App\Jobs\NotificarServicoJob($documento->id, $evento, array_filter($servicoIds)))
            ->onQueue('notificacoes');
    }
}
