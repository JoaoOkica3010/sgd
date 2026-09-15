<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Insere o novo estado "validado_chefe_gabinete" na lista de valores
 * permitidos para documentos.estado_atual, entre "validado_secretariado"
 * e "encaminhado" (ver App\Models\Documento::ESTADOS e
 * App\Services\WorkflowService).
 *
 * A coluna foi criada com Schema::enum() (migration
 * 2026_01_01_000003_create_documentos_table), que em MySQL gera um ENUM
 * nativo e em PostgreSQL gera uma CHECK constraint — por isso as duas
 * bases de dados são tratadas separadamente, tal como já acontece nessa
 * migration original para o índice de pesquisa de texto completo.
 */
return new class extends Migration
{
    private const ESTADOS_ANTERIORES = [
        'recepcao',
        'submetido',
        'validado_secretariado',
        'encaminhado',
        'em_analise',
        'validado_servico',
        'arquivado',
        'rejeitado',
    ];

    private const ESTADOS_NOVOS = [
        'recepcao',
        'submetido',
        'validado_secretariado',
        'validado_chefe_gabinete',
        'encaminhado',
        'em_analise',
        'validado_servico',
        'arquivado',
        'rejeitado',
    ];

    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            $lista = "'".implode("','", self::ESTADOS_NOVOS)."'";
            DB::statement("ALTER TABLE documentos MODIFY estado_atual ENUM({$lista}) NOT NULL DEFAULT 'recepcao'");

            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            $this->substituirCheckPostgres(self::ESTADOS_NOVOS);
        }
    }

    public function down(): void
    {
        // Documentos já no novo estado regressam a "validado_secretariado"
        // (o estado imediatamente anterior no circuito) antes de o valor
        // deixar de ser permitido pela coluna — sem isto, o down() falharia
        // com dados presentes.
        DB::table('documentos')
            ->where('estado_atual', 'validado_chefe_gabinete')
            ->update(['estado_atual' => 'validado_secretariado']);

        if (DB::getDriverName() === 'mysql') {
            $lista = "'".implode("','", self::ESTADOS_ANTERIORES)."'";
            DB::statement("ALTER TABLE documentos MODIFY estado_atual ENUM({$lista}) NOT NULL DEFAULT 'recepcao'");

            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            $this->substituirCheckPostgres(self::ESTADOS_ANTERIORES);
        }
    }

    /**
     * Substitui a CHECK constraint de documentos.estado_atual pela lista de
     * estados indicada. O nome da constraint é descoberto dinamicamente em
     * pg_constraint em vez de assumido (ex.: "documentos_estado_atual_check"),
     * para não depender da convenção de nomes exata que o Laravel/Doctrine
     * gerou ao criar a coluna.
     *
     * @param  list<string>  $estados
     */
    private function substituirCheckPostgres(array $estados): void
    {
        $constraint = DB::selectOne(<<<'SQL'
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
            WHERE rel.relname = 'documentos'
              AND att.attname = 'estado_atual'
              AND con.contype = 'c'
        SQL);

        if ($constraint) {
            DB::statement('ALTER TABLE documentos DROP CONSTRAINT '.$constraint->conname);
        }

        $lista = "'".implode("','", $estados)."'";
        DB::statement("ALTER TABLE documentos ADD CONSTRAINT documentos_estado_atual_check CHECK (estado_atual IN ({$lista}))");
    }
};
