<?php

namespace App\Policies;

use App\Models\Utilizador;

class ConfiguracaoInstituicaoPolicy
{
    public function gerir(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('SADMIN');
    }
}
