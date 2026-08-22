<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabela "perfis": os 14 servicos/cargos do Ministerio (secao 4 do
     * Documento de Analise de Requisitos) + as respetivas permissoes.
     */
    public function up(): void
    {
        Schema::create('perfis', function (Blueprint $table) {
            $table->id();
            $table->string('sigla', 10)->unique();   // RECEP, SECR, MIN, ...
            $table->string('nome_servico', 150);
            $table->json('permissoes')->default('{}'); // JSON (compativel com MySQL e PostgreSQL)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perfis');
    }
};
