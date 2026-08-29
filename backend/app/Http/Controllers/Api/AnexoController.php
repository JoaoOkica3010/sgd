<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anexo;
use App\Models\Auditoria;
use App\Models\Documento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AnexoController extends Controller
{
    /**
     * Tipos MIME aceites, validados pelo conteúdo real do ficheiro
     * (finfo), nunca apenas pela extensão (secção 4.6 do DOC02).
     */
    private const MIME_PERMITIDOS = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    /**
     * POST /documentos/{documento}/anexos (RF007, RF008)
     */
    public function store(Request $request, Documento $documento)
    {
        Gate::authorize('carregar', [Anexo::class, $documento]);

        $maxKb = ((int) config('sgd.anexo_tamanho_maximo_mb', 20)) * 1024;

        $request->validate([
            'ficheiro' => ['required', 'file', "max:{$maxKb}"],
        ]);

        $ficheiro = $request->file('ficheiro');

        // Deteção do tipo real pelo conteúdo binário, não pela extensão.
        $mimeReal = $ficheiro->getMimeType();

        if (! in_array($mimeReal, self::MIME_PERMITIDOS, true)) {
            return response()->json([
                'error' => [
                    'code' => 'unprocessable_entity',
                    'message' => "Tipo de ficheiro não permitido ({$mimeReal}).",
                ],
            ], 422);
        }

        $disco = config('filesystems.default', 'local');
        $nomeArmazenado = Str::uuid().'.'.$ficheiro->getClientOriginalExtension();
        $caminho = $ficheiro->storeAs('anexos/'.$documento->id, $nomeArmazenado, $disco);

        $anexo = Anexo::create([
            'documento_id' => $documento->id,
            'nome_ficheiro' => $ficheiro->getClientOriginalName(),
            'caminho_minio' => $caminho,
            'tamanho_bytes' => $ficheiro->getSize(),
            'tipo_mime' => $mimeReal,
            'carregado_por' => $request->user()->id,
        ]);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'carregar_anexo',
            'entidade_afetada' => 'anexos',
            'entidade_id' => $anexo->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['documento_id' => $documento->id, 'nome_ficheiro' => $anexo->nome_ficheiro],
            'ocorrido_em' => now(),
        ]);

        return response()->json($anexo, 201);
    }

    /**
     * GET /documentos/{documento}/anexos
     */
    public function index(Request $request, Documento $documento)
    {
        Gate::authorize('ver', $documento);

        return $documento->anexos()->with('carregadoPor:id,nome')->get();
    }

    /**
     * GET /anexos/{anexo}/download
     */
    public function download(Request $request, Anexo $anexo)
    {
        Gate::authorize('ver', $anexo);

        $disco = config('filesystems.default', 'local');

        if (! Storage::disk($disco)->exists($anexo->caminho_minio)) {
            return response()->json([
                'error' => ['code' => 'not_found', 'message' => 'Ficheiro não encontrado no armazenamento.'],
            ], 404);
        }

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'download_anexo',
            'entidade_afetada' => 'anexos',
            'entidade_id' => $anexo->id,
            'endereco_ip' => $request->ip(),
            'ocorrido_em' => now(),
        ]);

        return Storage::disk($disco)->download($anexo->caminho_minio, $anexo->nome_ficheiro);
    }

    /**
     * DELETE /anexos/{anexo}
     */
    public function destroy(Request $request, Anexo $anexo)
    {
        Gate::authorize('apagar', $anexo);

        $disco = config('filesystems.default', 'local');
        Storage::disk($disco)->delete($anexo->caminho_minio);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'remover_anexo',
            'entidade_afetada' => 'anexos',
            'entidade_id' => $anexo->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => ['documento_id' => $anexo->documento_id, 'nome_ficheiro' => $anexo->nome_ficheiro],
            'ocorrido_em' => now(),
        ]);

        $anexo->delete();

        return response()->json(['message' => 'Anexo removido.']);
    }
}
