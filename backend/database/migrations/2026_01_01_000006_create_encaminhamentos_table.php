<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encaminhamentos', function (Blueprint $table) {
            $table->id();
            $table->uuid('documento_id');
            $table->foreign('documento_id')->references('id')->on('documentos')->cascadeOnDelete();

            $table->foreignId('servico_destino_id')->constrained('perfis')->restrictOnDelete();

            $table->uuid('encaminhado_por');
            $table->foreign('encaminhado_por')->references('id')->on('utilizadores')->restrictOnDelete();

            $table->timestamp('encaminhado_em')->useCurrent();

            $table->index('documento_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encaminhamentos');
    }
};
