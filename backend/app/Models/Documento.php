<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Documento extends Model
{
    use HasFactory, HasUuids;

    /** Estados possiveis — ver Documento: Maquina de Estados do Workflow. */
    public const ESTADO_RECEPCAO = 'recepcao';
    public const ESTADO_SUBMETIDO = 'submetido';
    public const ESTADO_VALIDADO_SECRETARIADO = 'validado_secretariado';
    public const ESTADO_ENCAMINHADO = 'encaminhado';
    public const ESTADO_EM_ANALISE = 'em_analise';
    public const ESTADO_VALIDADO_SERVICO = 'validado_servico';
    public const ESTADO_ARQUIVADO = 'arquivado';
    public const ESTADO_REJEITADO = 'rejeitado';

    protected $fillable = [
        'numero_registo', 'remetente', 'assunto', 'tipo_documento',
        'data_documento', 'numero_referencia', 'observacoes', 'prioridade',
        'servico_destino_id', 'estado_atual', 'criado_por',
    ];

    protected $casts = [
        'data_documento' => 'date',
        'criado_em' => 'datetime',
    ];

    public function servicoDestino(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'servico_destino_id');
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'criado_por');
    }

    public function anexos(): HasMany
    {
        return $this->hasMany(Anexo::class);
    }

    public function historicoEstados(): HasMany
    {
        return $this->hasMany(EstadoDocumento::class)->orderBy('alterado_em');
    }

    public function encaminhamentos(): HasMany
    {
        return $this->hasMany(Encaminhamento::class);
    }

    public function comentarios(): HasMany
    {
        return $this->hasMany(Comentario::class)->orderBy('criado_em');
    }

    public function editavel(): bool
    {
        return in_array($this->estado_atual, [
            self::ESTADO_RECEPCAO,
            self::ESTADO_SUBMETIDO,
            self::ESTADO_ENCAMINHADO,
            self::ESTADO_EM_ANALISE,
        ], true);
    }
}
