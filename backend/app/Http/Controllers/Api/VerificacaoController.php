<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assinatura;

/**
 * Página pública de verificação de assinaturas (Opção C do painel de
 * assinatura digital): confirma, sem exigir sessão, que um código
 * impresso na Ficha corresponde mesmo a uma assinatura registada no
 * SGD — sem expor o conteúdo do documento (assunto, remetente, etc.),
 * só o essencial para confirmar autenticidade.
 */
class VerificacaoController extends Controller
{
    /**
     * GET /verificar/{codigo}
     */
    public function mostrar(string $codigo)
    {
        $assinatura = Assinatura::where('codigo_verificacao', strtoupper($codigo))
            ->with(['utilizador:id,nome', 'documento:id,numero_registo,tipo_documento'])
            ->first();

        if (! $assinatura) {
            return response()->json(['encontrado' => false], 404);
        }

        return [
            'encontrado' => true,
            'numero_registo' => $assinatura->documento?->numero_registo,
            'tipo_documento' => $assinatura->documento?->tipo_documento,
            'assinado_por' => $assinatura->utilizador?->nome,
            'assinado_em' => $assinatura->assinado_em,
        ];
    }
}
