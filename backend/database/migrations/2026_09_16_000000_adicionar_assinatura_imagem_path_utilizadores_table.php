<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Caminho, no disco de armazenamento configurado, para a imagem da
     * assinatura física digitalizada do utilizador (PNG/JPEG, fundo de
     * preferência transparente). Puramente visual — reforça o selo já
     * existente em assinaturas_documento, não substitui o hash que prova
     * a autenticidade.
     */
    public function up(): void
    {
        Schema::table('utilizadores', function (Blueprint $table) {
            $table->string('assinatura_imagem_path')->nullable()->after('duplo_fator_segredo');
        });
    }

    public function down(): void
    {
        Schema::table('utilizadores', function (Blueprint $table) {
            $table->dropColumn('assinatura_imagem_path');
        });
    }
};
