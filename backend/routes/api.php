<?php

use App\Http\Controllers\Api\AnexoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\PerfilController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/password/forgot', [AuthController::class, 'pedirRecuperacaoPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/refresh', [AuthController::class, 'refresh']);

        Route::get('/perfis', [PerfilController::class, 'index']);

        Route::get('/documentos', [DocumentoController::class, 'index']);
        Route::post('/documentos', [DocumentoController::class, 'store']);
        Route::get('/documentos/{documento}', [DocumentoController::class, 'show']);
        Route::put('/documentos/{documento}', [DocumentoController::class, 'update']);
        Route::post('/documentos/{documento}/submeter', [DocumentoController::class, 'submeter']);
        Route::post('/documentos/{documento}/validar', [DocumentoController::class, 'validar']);
        Route::post('/documentos/{documento}/encaminhar', [DocumentoController::class, 'encaminhar']);
        Route::post('/documentos/{documento}/iniciar-analise', [DocumentoController::class, 'iniciarAnalise']);
        Route::post('/documentos/{documento}/validar-servico', [DocumentoController::class, 'validarServico']);
        Route::post('/documentos/{documento}/rejeitar', [DocumentoController::class, 'rejeitar']);
        Route::post('/documentos/{documento}/arquivar', [DocumentoController::class, 'arquivar']);
        Route::get('/documentos/{documento}/historico', [DocumentoController::class, 'historico']);

        Route::post('/documentos/{documento}/anexos', [AnexoController::class, 'store']);
        Route::get('/anexos/{id}/download', [AnexoController::class, 'download']);
        Route::delete('/anexos/{id}', [AnexoController::class, 'destroy']);
    });
});