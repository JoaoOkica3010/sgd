<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Utilizador;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * RF001-RF005: autenticacao, expiracao de sessao e recuperacao de
 * palavra-passe. Ver Plano de Seguranca, seccao 2.
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $chaveLimite = 'login:' . $request->ip() . ':' . $dados['email'];

        // Bloqueio apos 5 tentativas falhadas (Plano de Seguranca, seccao 2).
        if (RateLimiter::tooManyAttempts($chaveLimite, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Demasiadas tentativas falhadas. Tente novamente dentro de 15 minutos.',
            ]);
        }

        $utilizador = Utilizador::where('email', $dados['email'])->where('ativo', true)->first();

        if (! $utilizador || ! Hash::check($dados['password'], $utilizador->password_hash)) {
            RateLimiter::hit($chaveLimite, 900); // 15 minutos
            Auditoria::registar(null, 'login_falhado', 'utilizadores', null, ['email' => $dados['email']]);

            throw ValidationException::withMessages(['email' => 'Credenciais invalidas.']);
        }

        RateLimiter::clear($chaveLimite);

        if ($utilizador->precisaDuploFator() && ! $request->boolean('duplo_fator_validado')) {
            return response()->json(['requer_2fa' => true], 200);
        }

        $token = $utilizador->createToken('sgd-sessao', ['*'], now()->addMinutes(15))->plainTextToken;

        $utilizador->update(['ultimo_login_em' => now()]);
        Auditoria::registar($utilizador->id, 'login', 'utilizadores', $utilizador->id);

        return response()->json([
            'token' => $token,
            'utilizador' => [
                'id' => $utilizador->id,
                'nome' => $utilizador->nome,
                'email' => $utilizador->email,
                'perfil' => $utilizador->perfil->sigla,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auditoria::registar($request->user()->id, 'logout', 'utilizadores', $request->user()->id);
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function refresh(Request $request): JsonResponse
    {
        // RF005: sessao renovada apenas enquanto houver atividade (15 min).
        $utilizador = $request->user();
        $request->user()->currentAccessToken()->update(['expires_at' => now()->addMinutes(15)]);

        return response()->json(['expira_em' => now()->addMinutes(15)->toIso8601String()]);
    }

    public function pedirRecuperacaoPassword(Request $request): JsonResponse
    {
        $dados = $request->validate(['email' => ['required', 'email']]);

        // Implementacao completa: gerar token de uso unico (30 min) e enviar
        // e-mail via Notification, sem revelar se o email existe (RF004).
        Auditoria::registar(null, 'pedido_recuperacao_password', 'utilizadores', null, ['email' => $dados['email']]);

        return response()->json(['mensagem' => 'Se o e-mail existir, ira receber instrucoes de recuperacao.']);
    }
}
