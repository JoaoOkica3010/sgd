<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Perfil;
use Illuminate\Http\JsonResponse;

class PerfilController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Perfil::orderBy('nome_servico')->get(['id', 'sigla', 'nome_servico']));
    }
}