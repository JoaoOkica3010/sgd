<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Converte documentos Office (Word/Excel/PowerPoint) para PDF usando o
 * LibreOffice em modo headless, para que possam ser pré-visualizados no
 * mesmo <iframe> já usado para PDFs — sem precisar de abrir o Word/Excel
 * no computador do utilizador.
 *
 * Pré-requisito: o LibreOffice tem de estar instalado no servidor. O
 * caminho para o executável é configurável via SGD_LIBREOFFICE_BINARIO
 * no .env; se não for definido, tenta localizações habituais consoante
 * o sistema operativo.
 */
class ConversorOfficeService
{
    private const MIME_CONVERTIVEIS = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    public function converteMime(string $mime): bool
    {
        return in_array($mime, self::MIME_CONVERTIVEIS, true);
    }

    /**
     * Converte o ficheiro local em $caminhoOrigem para PDF e devolve o
     * caminho absoluto do PDF resultante. Lança RuntimeException com uma
     * mensagem percetível para o utilizador em caso de falha.
     */
    public function converterParaPdf(string $caminhoOrigem): string
    {
        $binario = $this->localizarBinario();

        if (! $binario) {
            throw new RuntimeException(
                'O LibreOffice não está configurado neste servidor. '.
                'Defina SGD_LIBREOFFICE_BINARIO no .env com o caminho para o soffice.'
            );
        }

        // Perfil de utilizador único por conversão: o LibreOffice não
        // suporta bem duas conversões em simultâneo com o mesmo perfil
        // (fica bloqueado à espera de um lock) — isto evita esse problema
        // quando duas pessoas pré-visualizam ao mesmo tempo.
        $pastaTrabalho = storage_path('app/conversao-office/'.Str::uuid());
        $pastaPerfil = $pastaTrabalho.'/perfil';
        @mkdir($pastaTrabalho, 0775, true);
        @mkdir($pastaPerfil, 0775, true);

        $filtro = $this->filtroPdfPara($caminhoOrigem);

        $comando = [
            $binario,
            '--headless',
            '--norestore',
        ];

        if (config('sgd.libreoffice_perfil_isolado', true)) {
            $comando[] = '-env:UserInstallation=file:///'.str_replace('\\', '/', $pastaPerfil);
        }

        $comando[] = '--convert-to';
        $comando[] = $filtro;
        $comando[] = '--outdir';
        $comando[] = $pastaTrabalho;
        $comando[] = $caminhoOrigem;

        $resultado = Process::timeout(90)->run($comando);

        if (! $resultado->successful()) {
            Log::warning('Falha ao converter documento com LibreOffice', [
                'comando' => $comando,
                'codigo_saida' => $resultado->exitCode(),
                'saida' => $resultado->output(),
                'erro' => $resultado->errorOutput(),
            ]);
            $this->apagarPasta($pastaTrabalho);
            throw new RuntimeException('Não foi possível converter o documento para pré-visualização.');
        }

        // O perfil do LibreOffice já não é necessário depois da conversão
        // — só o PDF resultante. Apaga-se já para não acumular lixo.
        $this->apagarPasta($pastaPerfil);

        $nomeBase = pathinfo($caminhoOrigem, PATHINFO_FILENAME);
        $caminhoPdf = $pastaTrabalho.'/'.$nomeBase.'.pdf';

        if (! is_file($caminhoPdf)) {
            $this->apagarPasta($pastaTrabalho);
            throw new RuntimeException('A conversão terminou mas o PDF não foi encontrado.');
        }

        return $caminhoPdf;
    }

    /**
     * Apaga uma pasta e todo o seu conteúdo. Usado para limpar a pasta de
     * trabalho da conversão (perfil do LibreOffice, e depois de servido,
     * o próprio PDF) — sem isto, cada pré-visualização deixaria ficheiros
     * por apagar em storage/app/conversao-office.
     */
    public function apagarPasta(string $pasta): void
    {
        if (! is_dir($pasta)) {
            return;
        }

        $itens = scandir($pasta) ?: [];

        foreach ($itens as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $caminho = $pasta.'/'.$item;

            if (is_dir($caminho)) {
                $this->apagarPasta($caminho);
            } else {
                @unlink($caminho);
            }
        }

        @rmdir($pasta);
    }

    /**
     * O modo --headless do LibreOffice, pelo menos nesta versão/SO, nem
     * sempre consegue adivinhar sozinho o filtro de exportação certo a
     * partir de só "pdf" — falha silenciosamente (código de saída 3,
     * sem mensagem nenhuma). No modo gráfico normal isto nunca acontece
     * porque a pessoa escolhe "Exportar como PDF" explicitamente; aqui
     * replicamos essa escolha explícita consoante o tipo de origem.
     */
    private function filtroPdfPara(string $caminhoOrigem): string
    {
        $ext = strtolower(pathinfo($caminhoOrigem, PATHINFO_EXTENSION));

        return match ($ext) {
            'xls', 'xlsx', 'ods', 'csv' => 'pdf:calc_pdf_Export',
            'ppt', 'pptx', 'odp' => 'pdf:impress_pdf_Export',
            default => 'pdf:writer_pdf_Export',
        };
    }

    private function localizarBinario(): ?string
    {
        $configurado = config('sgd.libreoffice_binario');

        if ($configurado && is_file($configurado)) {
            return $configurado;
        }

        $candidatos = [
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            '/usr/bin/soffice',
            '/usr/local/bin/soffice',
            '/opt/libreoffice/program/soffice',
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        ];

        foreach ($candidatos as $candidato) {
            if (is_file($candidato)) {
                return $candidato;
            }
        }

        return null;
    }
}
