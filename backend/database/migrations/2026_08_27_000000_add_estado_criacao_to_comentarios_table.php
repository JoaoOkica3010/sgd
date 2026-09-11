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
        //
        // DB::table()->join()->update() com uma coluna da tabela juntada no
        // SET só funciona em MySQL (gera "UPDATE a JOIN b ... SET a.x = b.y").
        // Em PostgreSQL e SQLite o query builder tem de gerar sintaxes
        // diferentes (UPDATE ... FROM / subquery), por isso a query é
        // escrita à mão para cada motor — mesmo padrão já usado em
        // DocumentoController::index() para a pesquisa full-text.
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('
                UPDATE comentarios
                SET estado_criacao = documentos.estado_atual
                FROM documentos
                WHERE documentos.id = comentarios.documento_id
            ');
        } elseif ($driver === 'sqlite') {
            DB::statement('
                UPDATE comentarios
                SET estado_criacao = (
                    SELECT estado_atual FROM documentos WHERE documentos.id = comentarios.documento_id
                )
                WHERE EXISTS (SELECT 1 FROM documentos WHERE documentos.id = comentarios.documento_id)
            ');
        } else {
            DB::table('comentarios')
                ->join('documentos', 'documentos.id', '=', 'comentarios.documento_id')
                ->update(['comentarios.estado_criacao' => DB::raw('documentos.estado_atual')]);
        }
    }

    public function down(): void
    {
        Schema::table('comentarios', function (Blueprint $table) {
            $table->dropColumn('estado_criacao');
        });
    }
};
