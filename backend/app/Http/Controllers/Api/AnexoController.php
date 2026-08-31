<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anexo;
use App\Models\Auditoria;
use App\Models\Documento;
use App\Services\ConversorOfficeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AnexoController extends Controller
{
    public function __construct(private ConversorOfficeService $conversorOffice)
    {
    }

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
     * POST /anexos/{anexo}/nova-versao
     *
     * Substitui o ficheiro de um anexo já existente — fluxo pensado para
     * quando o utilizador descarrega um Word/Excel, edita-o no
     * computador (Word, Excel, LibreOffice...) e volta a carregar a
     * versão corrigida, mantendo o mesmo anexo (não cria um novo).
     */
    public function atualizar(Request $request, Anexo $anexo)
    {
        Gate::authorize('carregar', [Anexo::class, $anexo->documento]);

        $maxKb = ((int) config('sgd.anexo_tamanho_maximo_mb', 20)) * 1024;

        $request->validate([
            'ficheiro' => ['required', 'file', "max:{$maxKb}"],
        ]);

        $ficheiro = $request->file('ficheiro');
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
        $caminhoAntigo = $anexo->caminho_minio;
        $tamanhoAntigo = $anexo->tamanho_bytes;

        $nomeArmazenado = Str::uuid().'.'.$ficheiro->getClientOriginalExtension();
        $novoCaminho = $ficheiro->storeAs('anexos/'.$anexo->documento_id, $nomeArmazenado, $disco);

        $anexo->update([
            'nome_ficheiro' => $ficheiro->getClientOriginalName(),
            'caminho_minio' => $novoCaminho,
            'tamanho_bytes' => $ficheiro->getSize(),
            'tipo_mime' => $mimeReal,
        ]);

        // Só apaga o ficheiro antigo depois de o novo estar guardado e o
        // registo atualizado com sucesso — nunca fica sem nenhum ficheiro
        // válido, mesmo que algo falhe a meio.
        Storage::disk($disco)->delete($caminhoAntigo);

        Auditoria::create([
            'utilizador_id' => $request->user()->id,
            'acao' => 'atualizar_anexo',
            'entidade_afetada' => 'anexos',
            'entidade_id' => $anexo->id,
            'endereco_ip' => $request->ip(),
            'detalhes' => [
                'documento_id' => $anexo->documento_id,
                'nome_ficheiro' => $anexo->nome_ficheiro,
                'tamanho_anterior' => $tamanhoAntigo,
                'tamanho_novo' => $anexo->tamanho_bytes,
            ],
            'ocorrido_em' => now(),
        ]);

        return $anexo->fresh();
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
     * GET /anexos/{anexo}/preview-pdf
     *
     * Para anexos Word/Excel/PowerPoint (sem visualizador nativo no
     * browser): converte-os para PDF via LibreOffice e devolve esse PDF,
     * para pré-visualização no mesmo modal já usado para PDFs. Anexos
     * que já são PDF são devolvidos tal como estão (não há nada a
     * converter).
     */
    public function previewPdf(Request $request, Anexo $anexo)
    {
        Gate::authorize('ver', $anexo);

        $disco = config('filesystems.default', 'local');

        if (! Storage::disk($disco)->exists($anexo->caminho_minio)) {
            return response()->json([
                'error' => ['code' => 'not_found', 'message' => 'Ficheiro não encontrado no armazenamento.'],
            ], 404);
        }

        if ($anexo->tipo_mime === 'application/pdf') {
            return Storage::disk($disco)->response($anexo->caminho_minio, $anexo->nome_ficheiro, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        if (! $this->conversorOffice->converteMime($anexo->tipo_mime)) {
            return response()->json([
                'error' => [
                    'code' => 'unprocessable_entity',
                    'message' => 'Este tipo de ficheiro não pode ser pré-visualizado.',
                ],
            ], 422);
        }

        // O LibreOffice precisa de um caminho de ficheiro local — se o
        // disco configurado não for local (ex.: S3/MinIO), copia-se
        // primeiro para um ficheiro temporário (ver obterCaminhoLocal).
        try {
            $caminhoOrigem = $this->obterCaminhoLocal($disco, $anexo->caminho_minio);
            $caminhoPdf = $this->conversorOffice->converterParaPdf($caminhoOrigem);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ['code' => 'conversion_failed', 'message' => $e->getMessage()],
            ], 500);
        } finally {
            if ($disco !== 'local' && $disco !== 'public' && isset($caminhoOrigem) && is_file($caminhoOrigem)) {
                @unlink($caminhoOrigem);
            }
        }

        $nomePdf = pathinfo($anexo->nome_ficheiro, PATHINFO_FILENAME).'.pdf';
        $pastaTrabalho = dirname($caminhoPdf);

        app()->terminating(function () use ($pastaTrabalho) {
            $this->conversorOffice->apagarPasta($pastaTrabalho);
        });

        return response()->file($caminhoPdf, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$nomePdf.'"',
        ]);
    }

    /**
     * Devolve um caminho de ficheiro local para o anexo, copiando-o para
     * um ficheiro temporário se o disco configurado não for local.
     */
    private function obterCaminhoLocal(string $disco, string $caminhoRelativo): string
    {
        if ($disco === 'local' || $disco === 'public') {
            return Storage::disk($disco)->path($caminhoRelativo);
        }

        $extensao = pathinfo($caminhoRelativo, PATHINFO_EXTENSION);
        $temporario = storage_path('app/conversao-office/origem-'.Str::uuid().'.'.$extensao);
        @mkdir(dirname($temporario), 0775, true);
        file_put_contents($temporario, Storage::disk($disco)->get($caminhoRelativo));

        return $temporario;
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
