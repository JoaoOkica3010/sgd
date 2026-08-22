<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Registo de auditoria (RNF006). Append-only: nenhum utilizador,
     * incluindo administradores, pode fazer UPDATE ou DELETE — reforcado
     * a nivel de base de dados por REVOKE explicito (ver seccao 4.4 do
     * Plano de Seguranca).
     */
    public function up(): void
    {
        Schema::create('auditoria', function (Blueprint $table) {
            $table->id();
            $table->uuid('utilizador_id')->nullable(); // nulo em tentativas de login falhadas
            $table->foreign('utilizador_id')->references('id')->on('utilizadores')->nullOnDelete();

            $table->string('acao', 100);            // ex.: login, criar_documento, validar, encaminhar, arquivar
            $table->string('entidade_afetada', 100)->nullable();
            $table->uuid('entidade_id')->nullable();
            $table->ipAddress('endereco_ip')->nullable();
            $table->json('detalhes')->nullable();

            $table->timestamp('ocorrido_em')->useCurrent();

            $table->index(['utilizador_id', 'ocorrido_em']);
            $table->index('acao');
        });

        // Reforco a nivel de base de dados: revoga UPDATE/DELETE do papel da aplicacao.
        // So aplicavel em PostgreSQL (producao). Em MySQL/XAMPP (desenvolvimento local)
        // esta proteccao fica apenas na camada de aplicacao (ver App\Models\Auditoria::boot()),
        // que ja bloqueia UPDATE/DELETE independentemente do motor de base de dados.
        if (DB::getDriverName() === 'pgsql') {
            // Ajustar "sgd_user" ao utilizador de ligacao efetivamente usado em producao.
            DB::statement('REVOKE UPDATE, DELETE ON auditoria FROM sgd_user');
            DB::statement('GRANT INSERT, SELECT ON auditoria TO sgd_user');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
