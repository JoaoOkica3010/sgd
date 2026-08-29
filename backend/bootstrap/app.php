<?php

use App\Providers\AuthServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders([
        AuthServiceProvider::class,
    ])
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->api(append: [\App\Http\Middleware\DisableApiCache::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json([
                    'error' => ['code' => 'unauthenticated', 'message' => 'Token ausente, inválido ou expirado.'],
                ], 401);
            }

            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'error' => ['code' => 'validation_error', 'message' => $e->getMessage(), 'fields' => $e->errors()],
                ], 422);
            }

            // AuthorizationException é convertida pelo Laravel para
            // AccessDeniedHttpException (Symfony) antes de chegar aqui —
            // e essa classe, por herança, TAMBÉM é um RuntimeException,
            // por isso este bloco tem de vir antes do bloco genérico abaixo.
            if ($e instanceof \Illuminate\Auth\Access\AuthorizationException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                return response()->json([
                    'error' => ['code' => 'forbidden', 'message' => 'Não tem permissão para executar esta ação.'],
                ], 403);
            }

            if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException
                || $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                return response()->json([
                    'error' => ['code' => 'not_found', 'message' => 'Recurso não encontrado.'],
                ], 404);
            }

            // QueryException (erros de SQL) também herda de RuntimeException,
            // tal como AccessDeniedHttpException e NotFoundHttpException —
            // por isso tem de ser tratada antes do catch-all genérico abaixo,
            // ou apareceria incorretamente rotulada como "invalid_transition".
            if ($e instanceof \Illuminate\Database\QueryException) {
                report($e); // regista o erro completo nos logs para diagnóstico

                return response()->json([
                    'error' => ['code' => 'database_error', 'message' => 'Ocorreu um erro ao aceder à base de dados.'],
                ], 500);
            }

            if ($e instanceof \RuntimeException) {
                return response()->json([
                    'error' => ['code' => 'invalid_transition', 'message' => $e->getMessage()],
                ], 409);
            }

            return null;
        });

    })->create();
