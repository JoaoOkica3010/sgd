<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guarda o estado do documento no momento em que a observação foi
     * criada, para suportar a regra de negócio do frontend: uma observação
     * só é editável/elimínavel pelo autor enquanto o documento não mudar
     * de estado desde então.
     */
    public function up(): void
    {
        Schema::table('comentarios', function (Blueprint $table) {
            $table->string('estado_criacao')->nullable()->after('texto');
        });

        // Backfill: comentários já existentes assumem o estado atual do
        // respetivo documento, por não termos o valor histórico exato.
        DB::table('comentarios')
            ->join('documentos', 'documentos.id', '=', 'comentarios.documento_id')
            ->update(['comentarios.estado_criacao' => DB::raw('documentos.estado_atual')]);
    }

    public function down(): void
    {
        Schema::table('comentarios', function (Blueprint $table) {
            $table->dropColumn('estado_criacao');
        });
    }
};
