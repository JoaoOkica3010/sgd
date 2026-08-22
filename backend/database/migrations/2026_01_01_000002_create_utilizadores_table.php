<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utilizadores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nome', 150);
            $table->string('email', 150)->unique();
            $table->string('password_hash'); // Argon2id / bcrypt (RNF005)
            $table->foreignId('perfil_id')->constrained('perfis')->restrictOnDelete();
            $table->boolean('ativo')->default(true);
            $table->boolean('duplo_fator_ativo')->default(false);
            $table->string('duplo_fator_segredo')->nullable();
            $table->timestamp('ultimo_login_em')->nullable();
            $table->timestamps();
            $table->softDeletes(); // desativar sem apagar historico
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilizadores');
    }
};
