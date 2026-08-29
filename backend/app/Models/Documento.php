<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class Documento extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    // ---- Estados do workflow (DOC05) ----
    public const ESTADO_RECEPCAO = 'recepcao';
    public const ESTADO_SUBMETIDO = 'submetido';
    public const ESTADO_VALIDADO_SECRETARIADO = 'validado_secretariado';
    public const ESTADO_ENCAMINHADO = 'encaminhado';
    public const ESTADO_EM_ANALISE = 'em_analise';
    public const ESTADO_VALIDADO_SERVICO = 'validado_servico';
    public const ESTADO_ARQUIVADO = 'arquivado';
    public const ESTADO_REJEITADO = 'rejeitado';

    public const ESTADOS = [
        self::ESTADO_RECEPCAO, self::ESTADO_SUBMETIDO, self::ESTADO_VALIDADO_SECRETARIADO,
        self::ESTADO_ENCAMINHADO, self::ESTADO_EM_ANALISE, self::ESTADO_VALIDADO_SERVICO,
        self::ESTADO_ARQUIVADO, self::ESTADO_REJEITADO,
    ];

    protected $fillable = [
        'numero_registo', 'remetente', 'assunto', 'tipo_documento',
        'data_documento', 'numero_referencia', 'observacoes',
        'prioridade', 'servico_destino_id', 'estado_atual', 'criado_por',
    ];

    protected $casts = [
        'data_documento' => 'date',
        'criado_em' => 'datetime',
    ];

    // ---- Relações ----

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
        return $this->hasMany(Anexo::class, 'documento_id');
    }

    public function historicoEstados(): HasMany
    {
        return $this->hasMany(EstadoDocumento::class, 'documento_id')->orderBy('alterado_em');
    }

    public function encaminhamentos(): HasMany
    {
        return $this->hasMany(Encaminhamento::class, 'documento_id');
    }

    public function comentarios(): HasMany
    {
        return $this->hasMany(Comentario::class, 'documento_id')->orderBy('criado_em');
    }

    public function assinatura(): HasOne
    {
        return $this->hasOne(Assinatura::class, 'documento_id');
    }

    // ---- Regras de negócio ----

    /**
     * RF024: um documento arquivado é apenas consultável.
     */
    public function editavel(): bool
    {
        return $this->estado_atual !== self::ESTADO_ARQUIVADO;
    }

    /**
     * RF009: gera o próximo número de registo de forma atómica,
     * formato SGD-AAAA-NNNNNN, usando a tabela numero_registo_sequencias
     * com lockForUpdate() para evitar duplicações em concorrência (RNF001).
     */
    public static function gerarNumeroRegisto(): string
    {
        return DB::transaction(function () {
            $ano = now()->year;

            $existe = DB::table('numero_registo_sequencias')->where('ano', $ano)->lockForUpdate()->first();

            if (! $existe) {
                DB::table('numero_registo_sequencias')->insert(['ano' => $ano, 'ultimo_numero' => 0]);
            }

            $seq = DB::table('numero_registo_sequencias')->where('ano', $ano)->lockForUpdate()->first();
            $proximo = $seq->ultimo_numero + 1;

            DB::table('numero_registo_sequencias')->where('ano', $ano)->update(['ultimo_numero' => $proximo]);

            return sprintf('SGD-%d-%06d', $ano, $proximo);
        });
    }
}
