<?php

namespace App\Policies;

use App\Models\Documento;
use App\Models\Utilizador;

class DocumentoPolicy
{
    public function verQualquer(Utilizador $utilizador): bool
    {
        return true;
    }

    /**
     * Ver o detalhe de um documento: qualquer utilizador autenticado pode
     * consultar qualquer documento (alinhado com a listagem, que também
     * não filtra por perfil/estado — ver DocumentoController::index()).
     * As ações sobre o documento (submeter, validar, encaminhar, arquivar,
     * rejeitar, etc.) continuam restritas por perfil/estado nos métodos
     * abaixo — só a visualização deixou de ser filtrada.
     */
    public function ver(Utilizador $utilizador, Documento $documento): bool
    {
        return true;
    }

    public function criar(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('RECEP', 'SECR', 'ADMIN');
    }

    /**
     * Primeira transição do workflow: recepcao -> submetido.
     * Mesma regra já prevista em WorkflowService::transicoes().
     */
    public function submeter(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('RECEP', 'SECR')
            && $documento->estado_atual === Documento::ESTADO_RECEPCAO;
    }

    public function editar(Utilizador $utilizador, Documento $documento): bool
    {
        if (! $documento->editavel()) {
            return false;
        }

        if ($utilizador->possuiPerfil('RECEP', 'SECR')) {
            if ($utilizador->possuiPerfil('RECEP')) {
                return $documento->estado_atual === Documento::ESTADO_RECEPCAO;
            }

            return in_array($documento->estado_atual, [
                Documento::ESTADO_RECEPCAO,
                Documento::ESTADO_SUBMETIDO,
            ], true);
        }

        $servicoId = $utilizador->perfil?->servico_id;

        return $servicoId !== null && $documento->servico_destino_id === $servicoId;
    }

    public function validarSecretariado(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('SECR') && $documento->estado_atual === Documento::ESTADO_SUBMETIDO;
    }

    /**
     * DEVOLVER (SECR -> Receção): correção simples, sem justificação
     * obrigatória. Distinto de rejeitar() — ver nota em WorkflowService::transicoes().
     */
    public function devolverRececao(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('SECR') && $documento->estado_atual === Documento::ESTADO_SUBMETIDO;
    }

    /**
     * VALIDAR (Chefe de Gabinete): novo estado intercalado entre a SECR e
     * o MIN. O perfil CG já existe no SGD como Serviço/Departamento
     * pós-MIN (ver PerfilSeeder/ServicoSeeder) — esta é uma segunda
     * atuação do mesmo perfil, agora antes da decisão do Ministro.
     */
    public function validarChefeGabinete(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('CG') && $documento->estado_atual === Documento::ESTADO_VALIDADO_SECRETARIADO;
    }

    /**
     * DEVOLVER (CG -> SECR): mesma lógica leve de devolverRececao().
     */
    public function devolverSecr(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('CG') && $documento->estado_atual === Documento::ESTADO_VALIDADO_SECRETARIADO;
    }

    public function encaminhar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('MIN') && $documento->estado_atual === Documento::ESTADO_VALIDADO_CG;
    }

    /**
     * Assinatura digital simples pelo Ministro, no mesmo estado em que
     * pode encaminhar. Um documento só pode ter uma assinatura ativa de
     * cada vez (ver migration de assinaturas_documento) — mesma regra já
     * aplicada no frontend (DetalheDocumento.tsx: podeAssinar).
     */
    public function assinar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('MIN')
            && $documento->estado_atual === Documento::ESTADO_VALIDADO_CG
            && ! $documento->assinatura()->exists();
    }

    public function arquivar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('ARQ') && $documento->estado_atual === Documento::ESTADO_VALIDADO_SERVICO;
    }

    public function desarquivar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('ARQ') && $documento->estado_atual === Documento::ESTADO_ARQUIVADO;
    }

    /**
     * Serviço de destino começa a analisar: encaminhado -> em_analise.
     * Mesma regra de "âmbito sobre o serviço" usada em ver()/editar().
     */
    public function iniciarAnalise(Utilizador $utilizador, Documento $documento): bool
    {
        $servicoId = $utilizador->perfil?->servico_id;

        return $documento->estado_atual === Documento::ESTADO_ENCAMINHADO
            && $servicoId !== null && $documento->servico_destino_id === $servicoId;
    }

    /**
     * Serviço de destino conclui a análise: em_analise -> validado_servico.
     */
    public function validarServico(Utilizador $utilizador, Documento $documento): bool
    {
        $servicoId = $utilizador->perfil?->servico_id;

        return $documento->estado_atual === Documento::ESTADO_EM_ANALISE
            && $servicoId !== null && $documento->servico_destino_id === $servicoId;
    }

    public function rejeitar(Utilizador $utilizador, Documento $documento): bool
    {
        if ($documento->estado_atual === Documento::ESTADO_SUBMETIDO) {
            return $utilizador->possuiPerfil('SECR');
        }

        if (in_array($documento->estado_atual, [Documento::ESTADO_ENCAMINHADO, Documento::ESTADO_EM_ANALISE], true)) {
            return ! $utilizador->possuiPerfil('RECEP', 'SECR', 'MIN', 'ARQ', 'CONSULTA');
        }

        return false;
    }

    /**
     * Reabrir um documento rejeitado, devolvendo-o ao estado anterior à
     * rejeição. Reservado a MIN e ADMIN.
     */
    public function reabrir(Utilizador $utilizador, Documento $documento): bool
    {
        return $documento->estado_atual === Documento::ESTADO_REJEITADO
            && $utilizador->possuiPerfil('MIN', 'ADMIN');
    }
}
