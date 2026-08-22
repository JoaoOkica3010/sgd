<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anexos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('documento_id');
            $table->foreign('documento_id')->references('id')->on('documentos')->cascadeOnDelete();

            $table->string('nome_ficheiro', 255);
            $table->string('caminho_minio', 500); // localizacao no bucket S3/MinIO
            $table->unsignedBigInteger('tamanho_bytes'); // validado contra 20 MB (RNF003)
            $table->string('tipo_mime', 150); // validado pelo conteudo real, nao pela extensao

            $table->uuid('carregado_por');
            $table->foreign('carregado_por')->references('id')->on('utilizadores')->restrictOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anexos');
    }
};
