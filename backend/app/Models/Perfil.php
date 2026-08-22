<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Perfil extends Model
{
    use HasFactory;

   protected $table = 'perfis';    
   protected $fillable = ['sigla', 'nome_servico', 'permissoes'];

    protected $casts = [
        'permissoes' => 'array',
    ];

    /** Os 14 servicos previstos na seccao 4.1 do Documento de Analise de Requisitos. */
    public const SIGLAS = [
        'RECEP', 'SECR', 'MIN', 'CG', 'SG', 'AJ', 'AAP', 'AIM',
        'GE', 'DGED', 'ITMA', 'DGVTT', 'IMP', 'ARQ',
    ];

    public function utilizadores(): HasMany
    {
        return $this->hasMany(Utilizador::class);
    }
}
