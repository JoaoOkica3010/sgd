<?php

namespace App\Policies;

use App\Models\Utilizador;

class UtilizadorPolicy
{
    /**
     * Gate usada só por RelatorioController — o separador "Relatórios"
     * do Dashboard é mostrado a qualquer utilizador autenticado, por
     * isso esta gate cobre a autoridade hierárquica para ver relatórios
     * agregados (não documentos individuais, que seguem DocumentoPolicy).
     * O CG ganha acesso aqui também, por ser responsável por uma
     * apreciação formal no circuito ("Validado (Chefe de Gabinete)",
     * ver WorkflowService).
     *
     * Não confundir com administrarUtilizadores() abaixo — essa é que
     * controla criar/editar utilizadores e assinaturas digitalizadas.
     */
    public function administrar(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('SADMIN', 'ADMIN', 'MIN', 'SG', 'CG');
    }

    /**
     * Gate usada por UtilizadorController (criar/editar utilizadores,
     * ativar/desativar, assinatura digitalizada) — reservada a SADMIN e
     * ADMIN, alinhada com a página de administração no frontend, que só
     * é mostrada a esses perfis.
     */
    public function administrarUtilizadores(Utilizador $utilizador): bool
    {
        return $utilizador->possuiPerfil('SADMIN', 'ADMIN');
    }
}
