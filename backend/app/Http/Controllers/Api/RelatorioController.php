<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Documento;
use App\Models\Utilizador;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Geração dos relatórios listados na aba "Relatórios" do Dashboard.
 * Cada endpoint devolve um ficheiro CSV para download, compilado a
 * partir dos dados atuais do SGD (sem cache).
 *
 * Reservado a perfis com poderes de administração/direção (mesma
 * autorização que RNF006 usa para a consulta de auditoria), porque
 * cruzam dados entre serviços e utilizadores.
 */
class RelatorioController extends Controller
{
    // Prazo (dias de calendário a contar da criação) por prioridade —
    // mesma regra de negócio usada no Dashboard (frontend).
    private const PRAZO_DIAS_POR_PRIORIDADE = [
        'Muito Urgente' => 1,
        'Urgente' => 2,
        'Normal' => 5,
    ];

    private const ESTADOS_RESOLVIDOS = [Documento::ESTADO_ARQUIVADO, Documento::ESTADO_REJEITADO];

    private const ROTULOS_ESTADO = [
        Documento::ESTADO_RECEPCAO => 'Receção',
        Documento::ESTADO_SUBMETIDO => 'Submetido',
        Documento::ESTADO_VALIDADO_SECRETARIADO => 'Validado (Secretariado)',
        Documento::ESTADO_VALIDADO_CG => 'Validado (Chefe de Gabinete)',
        Documento::ESTADO_ENCAMINHADO => 'Encaminhado',
        Documento::ESTADO_EM_ANALISE => 'Em análise',
        Documento::ESTADO_VALIDADO_SERVICO => 'Validado (serviço)',
        Documento::ESTADO_ARQUIVADO => 'Arquivado',
        Documento::ESTADO_REJEITADO => 'Rejeitado',
    ];

    /**
     * GET /relatorios/documentos-por-estado
     */
    public function documentosPorEstado(): Response
    {
        $this->autorizar();

        $contagens = Documento::query()
            ->selectRaw('estado_atual, count(*) as total')
            ->groupBy('estado_atual')
            ->pluck('total', 'estado_atual');

        $linhas = [];
        foreach (Documento::ESTADOS as $estado) {
            $linhas[] = [self::ROTULOS_ESTADO[$estado], (int) ($contagens[$estado] ?? 0)];
        }

        return $this->csv('documentos-por-estado', ['Estado', 'Quantidade'], $linhas);
    }

    /**
     * GET /relatorios/documentos-por-servico
     */
    public function documentosPorServico(): Response
    {
        $this->autorizar();

        $linhas = Documento::query()
            ->leftJoin('servicos', 'servicos.id', '=', 'documentos.servico_destino_id')
            ->selectRaw("coalesce(servicos.nome, 'Sem serviço atribuído') as servico, count(*) as total")
            ->groupByRaw("coalesce(servicos.nome, 'Sem serviço atribuído')")
            ->orderByDesc('total')
            ->get()
            ->map(fn ($linha) => [$linha->servico, (int) $linha->total])
            ->all();

        return $this->csv('documentos-por-servico', ['Serviço', 'Quantidade'], $linhas);
    }

    /**
     * GET /relatorios/fora-de-prazo
     */
    public function foraDePrazo(): Response
    {
        $this->autorizar();

        $documentos = Documento::query()
            ->whereNotIn('estado_atual', self::ESTADOS_RESOLVIDOS)
            ->orderBy('criado_em')
            ->get();

        $agora = now();
        $linhas = [];

        foreach ($documentos as $documento) {
            $diasPrazo = self::PRAZO_DIAS_POR_PRIORIDADE[$documento->prioridade] ?? self::PRAZO_DIAS_POR_PRIORIDADE['Normal'];
            $dataLimite = $documento->criado_em->copy()->addDays($diasPrazo);

            if ($agora->lessThanOrEqualTo($dataLimite)) {
                continue;
            }

            $diasAtraso = max(1, (int) ceil(($agora->getTimestamp() - $dataLimite->getTimestamp()) / 86400));

            $linhas[] = [
                $documento->numero_registo,
                $documento->assunto,
                $documento->remetente,
                $documento->prioridade,
                self::ROTULOS_ESTADO[$documento->estado_atual] ?? $documento->estado_atual,
                (int) $diasAtraso,
            ];
        }

        usort($linhas, fn ($a, $b) => $b[5] <=> $a[5]);

        return $this->csv(
            'fora-de-prazo',
            ['Número de registo', 'Assunto', 'Remetente', 'Prioridade', 'Estado', 'Dias em atraso'],
            $linhas
        );
    }

