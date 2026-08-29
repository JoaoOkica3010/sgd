<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Utilizador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /auth/login
     */
    public function login(Request $request)
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $utilizador = Utilizador::where('email', $dados['email'])->first();

        if (! $utilizador || ! Hash::check($dados['password'], $utilizador->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        if (! $utilizador->ativo) {
            throw ValidationException::withMessages([
                'email' => ['Conta desativada. Contacte o administrador.'],
            ]);
        }

        // RF005: sessão expira ao fim de 15 min de inatividade — controlado
        // pelo expires_at do token e por middleware que o renova em cada pedido.
        $token = $utilizador->createToken(
            name: 'sgd-web',
            expiresAt: now()->addMinutes(config('sanctum.expiration') ?? 15)
        );

        $utilizador->forceFill(['ultimo_login_em' => now()])->save();

        Auditoria::create([
            'utilizador_id' => $utilizador->id,
            'acao' => 'login',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'ocorrido_em' => now(),
        ]);

        return response()->json([
            'token' => $token->plainTextToken,
            'utilizador' => [
                'id' => $utilizador->id,
                'nome' => $utilizador->nome,
                'email' => $utilizador->email,
                'perfil' => $utilizador->perfil?->sigla,
                'duplo_fator_ativo' => $utilizador->duplo_fator_ativo,
            ],
        ]);
    }

    /**
     * POST /auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'logout',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $request->user()->id,
            'endereco_ip' => $request->ip(),
            'ocorrido_em' => now(),
        ]);

        return response()->json(['message' => 'Sessão terminada.']);
    }

    /**
     * POST /auth/refresh
     * Renova o token apenas enquanto houver atividade (RF005).
     */
    public function refresh(Request $request)
    {
        $utilizador = $request->user();
        $request->user()->currentAccessToken()->delete();

        $token = $utilizador->createToken(
            name: 'sgd-web',
            expiresAt: now()->addMinutes(config('sanctum.expiration') ?? 15)
        );

        return response()->json(['token' => $token->plainTextToken]);
    }

    /**
     * POST /auth/password/forgot (RF004)
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        // TODO: configurar MAIL_MAILER real; atualmente MAIL_MAILER=log
        // apenas escreve o e-mail no ficheiro de log (storage/logs/laravel.log).
        Password::broker('utilizadores')->sendResetLink(
            $request->only('email')
        );

        // Resposta genérica sempre igual, para não revelar se o e-mail existe.
        return response()->json([
            'message' => 'Se o e-mail existir, foi enviado um link de recuperação.',
        ]);
    }

    /**
     * POST /auth/password/reset (RF004)
     */
    public function resetPassword(Request $request)
    {
        $dados = $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::broker('utilizadores')->reset(
            $dados,
            function (Utilizador $utilizador, string $password) {
                $utilizador->forceFill([
                    'password_hash' => Hash::make($password),
                ])->save();

                // Invalida todas as sessões ativas após reset de password.
                $utilizador->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Palavra-passe redefinida com sucesso.']);
    }
}
