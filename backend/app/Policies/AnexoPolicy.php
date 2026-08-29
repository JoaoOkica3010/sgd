<?php

namespace App\Policies;

use App\Models\Anexo;
use App\Models\Documento;
use App\Models\Utilizador;

class AnexoPolicy
{
    /**
     * Quem pode carregar anexos para um documento (RF007).
     * Mesma regra de "editar" documento: só antes de arquivado,
     * e só quem tem responsabilidade sobre o documento nesse estado.
     */
    public function carregar(Utilizador $utilizador, Documento $documento): bool
    {
        if (! $documento->editavel()) {
            return false;
        }

        if ($utilizador->possuiPerfil('RECEP', 'SECR', 'ADMIN')) {
            return true;
        }

        return $documento->servico_destino_id === $utilizador->perfil_id;
    }

    /**
     * Quem pode ver/descarregar um anexo — mesma regra de "ver" o documento.
     */
    public function ver(Utilizador $utilizador, Anexo $anexo): bool
    {
        return app(DocumentoPolicy::class)->ver($utilizador, $anexo->documento);
    }

    /**
     * DELETE apenas antes de validação (estado recepcao/submetido).
     */
    public function apagar(Utilizador $utilizador, Anexo $anexo): bool
    {
        if (! in_array($anexo->documento->estado_atual, [
            Documento::ESTADO_RECEPCAO,
            Documento::ESTADO_SUBMETIDO,
        ], true)) {
            return false;
        }

        return $utilizador->possuiPerfil('RECEP', 'SECR', 'ADMIN');
    }
}
