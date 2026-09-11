<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comentario extends Model
{
    public $timestamps = false;

    protected $fillable = ['documento_id', 'autor_id', 'texto', 'estado_criacao', 'criado_em'];

    protected $casts = [
        'criado_em' => 'datetime',
    ];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'autor_id');
    }
}
