<?php

namespace App\Policies;

use App\Models\Utilizador;

class UtilizadorPolicy
{
    /**
     * Gate único usado hoje só por RelatorioController — apesar do nome,
     * não abrange gestão de utilizadores/serviços (essa não usa este
     * gate; ver rotas de administração em routes/api.php). Reservado ao
     * SADMIN, ao ADMIN, e por autoridade hierárquica ao MIN e SG; o CG
     * ganha acesso aqui também, por ser agora responsável por uma
     * apreciação formal no circuito (novo estado "Validado (Chefe de
     * Gabinete)", ver WorkflowService).
     */
    public function administrar(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('SADMIN', 'ADMIN', 'MIN', 'SG', 'CG');
    }
}
