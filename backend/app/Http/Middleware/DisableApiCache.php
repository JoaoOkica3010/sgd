<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Garante que respostas da API nunca ficam em cache no browser.
 *
 * Sem isto, um simples F5 pode reutilizar uma resposta GET antiga da
 * cache HTTP do browser (ex.: dados de antes de uma ação como assinar,
 * reabrir, etc.), dando a falsa impressão de que a alteração "desapareceu"
 * quando na realidade o backend já tem os dados corretos.
 */
class DisableApiCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    }
}
