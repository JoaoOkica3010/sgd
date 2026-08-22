<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RF009: numero de registo unico, gerado de forma atomica.
     * Tabela pequena e dedicada, com lockForUpdate() no momento da leitura
     * (ver DocumentoController::gerarNumeroRegisto), portavel entre
     * PostgreSQL (producao) e MySQL/MariaDB (desenvolvimento com XAMPP).
     */
    public function up(): void
    {
        Schema::create('numero_registo_sequencias', function (Blueprint $table) {
            $table->year('ano')->primary();
            $table->unsignedInteger('ultimo_numero')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('numero_registo_sequencias');
    }
};
