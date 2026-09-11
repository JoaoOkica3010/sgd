<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Um serviço de destino de encaminhamento (ex.: "Arquivo", "Secretariado").
 *
 * Gerido exclusivamente pelo SADMIN (ver ServicoPolicy). Só os serviços
 * com ativo = true aparecem no ecrã de encaminhamento do Ministro.
 */
class Servico extends Model
{
    protected $table = 'servicos';

    protected $fillable = ['nome', 'descricao', 'ativo', 'criado_por'];

    protected $casts = [
        'ativo' => 'boolean',
    ];

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'criado_por');
    }

    public function perfis(): HasMany
    {
        return $this->hasMany(Perfil::class, 'servico_id');
    }

    public function documentosDestino(): HasMany
    {
        return $this->hasMany(Documento::class, 'servico_destino_id');
    }

    public function encaminhamentos(): HasMany
    {
        return $this->hasMany(Encaminhamento::class, 'servico_destino_id');
    }
}
