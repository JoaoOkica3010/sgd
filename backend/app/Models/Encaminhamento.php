<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Encaminhamento extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['documento_id', 'servico_destino_id', 'encaminhado_por', 'encaminhado_em'];

    protected $casts = ['encaminhado_em' => 'datetime'];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class);
    }

    public function servicoDestino(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'servico_destino_id');
    }

    public function encaminhadoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'encaminhado_por');
    }
}
