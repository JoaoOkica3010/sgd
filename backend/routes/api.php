<?php

use App\Http\Controllers\Api\AnexoController;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComentarioController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\UtilizadorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/password/forgot', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/password/reset', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/refresh', [AuthController::class, 'refresh']);
        Route::get('/utilizador', fn (\Illuminate\Http\Request $r) => $r->user()->load('perfil'));

        // ---- Documentos ----
        Route::get('/documentos', [DocumentoController::class, 'index']);
        Route::post('/documentos', [DocumentoController::class, 'store']);
        Route::get('/documentos/{documento}', [DocumentoController::class, 'show']);
        Route::put('/documentos/{documento}', [DocumentoController::class, 'update']);
        Route::post('/documentos/{documento}/submeter', [DocumentoController::class, 'submeter']);
        Route::post('/documentos/{documento}/validar', [DocumentoController::class, 'validar']);
        Route::post('/documentos/{documento}/encaminhar', [DocumentoController::class, 'encaminhar']);
        Route::post('/documentos/{documento}/rejeitar', [DocumentoController::class, 'rejeitar']);
        Route::post('/documentos/{documento}/reabrir', [DocumentoController::class, 'reabrir']);
        Route::post('/documentos/{documento}/arquivar', [DocumentoController::class, 'arquivar']);
        Route::post('/documentos/{documento}/desarquivar', [DocumentoController::class, 'desarquivar']);
        Route::get('/documentos/{documento}/historico', [DocumentoController::class, 'historico']);
        Route::get('/documentos/{documento}/encaminhamentos', [DocumentoController::class, 'encaminhamentos']);

        // ---- Anexos ----
        Route::post('/documentos/{documento}/anexos', [AnexoController::class, 'store']);
        Route::get('/documentos/{documento}/anexos', [AnexoController::class, 'index']);
        Route::get('/anexos/{anexo}/download', [AnexoController::class, 'download']);
        Route::get('/anexos/{anexo}/preview-pdf', [AnexoController::class, 'previewPdf']);
        Route::delete('/anexos/{anexo}', [AnexoController::class, 'destroy']);

        // ---- Observações (comentários) ----
        Route::post('/documentos/{documento}/observacoes', [ComentarioController::class, 'store']);
        Route::get('/documentos/{documento}/observacoes', [ComentarioController::class, 'index']);
        Route::put('/documentos/{documento}/observacoes/{comentario}', [ComentarioController::class, 'update']);
        Route::delete('/documentos/{documento}/observacoes/{comentario}', [ComentarioController::class, 'destroy']);

        // ---- Administração ----
        Route::get('/utilizadores', [UtilizadorController::class, 'index']);
        Route::post('/utilizadores', [UtilizadorController::class, 'store']);
        Route::put('/utilizadores/{utilizador}', [UtilizadorController::class, 'update']);
        Route::get('/perfis', [PerfilController::class, 'index']);
        Route::get('/auditoria', [AuditoriaController::class, 'index']);
    });

});
