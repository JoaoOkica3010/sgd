<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Perfil extends Model
{
protected $table = 'perfis';

    protected $fillable = ['sigla', 'nome_servico', 'permissoes'];

    protected $casts = [
        'permissoes' => 'array',
    ];

    public function utilizadores(): HasMany
    {
        return $this->hasMany(Utilizador::class, 'perfil_id');
    }

    public function documentosDestino(): HasMany
    {
        return $this->hasMany(Documento::class, 'servico_destino_id');
    }

    public function encaminhamentos(): HasMany
    {
        return $this->hasMany(Encaminhamento::class, 'servico_destino_id');
    }

    public function temPermissao(string $permissao): bool
    {
        return in_array($permissao, $this->permissoes ?? [], true);
    }
}
