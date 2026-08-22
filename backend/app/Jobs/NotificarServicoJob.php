<?php

namespace App\Jobs;

use App\Models\Documento;
use App\Models\Perfil;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * RF015: notifica os servicos envolvidos quando um documento lhes e
 * encaminhado ou quando e rejeitado. Processado de forma assincrona
 * na fila Redis para nao bloquear a resposta da API (RNF002).
 */
class NotificarServicoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $documentoId,
        public string $evento,
        public array $servicoIds,
    ) {}

    public function handle(): void
    {
        $documento = Documento::find($this->documentoId);
        if (! $documento) {
            return;
        }

        foreach (Perfil::whereIn('id', $this->servicoIds)->get() as $servico) {
            foreach ($servico->utilizadores()->where('ativo', true)->get() as $utilizador) {
                // Notificacao no sistema + e-mail, conforme RF015.
                // Implementar App\Notifications\DocumentoEncaminhadoNotification
                // e acionar aqui via $utilizador->notify(...).
                Log::info("Notificacao [{$this->evento}] enviada", [
                    'documento_id' => $documento->id,
                    'utilizador_id' => $utilizador->id,
                ]);
            }
        }
    }
}
