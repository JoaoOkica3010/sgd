<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Utilizador extends Authenticatable
{
    use HasApiTokens, HasUuids, SoftDeletes;

    protected $table = 'utilizadores';

    protected $fillable = [
        'nome', 'email', 'password_hash', 'perfil_id',
        'ativo', 'duplo_fator_ativo', 'duplo_fator_segredo',
    ];

    protected $hidden = [
        'password_hash', 'duplo_fator_segredo',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'duplo_fator_ativo' => 'boolean',
        'ultimo_login_em' => 'datetime',
    ];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'perfil_id');
    }

    public function documentosCriados(): HasMany
    {
        return $this->hasMany(Documento::class, 'criado_por');
    }

    public function anexosCarregados(): HasMany
    {
        return $this->hasMany(Anexo::class, 'carregado_por');
    }

    public function comentarios(): HasMany
    {
        return $this->hasMany(Comentario::class, 'autor_id');
    }

    public function encaminhamentosFeitos(): HasMany
    {
        return $this->hasMany(Encaminhamento::class, 'encaminhado_por');
    }

    public function transicoesRealizadas(): HasMany
    {
        return $this->hasMany(EstadoDocumento::class, 'alterado_por');
    }

    public function temPermissao(string $permissao): bool
    {
        return $this->perfil?->temPermissao($permissao) ?? false;
    }

    /**
     * Verifica se o utilizador tem um dos perfis (siglas) indicados.
     * Usado pelas Policies. Ex: $utilizador->possuiPerfil('RECEP', 'SECR')
     */
    public function possuiPerfil(string ...$siglas): bool
    {
        return in_array($this->perfil?->sigla, $siglas, true);
    }
}
