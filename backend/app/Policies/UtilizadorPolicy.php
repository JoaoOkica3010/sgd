<?php

namespace App\Policies;

use App\Models\Utilizador;

class UtilizadorPolicy
{
    /**
     * Administração de utilizadores — reservado ao perfil ADMIN
     * (perfil técnico dedicado à administração do sistema) e, por
     * autoridade hierárquica, também ao MIN e SG.
     */
    public function administrar(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('ADMIN', 'MIN', 'SG');
    }
}
