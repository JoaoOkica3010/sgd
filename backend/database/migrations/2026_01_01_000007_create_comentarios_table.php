<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comentarios', function (Blueprint $table) {
            $table->id();
            $table->uuid('documento_id');
            $table->foreign('documento_id')->references('id')->on('documentos')->cascadeOnDelete();

            $table->uuid('autor_id');
            $table->foreign('autor_id')->references('id')->on('utilizadores')->restrictOnDelete();

            $table->text('texto');
            $table->timestamp('criado_em')->useCurrent();

            $table->index('documento_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comentarios');
    }
};
