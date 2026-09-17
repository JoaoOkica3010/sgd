<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Utilizador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UtilizadorController extends Controller
{
    /**
     * Só imagem, e só os dois formatos que fazem sentido para uma
     * assinatura digitalizada (PNG com fundo transparente, idealmente).
     */
    private const MIME_ASSINATURA_PERMITIDOS = ['image/png', 'image/jpeg'];
    /**
     * GET /utilizadores
     */
    public function index(Request $request)
    {
        Gate::authorize('administrarUtilizadores', Utilizador::class);

        return Utilizador::with('perfil')
            ->orderBy('nome')
            ->paginate((int) $request->input('per_page', 20));
    }

    /**
     * POST /utilizadores
     */
    public function store(Request $request)
    {
        Gate::authorize('administrarUtilizadores', Utilizador::class);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:utilizadores,email'],
            'password' => ['required', 'string', 'min:8'],
            'perfil_id' => ['required', 'exists:perfis,id'],
        ]);

        $utilizador = Utilizador::create([
            'nome' => $dados['nome'],
            'email' => $dados['email'],
            'password_hash' => Hash::make($dados['password']),
            'perfil_id' => $dados['perfil_id'],
            'ativo' => true,
        ]);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'criar_utilizador',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['email' => $utilizador->email, 'perfil_id' => $utilizador->perfil_id],
            'ocorrido_em' => now(),
        ]);

        return response()->json($utilizador->load('perfil'), 201);
    }

    /**
     * PUT /utilizadores/{id}
     */
    public function update(Request $request, Utilizador $utilizador)
    {
        Gate::authorize('administrarUtilizadores', Utilizador::class);

        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', 'unique:utilizadores,email,'.$utilizador->id],
            'password' => ['sometimes', 'string', 'min:8'],
            'perfil_id' => ['sometimes', 'exists:perfis,id'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        if (isset($dados['password'])) {
            $dados['password_hash'] = Hash::make($dados['password']);
            unset($dados['password']);
        }

        $utilizador->update($dados);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_utilizador',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['campos_alterados' => array_keys($dados)],
            'ocorrido_em' => now(),
        ]);

        return $utilizador->fresh()->load('perfil');
    }

    /**
     * GET /utilizadores/{utilizador}/assinatura-imagem
     *
     * Aberto a qualquer utilizador autenticado — tal como o nome e a data
     * de quem assinou já são visíveis a quem pode ver o documento
     * (DocumentoPolicy::ver é aberta), a imagem que acompanha essa
     * assinatura segue a mesma visibilidade.
     */
    public function assinaturaImagem(Utilizador $utilizador)
    {
        if (! $utilizador->assinatura_imagem_path) {
            return response()->json([
                'error' => ['code' => 'not_found', 'message' => 'Este utilizador não tem assinatura digitalizada.'],
            ], 404);
        }

        $disco = config('filesystems.default', 'local');

        if (! Storage::disk($disco)->exists($utilizador->assinatura_imagem_path)) {
            return response()->json([
                'error' => ['code' => 'not_found', 'message' => 'Ficheiro não encontrado no armazenamento.'],
            ], 404);
        }

        return Storage::disk($disco)->response($utilizador->assinatura_imagem_path);
    }

    /**
     * POST /utilizadores/{utilizador}/assinatura-imagem
     */
    public function guardarAssinaturaImagem(Request $request, Utilizador $utilizador)
    {
        Gate::authorize('administrarUtilizadores', Utilizador::class);

        $request->validate([
            'imagem' => ['required', 'file', 'max:3072'],
        ]);

        $ficheiro = $request->file('imagem');
        $mimeReal = $ficheiro->getMimeType();

        if (! in_array($mimeReal, self::MIME_ASSINATURA_PERMITIDOS, true)) {
            return response()->json([
                'error' => [
                    'code' => 'unprocessable_entity',
                    'message' => "Tipo de ficheiro não permitido ({$mimeReal}). Use PNG ou JPEG.",
                ],
            ], 422);
        }

        $disco = config('filesystems.default', 'local');
        $caminhoAntigo = $utilizador->assinatura_imagem_path;
        $nomeArmazenado = Str::uuid().'.'.$ficheiro->getClientOriginalExtension();
        $caminho = $ficheiro->storeAs('assinaturas-utilizador/'.$utilizador->id, $nomeArmazenado, $disco);

        $utilizador->update(['assinatura_imagem_path' => $caminho]);

        if ($caminhoAntigo) {
            Storage::disk($disco)->delete($caminhoAntigo);
        }

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'editar_utilizador',
            'entidade_afetada' => 'utilizadores',
            'entidade_id' => $utilizador->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['campos_alterados' => ['assinatura_imagem_path']],
            'ocorrido_em' => now(),
        ]);

        return $utilizador->fresh()->load('perfil');
    }

    /**
     * DELETE /utilizadores/{utilizador}/assinatura-imagem
     */
    public function removerAssinaturaImagem(Request $request, Utilizador $utilizador)
    {
        Gate::authorize('administrarUtilizadores', Utilizador::class);

        if ($utilizador->assinatura_imagem_path) {
            Storage::disk(config('filesystems.default', 'local'))->delete($utilizador->assinatura_imagem_path);
            $utilizador->update(['assinatura_imagem_path' => null]);

            Auditoria::create([
                'utilizador_id' => $request->user()->id,
                'acao' => 'editar_utilizador',
                'entidade_afetada' => 'utilizadores',
                'entidade_id' => $utilizador->id,
                'endereco_ip' => $request->ip(),
                'detalhes' => ['campos_alterados' => ['assinatura_imagem_path']],
                'ocorrido_em' => now(),
            ]);
        }

        return $utilizador->fresh()->load('perfil');
    }
}
