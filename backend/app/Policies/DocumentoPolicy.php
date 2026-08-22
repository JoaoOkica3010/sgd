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

    public function ver(Utilizador $utilizador, Documento $documento): bool
    {
        if ($utilizador->possuiPerfil('ARQ')) {
            return in_array($documento->estado_atual, [
                Documento::ESTADO_VALIDADO_SERVICO,
                Documento::ESTADO_ARQUIVADO,
            ], true);
        }

        if ($utilizador->possuiPerfil('RECEP')) {
            return $documento->criado_por === $utilizador->id;
        }

        if ($utilizador->possuiPerfil('SECR')) {
            return true;
        }

        if ($utilizador->possuiPerfil('MIN')) {
            return in_array($documento->estado_atual, [
                Documento::ESTADO_VALIDADO_SECRETARIADO,
                Documento::ESTADO_ENCAMINHADO,
            ], true);
        }

        return $documento->servico_destino_id === $utilizador->perfil_id
            || $documento->encaminhamentos()->where('servico_destino_id', $utilizador->perfil_id)->exists();
    }

    public function criar(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('RECEP', 'SECR');
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

        return $documento->servico_destino_id === $utilizador->perfil_id;
    }

    public function validarSecretariado(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('SECR') && $documento->estado_atual === Documento::ESTADO_SUBMETIDO;
    }

    public function encaminhar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('MIN') && $documento->estado_atual === Documento::ESTADO_VALIDADO_SECRETARIADO;
    }

    public function arquivar(Utilizador $utilizador, Documento $documento): bool
    {
        return $utilizador->possuiPerfil('ARQ') && $documento->estado_atual === Documento::ESTADO_VALIDADO_SERVICO;
    }

    public function rejeitar(Utilizador $utilizador, Documento $documento): bool
    {
        return ! $utilizador->possuiPerfil('RECEP', 'ARQ');
    }
}