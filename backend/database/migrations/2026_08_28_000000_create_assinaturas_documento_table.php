<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registo simples de assinatura: quem assinou, quando, e um hash SHA-256
     * dos dados canónicos do documento nesse momento (para deteção de
     * alterações posteriores). Não é uma assinatura digital qualificada
     * (PAdES/CAdES) — essa exigiria integração com uma entidade
     * certificadora externa, fora do âmbito atual.
     */
    public function up(): void
    {
        Schema::create('assinaturas_documento', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('documento_id')->constrained('documentos')->cascadeOnDelete();
            $table->foreignUuid('utilizador_id')->constrained('utilizadores');
            $table->string('hash_documento', 64);
            $table->timestamp('assinado_em');

            // Um documento só pode ter uma assinatura ativa de cada vez
            // (regra de negócio: podeAssinar exige !assinatura).
            $table->unique('documento_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assinaturas_documento');
    }
};
