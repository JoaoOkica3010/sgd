<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    protected $table = 'auditoria';
    public $timestamps = false;

    protected $fillable = ['utilizador_id', 'acao', 'entidade_afetada', 'entidade_id', 'endereco_ip', 'detalhes', 'ocorrido_em'];

    protected $casts = ['detalhes' => 'array', 'ocorrido_em' => 'datetime'];

    /** Registo append-only: bloqueia UPDATE/DELETE mesmo a nivel de aplicacao (RNF006). */
    public static function boot()
    {
        parent::boot();

        static::updating(fn () => throw new \RuntimeException('A tabela de auditoria e apenas de insercao (append-only).'));
        static::deleting(fn () => throw new \RuntimeException('A tabela de auditoria e apenas de insercao (append-only).'));
    }

    public static function registar(?string $utilizadorId, string $acao, ?string $entidade = null, ?string $entidadeId = null, array $detalhes = []): void
    {
        static::create([
            'utilizador_id' => $utilizadorId,
            'acao' => $acao,
            'entidade_afetada' => $entidade,
            'entidade_id' => $entidadeId,
            'endereco_ip' => request()?->ip(),
            'detalhes' => $detalhes,
            'ocorrido_em' => now(),
        ]);
    }
}
