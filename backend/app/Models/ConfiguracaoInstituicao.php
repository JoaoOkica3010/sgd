<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Linha única (id=1) com a identidade visual da instalação. Usar
 * ConfiguracaoInstituicao::atual() em vez de fazer query direta.
 */
class ConfiguracaoInstituicao extends Model
{
    protected $table = 'configuracao_instituicao';

    protected $fillable = ['sigla_instituicao', 'subtitulo', 'selo'];

    public static function atual(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'sigla_instituicao' => config('sgd.marca.sigla_instituicao'),
                'subtitulo' => config('sgd.marca.subtitulo'),
                'selo' => config('sgd.marca.selo'),
            ]
        );
    }
}
