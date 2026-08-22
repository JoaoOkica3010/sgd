<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Utilizador extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $table = 'utilizadores';

    protected $fillable = [
        'nome', 'email', 'password_hash', 'perfil_id', 'ativo',
        'duplo_fator_ativo', 'duplo_fator_segredo',
    ];

    protected $hidden = ['password_hash', 'duplo_fator_segredo'];

    protected $casts = [
        'ativo' => 'boolean',
        'duplo_fator_ativo' => 'boolean',
        'ultimo_login_em' => 'datetime',
    ];

    /** Laravel espera "password" — mapeamos para a coluna password_hash (RNF005: hash Argon2id/bcrypt). */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class);
    }

    public function possuiPerfil(string ...$siglas): bool
    {
        return in_array($this->perfil->sigla, $siglas, true);
    }

    public function precisaDuploFator(): bool
    {
        $obrigatorios = explode(',', config('sgd.duplo_fator_perfis_obrigatorios', ''));

        return in_array($this->perfil->sigla, $obrigatorios, true);
    }
}
