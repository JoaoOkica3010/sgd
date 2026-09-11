<?php

namespace App\Console\Commands;

use App\Models\Documento;
use App\Models\EstadoDocumento;
use Illuminate\Console\Command;

/**
 * Preenche retroativamente a entrada inicial de histórico (estados_documento)
 * para documentos criados antes da correção que passou a registar essa
 * entrada automaticamente em DocumentoController::store().
 *
 * Só afeta documentos sem NENHUMA entrada de histórico — por definição,
 * esses documentos nunca passaram por uma transição de estado (o
 * WorkflowService::transitar já regista uma entrada em cada transição),
 * logo continuam garantidamente no estado inicial "recepcao".
 */
class BackfillHistoricoCriacao extends Command
{
    protected $signature = 'sgd:backfill-historico-criacao {--dry-run : Mostra o que seria feito, sem gravar nada}';

    protected $description = 'Cria a entrada inicial de histórico em falta para documentos criados antes da correção do registo automático.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $documentos = Documento::whereDoesntHave('historicoEstados')->get();

        if ($documentos->isEmpty()) {
            $this->info('Nenhum documento em falta — todos já têm histórico.');

            return self::SUCCESS;
        }

        $this->info(($dryRun ? '[dry-run] ' : '')."A processar {$documentos->count()} documento(s) sem histórico...");

        foreach ($documentos as $documento) {
            $this->line(" - {$documento->numero_registo} (estado atual: {$documento->estado_atual}, criado por utilizador #{$documento->criado_por})");

            if ($dryRun) {
                continue;
            }

            EstadoDocumento::create([
                'documento_id' => $documento->id,
                'estado' => $documento->estado_atual,
                'alterado_por' => $documento->criado_por,
                'justificacao' => null,
                'alterado_em' => $documento->criado_em ?? $documento->created_at ?? now(),
            ]);
        }

        $this->info($dryRun
            ? 'Concluído (dry-run) — nada foi gravado. Corre sem --dry-run para aplicar.'
            : 'Concluído — histórico inicial criado para os documentos listados acima.');

        return self::SUCCESS;
    }
}
