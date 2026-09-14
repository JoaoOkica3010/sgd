<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ajusta numero_referencia para 50 caracteres alfanuméricos,
     * conforme pedido de negócio (campo mostrado antes de "assunto"
     * nos ecrãs de documento). Usa SQL nativo (em vez de
     * Blueprint::change(), que exige doctrine/dbal, não instalado
     * neste projeto).
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE documentos ALTER COLUMN numero_referencia TYPE VARCHAR(50)');
        } else {
            DB::statement('ALTER TABLE documentos MODIFY numero_referencia VARCHAR(50) NULL');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE documentos ALTER COLUMN numero_referencia TYPE VARCHAR(100)');
        } else {
            DB::statement('ALTER TABLE documentos MODIFY numero_referencia VARCHAR(100) NULL');
        }
    }
};
