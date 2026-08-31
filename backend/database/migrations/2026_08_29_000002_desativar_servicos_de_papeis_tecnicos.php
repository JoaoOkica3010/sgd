<?php

use App\Models\Perfil;
use App\Models\Servico;
use Illuminate\Database\Migrations\Migration;

/**
 * Corrige instalações que já correram a migration
 * 2026_08_29_000001_criar_servicos_e_migrar_dados na sua versão original,
 * que criava (por engano) um "serviço" de destino também para RECEP,
 * SECR, MIN e ARQ. Estes são perfis de fluxo de trabalho com lógica
 * própria (ver DocumentoPolicy/DocumentoController) — nunca são um
 * destino de encaminhamento escolhido pelo Ministro.
 *
 * Numa instalação nova (que já corre a versão corrigida da migration
 * 2026_08_29_000001 e do ServicoSeeder), esta migration não encontra
 * nada para corrigir e não faz nada.
 *
 * Os serviços são DESATIVADOS, não eliminados — preserva o histórico de
 * qualquer documento que já lhes tenha sido encaminhado.
 */
return new class extends Migration
{
    public function up(): void
    {
        $siglasTecnicas = ['RECEP', 'SECR', 'MIN', 'ARQ'];

        Perfil::whereIn('sigla', $siglasTecnicas)->whereNotNull('servico_id')->get()->each(function (Perfil $perfil) {
            Servico::where('id', $perfil->servico_id)->update(['ativo' => false]);
            $perfil->update(['servico_id' => null]);
        });
    }

    public function down(): void
    {
        // Não reversível de forma segura (não sabemos se o serviço estava
        // ativo antes desta correção nem se o SADMIN o reativou depois
        // por outro motivo entretanto) — não faz nada.
    }
};
