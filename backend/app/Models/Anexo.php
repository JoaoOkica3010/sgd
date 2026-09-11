<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Anexo extends Model
{
    use HasUuids;

    protected $fillable = [
        'documento_id', 'nome_ficheiro', 'caminho_minio',
        'tamanho_bytes', 'tipo_mime', 'carregado_por',
    ];

    protected $casts = [
        'tamanho_bytes' => 'integer',
    ];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    public function carregadoPor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'carregado_por');
    }
}
