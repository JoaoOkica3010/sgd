<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Perfil extends Model
{
protected $table = 'perfis';

    protected $fillable = ['sigla', 'nome_servico', 'servico_id', 'permissoes'];

    protected $casts = [
        'permissoes' => 'array',
    ];

    public function utilizadores(): HasMany
    {
        return $this->hasMany(Utilizador::class, 'perfil_id');
    }

    /**
     * Serviço de destino associado a este perfil (ex.: o perfil ARQ
     * pertence ao serviço "Arquivo"). Nulo para perfis técnicos como
     * ADMIN/SADMIN, que não representam um serviço de destino próprio.
     */
    public function servico(): BelongsTo
    {
        return $this->belongsTo(Servico::class, 'servico_id');
    }

    public function temPermissao(string $permissao): bool
    {
        return in_array($permissao, $this->permissoes ?? [], true);
    }
}
