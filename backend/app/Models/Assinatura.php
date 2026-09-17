<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assinatura extends Model
{
    public $timestamps = false;

    protected $table = 'assinaturas_documento';

    protected $fillable = ['documento_id', 'utilizador_id', 'hash_documento', 'codigo_verificacao', 'assinado_em'];

    protected $casts = [
        'assinado_em' => 'datetime',
    ];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    public function utilizador(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'utilizador_id');
    }
}