    /**
     * GET /relatorios/atividade-por-utilizador
     */
    public function atividadePorUtilizador(): Response
    {
        $this->autorizar();

        $linhas = Auditoria::query()
            ->join('utilizadores', 'utilizadores.id', '=', 'auditoria.utilizador_id')
            ->selectRaw('utilizadores.nome as nome, utilizadores.email as email, count(*) as total')
            ->groupBy('utilizadores.id', 'utilizadores.nome', 'utilizadores.email')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($linha) => [$linha->nome, $linha->email, (int) $linha->total])
            ->all();

        return $this->csv('atividade-por-utilizador', ['Utilizador', 'Email', 'Ações registadas'], $linhas);
    }

    /**
     * GET /relatorios/volume-mensal
     */
    public function volumeMensal(): Response
    {
        $this->autorizar();

        $inicio = now()->subMonthsNoOverflow(11)->startOfMonth();

        // Agregado em PHP (em vez de funções de data específicas do motor de
        // BD) para funcionar tanto em PostgreSQL (produção) como em
        // MySQL/MariaDB (ambiente de desenvolvimento local com XAMPP).
        $contagens = Documento::query()
            ->where('criado_em', '>=', $inicio)
            ->pluck('criado_em')
            ->countBy(fn ($dataCriacao) => $dataCriacao->format('Y-m'));

        $linhas = [];
        for ($i = 0; $i < 12; $i++) {
            $mes = $inicio->copy()->addMonthsNoOverflow($i);
            $chave = $mes->format('Y-m');
            $linhas[] = [$mes->translatedFormat('F Y'), (int) ($contagens[$chave] ?? 0)];
        }

        return $this->csv('volume-mensal', ['Mês', 'Documentos recebidos'], $linhas);
    }

    /**
     * GET /relatorios/auditoria-acessos
     */
    public function auditoriaAcessos(): Response
    {
        $this->autorizar();

        $linhas = Auditoria::query()
            ->with('utilizador:id,nome,email')
            ->whereIn('acao', ['login', 'logout'])
            ->orderByDesc('ocorrido_em')
            ->limit(2000)
            ->get()
            ->map(fn (Auditoria $registo) => [
                $registo->utilizador?->nome ?? 'Desconhecido',
                $registo->utilizador?->email ?? '—',
                $registo->acao === 'login' ? 'Início de sessão' : 'Fim de sessão',
                $registo->endereco_ip ?? '—',
                $registo->ocorrido_em->format('Y-m-d H:i:s'),
            ])
            ->all();

        return $this->csv('auditoria-acessos', ['Utilizador', 'Email', 'Ação', 'Endereço IP', 'Data/hora'], $linhas);
    }

    private function autorizar(): void
    {
        Gate::authorize('administrar', Utilizador::class);
    }

    /**
     * Gera uma resposta CSV (UTF-8 com BOM, para acentuação correta ao
     * abrir no Excel) a partir de um cabeçalho e de linhas já formatadas.
     *
     * @param  list<string>  $cabecalho
     * @param  list<list<int|string>>  $linhas
     */
    private function csv(string $nomeFicheiro, array $cabecalho, array $linhas): Response
    {
        $memoria = fopen('php://memory', 'w+');
        fwrite($memoria, "\xEF\xBB\xBF"); // BOM UTF-8
        fputcsv($memoria, $cabecalho, ';');

        foreach ($linhas as $linha) {
            fputcsv($memoria, $linha, ';');
        }

        rewind($memoria);
        $conteudo = stream_get_contents($memoria);
        fclose($memoria);

        $dataAtual = now()->format('Y-m-d');

        return response($conteudo, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$nomeFicheiro}-{$dataAtual}.csv\"",
        ]);
    }
}
