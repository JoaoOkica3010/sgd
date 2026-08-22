<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Historico completo de transicoes de estado (RF017, RF022).
     * Nunca e' atualizada nem apagada - apenas insercao (append-only).
     */
    public function up(): void
    {
        Schema::create('estados_documento', function (Blueprint $table) {
            $table->id();
            $table->uuid('documento_id');
            $table->foreign('documento_id')->references('id')->on('documentos')->cascadeOnDelete();

            $table->string('estado', 30);

            $table->uuid('alterado_por');
            $table->foreign('alterado_por')->references('id')->on('utilizadores')->restrictOnDelete();

            $table->text('justificacao')->nullable(); // obrigatoria apenas para rejeicao
            $table->timestamp('alterado_em')->useCurrent();

            $table->index(['documento_id', 'alterado_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estados_documento');
    }
};
