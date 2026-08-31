<?php

namespace Database\Seeders;

use App\Models\Perfil;
use App\Models\Servico;
use Illuminate\Database\Seeder;

/**
 * Popula "servicos" a partir dos perfis "de departamento" — exclui os
 * perfis técnicos/de fluxo de trabalho (ADMIN, SADMIN, RECEP, SECR, MIN,
 * ARQ), que nunca são um destino de encaminhamento escolhido pelo
 * Ministro — e liga cada perfil de departamento ao seu serviço.
 *
 * Complementa a migration 2026_08_29_000001_criar_servicos_e_migrar_dados:
 * essa migration só migra dados que já existiam em "perfis" no momento
 * em que corre (útil para uma instalação a ser atualizada). Numa
 * instalação nova, "perfis" só é populada por PerfilSeeder, que corre
 * depois das migrations — por isso este seeder trata desse caso.
 */
class ServicoSeeder extends Seeder
{
    public function run(): void
    {
        $siglasTecnicas = ['ADMIN', 'SADMIN', 'RECEP', 'SECR', 'MIN', 'ARQ'];

        Perfil::whereNotIn('sigla', $siglasTecnicas)->whereNull('servico_id')->get()->each(function (Perfil $perfil) {
            $servico = Servico::firstOrCreate(
                ['nome' => $perfil->nome_servico],
                ['ativo' => true]
            );

            $perfil->update(['servico_id' => $servico->id]);
        });
    }
}
