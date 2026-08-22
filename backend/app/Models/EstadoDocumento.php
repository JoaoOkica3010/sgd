<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstadoDocumento extends Model
{
    use HasFactory;

    protected $table = 'estados_documento';
    public $timestamps = false;

    protected $fillable = ['documento_id', 'estado', 'alterado_por', 'justificacao', 'alterado_em'];

    protected $casts = ['alterado_em' => 'datetime'];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class);
    }

    public function alteradoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'alterado_por');
    }
}
