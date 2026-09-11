<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela singleton (uma única linha, id=1) com a identidade visual desta
 * instalação. Substitui a leitura direta do .env em ConfigController: o
 * .env continua a definir o valor INICIAL (útil para automatizar uma
 * instalação nova), mas a partir daqui o SADMIN pode alterá-lo pela
 * interface, sem precisar de mexer no .env nem reiniciar o servidor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracao_instituicao', function (Blueprint $table) {
            $table->id();
            $table->string('sigla_instituicao', 30)->default('');
            $table->string('subtitulo', 100)->default('Gestão Documental');
            $table->string('selo', 4)->default('S');
            $table->timestamps();
        });

        // Semeia a linha única a partir do que já estava no .env, para não
        // mudar nada visualmente nesta instalação.
        DB::table('configuracao_instituicao')->insert([
            'id' => 1,
            'sigla_instituicao' => config('sgd.marca.sigla_instituicao'),
            'subtitulo' => config('sgd.marca.subtitulo'),
            'selo' => config('sgd.marca.selo'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracao_instituicao');
    }
};
