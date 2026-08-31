<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Introduz o conceito de "Serviço" como entidade independente do "Perfil"
 * de acesso do utilizador.
 *
 * Até aqui, a tabela "perfis" fazia dois papéis ao mesmo tempo: era o
 * perfil de acesso/permissões do utilizador (RECEP, SECR, MIN, ADMIN...)
 * E era a lista de destinos de encaminhamento (servico_destino_id em
 * "documentos" e "encaminhamentos" apontava diretamente para "perfis").
 *
 * Esta migration:
 *   1. Cria a tabela "servicos" (com o campo "ativo" que o SADMIN vai gerir).
 *   2. Copia os serviços existentes a partir de "perfis" (excluindo perfis
 *      técnicos como ADMIN/SADMIN, que não são um "serviço" de destino).
 *   3. Liga cada "perfil" ao seu "servico" correspondente (servico_id).
 *   4. Repõe o destino de encaminhamento em "documentos" e "encaminhamentos"
 *      para apontar para "servicos" em vez de "perfis", remapeando os
 *      valores já existentes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servicos', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 150)->unique();
            $table->text('descricao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->uuid('criado_por')->nullable();
            $table->foreign('criado_por')->references('id')->on('utilizadores')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('perfis', function (Blueprint $table) {
            $table->foreignId('servico_id')->nullable()->after('nome_servico')
                ->constrained('servicos')->nullOnDelete();
        });

        // ---- Migração de dados: perfis "de serviço" -> servicos ----
        // Perfis técnicos/de fluxo de trabalho que NÃO representam um
        // serviço de destino de encaminhamento: ADMIN/SADMIN administram
        // o sistema; RECEP, SECR, MIN e ARQ têm lógica própria e fixa no
        // workflow (ver DocumentoPolicy/DocumentoController) — nunca são
        // escolhidos pelo Ministro como destino de um encaminhamento.
        $siglasTecnicas = ['ADMIN', 'SADMIN', 'RECEP', 'SECR', 'MIN', 'ARQ'];

        $perfis = DB::table('perfis')->whereNotIn('sigla', $siglasTecnicas)->get(['id', 'nome_servico']);

        $mapaPerfilParaServico = []; // id de "perfis" (antigo servico_destino_id) => id de "servicos" (novo)

        foreach ($perfis as $perfil) {
            $servicoId = DB::table('servicos')->insertGetId([
                'nome' => $perfil->nome_servico,
                'ativo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $mapaPerfilParaServico[$perfil->id] = $servicoId;

            DB::table('perfis')->where('id', $perfil->id)->update(['servico_id' => $servicoId]);
        }

        // ---- Repor a FK de servico_destino_id: perfis -> servicos ----
        foreach (['documentos', 'encaminhamentos'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) use ($tabela) {
                $table->dropForeign(['servico_destino_id']);
            });

            foreach ($mapaPerfilParaServico as $antigoId => $novoId) {
                DB::table($tabela)->where('servico_destino_id', $antigoId)->update(['servico_destino_id' => $novoId]);
            }

            // Qualquer valor órfão (apontava para ADMIN/SADMIN, que não
            // migraram para "servicos"). Em "documentos" o campo é anulável,
            // por isso fica nulo; em "encaminhamentos" é obrigatório, pelo
            // que na prática nunca deveria apontar para um perfil técnico
            // (a UI só oferece serviços reais) — não há nada a corrigir aí.
            if ($tabela === 'documentos') {
                DB::table($tabela)
                    ->whereNotNull('servico_destino_id')
                    ->whereNotIn('servico_destino_id', array_values($mapaPerfilParaServico))
                    ->update(['servico_destino_id' => null]);
            }

            Schema::table($tabela, function (Blueprint $table) {
                $table->foreign('servico_destino_id')->references('id')->on('servicos')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['documentos', 'encaminhamentos'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->dropForeign(['servico_destino_id']);
            });

            Schema::table($tabela, function (Blueprint $table) {
                $table->foreign('servico_destino_id')->references('id')->on('perfis')->restrictOnDelete();
            });
        }

        Schema::table('perfis', function (Blueprint $table) {
            $table->dropConstrainedForeignId('servico_id');
        });

        Schema::dropIfExists('servicos');
    }
};
