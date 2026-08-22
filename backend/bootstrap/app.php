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
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => ['code' => 'validation_error', 'message' => $e->getMessage(), 'fields' => $e->errors()],
                ], 422);
            }
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => ['code' => 'forbidden', 'message' => 'Nao tem permissao para executar esta acao.'],
                ], 403);
            }
        });

        $exceptions->render(function (\RuntimeException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => ['code' => 'invalid_transition', 'message' => $e->getMessage()],
                ], 409);
            }
        });
    })->create();