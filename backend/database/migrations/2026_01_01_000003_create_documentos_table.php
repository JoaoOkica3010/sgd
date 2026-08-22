<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // RF009: numero de registo unico, gerado por sequencia atomica
            $table->string('numero_registo', 30)->unique();

            $table->string('remetente', 200);
            $table->string('assunto', 300);
            $table->enum('tipo_documento', ['Oficio', 'Carta', 'Memo', 'Nota', 'Outro']);
            $table->date('data_documento')->nullable();
            $table->string('numero_referencia', 100)->nullable();
            $table->text('observacoes')->nullable();

            $table->enum('prioridade', ['Normal', 'Urgente', 'Muito Urgente'])->default('Normal');

            $table->foreignId('servico_destino_id')->nullable()->constrained('perfis')->restrictOnDelete();

            // Estados da maquina de estados (ver Documento: Maquina de Estados do Workflow)
            $table->enum('estado_atual', [
                'recepcao',
                'submetido',
                'validado_secretariado',
                'encaminhado',
                'em_analise',
                'validado_servico',
                'arquivado',
                'rejeitado',
            ])->default('recepcao');

            $table->uuid('criado_por');
            $table->foreign('criado_por')->references('id')->on('utilizadores')->restrictOnDelete();

            $table->timestamp('criado_em')->useCurrent();
            $table->timestamps();

            $table->index('remetente');
            $table->index('assunto');
            $table->index('estado_atual');
            $table->index('criado_em');
        });

        // RF018-RF022: pesquisa de texto completo.
        // Em PostgreSQL (producao) usa-se tsvector nativo, muito mais rapido.
        // Em MySQL/MariaDB (ex.: ambiente de desenvolvimento com XAMPP) usa-se
        // um indice FULLTEXT equivalente, que o DocumentoController tambem sabe
        // usar (ver metodo pesquisar()).
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE documentos ADD COLUMN pesquisa_tsv tsvector
                GENERATED ALWAYS AS (
                    to_tsvector('portuguese', coalesce(numero_registo,'') || ' ' || coalesce(remetente,'') || ' ' || coalesce(assunto,''))
                ) STORED");
            DB::statement('CREATE INDEX documentos_pesquisa_tsv_idx ON documentos USING GIN (pesquisa_tsv)');
        } elseif (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE documentos ADD FULLTEXT documentos_pesquisa_ft (numero_registo, remetente, assunto)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
