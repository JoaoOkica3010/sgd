<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Auditoria extends Model
{
    protected $table = 'auditoria';

    public $timestamps = false;

    protected $fillable = [
        'utilizador_id', 'acao', 'entidade_afetada', 'entidade_id',
        'endereco_ip', 'detalhes', 'ocorrido_em',
    ];

    protected $casts = [
        'detalhes' => 'array',
        'ocorrido_em' => 'datetime',
    ];

    public function utilizador(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'utilizador_id');
    }

    public static function boot()
    {
        parent::boot();

        static::updating(function () {
            throw new \RuntimeException('A tabela auditoria é append-only.');
        });

        static::deleting(function () {
            throw new \RuntimeException('A tabela auditoria é append-only.');
        });
    }
}
