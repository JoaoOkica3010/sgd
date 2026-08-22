<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comentario extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['documento_id', 'autor_id', 'texto', 'criado_em'];

    protected $casts = ['criado_em' => 'datetime'];

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class);
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(Utilizador::class, 'autor_id');
    }
}
