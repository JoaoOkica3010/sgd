<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstadoDocumento extends Model
{
    public $timestamps = false;

    protected $table = 'estados_documento';

    protected $fillable = [
        'documento_id', 'estado', 'alterado_por', 'justificacao', 'alterado_em',
    ];

    protected $casts = [
        'alterado_em' => 'datetime',
    ];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    public function alteradoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'alterado_por');
    }
}
