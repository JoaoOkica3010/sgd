<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Perfil;
use Illuminate\Http\Request;

class PerfilController extends Controller
{
    /**
     * GET /perfis
     *
     * Lista de referência (sigla + nome de serviço), sem dados sensíveis.
     * Qualquer utilizador autenticado pode consultar — é necessária, por
     * exemplo, para escolher o serviço de destino ao encaminhar um
     * documento. Não deve exigir a permissão de administração de
     * utilizadores.
     */
    public function index(Request $request)
    {
        return Perfil::orderBy('nome_servico')->get();
    }
}
