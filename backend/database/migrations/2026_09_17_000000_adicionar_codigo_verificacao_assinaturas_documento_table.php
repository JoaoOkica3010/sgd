<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Código curto, único, que acompanha a assinatura na Ficha (texto +
     * QR) e permite a qualquer pessoa confirmar, numa página pública sem
     * autenticação, que existe mesmo um registo de assinatura com aquele
     * código — sem expor o conteúdo do documento.
     */
    public function up(): void
    {
        Schema::table('assinaturas_documento', function (Blueprint $table) {
            $table->string('codigo_verificacao', 20)->nullable()->unique()->after('hash_documento');
        });
    }

    public function down(): void
    {
        Schema::table('assinaturas_documento', function (Blueprint $table) {
            $table->dropColumn('codigo_verificacao');
        });
    }
};
