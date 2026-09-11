<?php

namespace App\Policies;

use App\Models\Utilizador;

class ServicoPolicy
{
    /**
     * Gestão de serviços (criar, ativar/desativar, editar) — reservada
     * ao SADMIN. A listagem dos serviços ativos, usada pelo Ministro
     * para encaminhar documentos, não passa por esta policy (ver
     * ServicoController::index, acessível a qualquer utilizador
     * autenticado).
     */
    public function gerir(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('SADMIN');
    }
}
