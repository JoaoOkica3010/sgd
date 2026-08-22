<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Documento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * RF007-RF008: multiplos anexos por registo, ate 20 MB cada.
 * Plano de Seguranca, seccao 7: validacao pelo tipo real do ficheiro
 * (nao apenas extensao) e verificacao antivirus antes de disponibilizar.
 */
class AnexoController extends Controller
{
    private const TIPOS_MIME_PERMITIDOS = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
    ];

    public function store(Request $request, Documento $documento): JsonResponse
    {
        $this->authorize('editar', $documento);

        $maxKb = (int) config('sgd.anexo_tamanho_maximo_mb', 20) * 1024;

        $request->validate([
            'ficheiro' => ['required', 'file', "max:{$maxKb}"],
        ]);

        $ficheiro = $request->file('ficheiro');
        $tipoReal = $ficheiro->getMimeType(); // deteta pelo conteudo, nao pela extensao

        if (! in_array($tipoReal, self::TIPOS_MIME_PERMITIDOS, true)) {
            return response()->json([
                'error' => ['code' => 'unprocessable_entity', 'message' => 'Tipo de ficheiro nao permitido.'],
            ], 422);
        }

        if (! $this->passaVerificacaoAntivirus($ficheiro->getRealPath())) {
            return response()->json([
                'error' => ['code' => 'unprocessable_entity', 'message' => 'Ficheiro rejeitado pela verificacao antivirus.'],
            ], 422);
        }

        // Em producao, config('sgd.disco_anexos') aponta para 's3' (MinIO).
        // Em desenvolvimento sem MinIO (ex.: XAMPP), .env define 'local', que
        // grava em storage/app/private — sem alterar nenhuma linha de codigo.
        $caminho = $ficheiro->store("documentos/{$documento->id}", config('sgd.disco_anexos'));

        $anexo = $documento->anexos()->create([
            'id' => (string) Str::uuid(),
            'nome_ficheiro' => $ficheiro->getClientOriginalName(),
            'caminho_minio' => $caminho,
            'tamanho_bytes' => $ficheiro->getSize(),
            'tipo_mime' => $tipoReal,
            'carregado_por' => $request->user()->id,
        ]);

        Auditoria::registar($request->user()->id, 'carregar_anexo', 'anexos', $anexo->id);

        return response()->json($anexo, 201);
    }

    public function download(string $id)
    {
        $anexo = \App\Models\Anexo::findOrFail($id);
        $this->authorize('ver', $anexo->documento);

        return Storage::disk(config('sgd.disco_anexos'))->download($anexo->caminho_minio, $anexo->nome_ficheiro);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $anexo = \App\Models\Anexo::findOrFail($id);
        $this->authorize('editar', $anexo->documento);

        if (! $anexo->documento->editavel()) {
            return response()->json([
                'error' => ['code' => 'invalid_transition', 'message' => 'So e possivel remover anexos antes da validacao.'],
            ], 409);
        }

        Storage::disk(config('sgd.disco_anexos'))->delete($anexo->caminho_minio);
        $anexo->delete();

        Auditoria::registar($request->user()->id, 'remover_anexo', 'anexos', $id);

        return response()->json(null, 204);
    }

    /**
     * Integracao com motor antivirus (ex.: ClamAV via socket local).
     * Placeholder pronto a ligar ao clamdscan/clamav-daemon em producao.
     */
    private function passaVerificacaoAntivirus(string $caminhoTemporario): bool
    {
        return true; // TODO: integrar com ClamAV antes de ir para producao
    }
}
