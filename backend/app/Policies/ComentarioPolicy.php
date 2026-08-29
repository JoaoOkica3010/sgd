<?php

namespace App\Policies;

use App\Models\Comentario;
use App\Models\Documento;
use App\Models\Utilizador;

class ComentarioPolicy
{
    /**
     * RF016 — qualquer utilizador com âmbito sobre o documento pode
     * adicionar parecer, exceto em documentos já arquivados.
     */
    public function criar(Utilizador $utilizador, Documento $documento): bool
    {
        if ($documento->estado_atual === Documento::ESTADO_ARQUIVADO) {
            return false;
        }

        return app(DocumentoPolicy::class)->ver($utilizador, $documento);
    }

    public function ver(Utilizador $utilizador, Comentario $comentario): bool
    {
        return app(DocumentoPolicy::class)->ver($utilizador, $comentario->documento);
    }

    /**
     * Só o próprio autor, e só enquanto o documento não tiver mudado de
     * estado desde que a observação foi escrita (mesmo que volte depois
     * ao mesmo estado — por isso comparamos com o histórico, não só com
     * o estado_atual).
     */
    public function editar(Utilizador $utilizador, Comentario $comentario): bool
    {
        if ($comentario->autor_id !== $utilizador->id) {
            return false;
        }

        return ! $comentario->documento->historicoEstados()
            ->where('alterado_em', '>', $comentario->criado_em)
            ->exists();
    }

    public function eliminar(Utilizador $utilizador, Comentario $comentario): bool
    {
        return $this->editar($utilizador, $comentario);
    }
}
