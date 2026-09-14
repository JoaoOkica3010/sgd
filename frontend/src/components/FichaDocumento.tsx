import { ROTULOS_ESTADO, type Documento, type EstadoHistorico } from "../types";

// Mesmo contrato de observação usado em DetalheDocumento.tsx.
// Se vieres a extrair este tipo para um ficheiro partilhado (ex: types.ts),
// importa-o de lá em vez de o duplicar aqui.
export type Observacao = {
  id: number;
  autor: string;
  perfil: string;
  texto: string;
  estadoCriacao: string;
  estadoLabel: string;
  criadoEm: string;
};

interface FichaDocumentoProps {
  documento: Documento;
  historico: EstadoHistorico[];
  observacoes: Observacao[];
  // Quando não fornecido (uso como separador dentro de DetalheDocumento.tsx),
  // o botão abre a página standalone /documentos/{id}/ficha numa nova janela
  // já com o diálogo de impressão a abrir sozinho. Quando fornecido (uso em
  // FichaDocumentoPagina.tsx), chama diretamente window.print().
  aoImprimir?: () => void;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FichaDocumento({ documento, historico, observacoes, aoImprimir }: FichaDocumentoProps) {
  const assinatura = documento.assinatura;
  const entradaCriacao = historico[0];

  // Mesmo sinal já usado para decidir como imprimir (ver imprimir() abaixo):
  // sem aoImprimir estamos dentro do separador "Ficha" de DetalheDocumento.tsx,
  // que já centra a página inteira — aí a ficha deve ficar alinhada à
  // esquerda, com a mesma largura dos separadores "Detalhes"/"Observações".
  // Com aoImprimir estamos na página autónoma /documentos/{id}/ficha, sem
  // nada à volta a centrar — aí a própria ficha tem de se centrar sozinha.
  const centrado = !!aoImprimir;

  function imprimir() {
    if (aoImprimir) {
      aoImprimir();
      return;
    }
    // Sem handler próprio (estamos dentro do separador da app): abre a
    // página standalone numa nova janela, que dispara a impressão sozinha.
    window.open(`/documentos/${documento.id}/ficha?imprimir=1`, "_blank");
  }

  return (
    <div className="ficha-documento" style={{ ...estilos.pagina, margin: centrado ? "0 auto" : undefined }}>
      <div style={estilos.cabecalho}>
        <div style={estilos.linhaCabecalho}>
          <div>
            <div style={estilos.rotuloFicha}>Ficha do documento</div>
            <div style={estilos.numeroRegisto}>{documento.numero_registo}</div>
            <div style={estilos.assunto}>{documento.assunto}</div>
            <div style={estilos.remetente}>{documento.remetente}</div>
          </div>
          {assinatura ? (
            <button className="no-print botao-outline-tema" onClick={imprimir} style={estilos.botaoImprimir}>
              <IconeImpressora />
              Imprimir
            </button>
          ) : (
            <span className="no-print" style={estilos.avisoSemAssinatura}>
              Impressão disponível após assinatura digital do Ministro.
            </span>
          )}
        </div>
      </div>

      <section style={estilos.cartao}>
        <h2 style={estilos.tituloSeccao}>Detalhes do documento</h2>
        <div style={estilos.grelhaDados}>
          <Campo rotulo="Número de registo" valor={documento.numero_registo} />
          {documento.numero_referencia && (
            <Campo rotulo="Número/Referência" valor={documento.numero_referencia} />
          )}
          <Campo rotulo="Tipo" valor={documento.tipo_documento} />
          <Campo rotulo="Remetente" valor={documento.remetente} />
          <Campo rotulo="Prioridade" valor={documento.prioridade} />
          <Campo
            rotulo="Criado por"
            valor={entradaCriacao?.alterado_por?.nome ?? (documento as any).criadoPor?.nome ?? "—"}
          />
          <Campo
            rotulo="Estado atual"
            valor={ROTULOS_ESTADO[documento.estado_atual] ?? documento.estado_atual}
            novaLinha
          />
          <Campo rotulo="Data de criação" valor={formatarData(documento.criado_em)} />
          {documento.observacoes && <Campo rotulo="Observações gerais" valor={documento.observacoes} span2 />}
        </div>
      </section>

      <section style={estilos.cartao}>
        <h2 style={estilos.tituloSeccao}>Observações ({observacoes.length})</h2>
        {observacoes.length === 0 ? (
          <p style={estilos.semDados}>Sem observações registadas.</p>
        ) : (
          observacoes.map((obs, i) => (
            <div
              key={obs.id}
              style={{
                ...estilos.linhaObservacao,
                borderBottom: i === observacoes.length - 1 ? "none" : estilos.linhaObservacao.borderBottom,
                marginBottom: i === observacoes.length - 1 ? 0 : 8,
                paddingBottom: i === observacoes.length - 1 ? 0 : 8,
              }}
            >
              <div style={estilos.cabecalhoObservacao}>
                <span style={estilos.autorObservacao}>
                  {obs.autor} <span style={estilos.perfilObservacao}>· {obs.perfil}</span>
                </span>
                <span style={estilos.dataObservacao}>{formatarData(obs.criadoEm)}</span>
              </div>
              <div style={estilos.textoObservacao}>{obs.texto}</div>
            </div>
          ))
        )}
      </section>

      <section style={estilos.cartao}>
        <h2 style={estilos.tituloSeccao}>Histórico de estados</h2>
        {historico.length === 0 ? (
          <p style={estilos.semDados}>Sem histórico disponível.</p>
        ) : (
          (() => {
            // Colunas preenchidas de cima para baixo (grid-auto-flow: column),
            // com o histórico já ordenado do mais antigo para o mais recente —
            // por isso cada coluna fica cronológica, e a 2.ª coluna continua a
            // partir de onde a 1.ª termina.
            const linhasPorColuna = Math.ceil(historico.length / 2);
            return (
              <div
                style={{
                  ...estilos.grelhaHistorico,
                  gridTemplateRows: `repeat(${linhasPorColuna}, auto)`,
                }}
              >
                {historico.map((h, i) => {
                  const ultimoDaColuna = i % linhasPorColuna === linhasPorColuna - 1;
                  const mostrarLinha = !ultimoDaColuna && i + 1 < historico.length;
                  return (
                    <div key={i} style={estilos.linhaTempo}>
                      <div style={estilos.marcadorColuna}>
                        <div style={estilos.marcadorCirculo} />
                        {mostrarLinha && <div style={estilos.marcadorLinha} />}
                      </div>
                      <div style={{ paddingBottom: mostrarLinha ? 10 : 0 }}>
                        <div style={estilos.itemEstado}>{ROTULOS_ESTADO[h.estado] ?? h.estado}</div>
                        <div style={estilos.itemMeta}>
                          {formatarData(h.alterado_em)} · {h.alterado_por?.nome ?? "—"}
                        </div>
                        {h.justificacao && <div style={estilos.itemJustificacao}>{h.justificacao}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </section>

      <section style={estilos.cartaoAssinatura}>
        <h2 style={estilos.tituloSeccao}>Assinatura digital</h2>
        {assinatura ? (
          <>
            <div style={estilos.assinaturaTitulo}>Documento assinado digitalmente</div>
            <div style={estilos.assinaturaMeta}>
              {assinatura.utilizador?.nome ?? "—"} · {formatarData(assinatura.assinado_em)}
            </div>
          </>
        ) : (
          <p style={estilos.semDados}>Este documento ainda não foi assinado digitalmente.</p>
        )}
      </section>
    </div>
  );
}

function IconeImpressora() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function Campo({
  rotulo,
  valor,
  span2,
  novaLinha,
}: {
  rotulo: string;
  valor: string;
  span2?: boolean;
  // Força este campo a começar sempre uma nova linha da grelha (coluna 1),
  // independentemente de quantos campos condicionais o precederem — usado
  // para garantir que "Estado atual" e "Data de criação" ficam sempre
  // juntos na última linha, mesmo quando "Número/Referência" não existe.
  novaLinha?: boolean;
}) {
  const estilo: React.CSSProperties = {};
  if (span2) estilo.gridColumn = "span 2";
  if (novaLinha) estilo.gridColumnStart = 1;

  return (
    <div style={Object.keys(estilo).length ? estilo : undefined}>
      <div style={estilos.rotuloDado}>{rotulo}</div>
      <div style={estilos.valorDado}>{valor}</div>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    // Mesma largura dos separadores "Detalhes" (maxWidth 640) e
    // "Observações" (maxWidth 760) em DetalheDocumento.tsx, e fundo branco
    // em vez do creme anterior, para os quatro separadores ficarem
    // visualmente uniformes. O alinhamento (centrado vs. à esquerda) é
    // decidido à parte, em função do contexto — ver "centrado" acima.
    maxWidth: 760,
    fontFamily: "Arial, Helvetica, sans-serif",
    background: "#ffffff",
    padding: 16,
  },
  cabecalho: {
    borderBottom: "1px solid #e7e5e5",
    paddingBottom: 10,
    marginBottom: 12,
  },
  linhaCabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  botaoImprimir: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    cursor: "pointer",
  },
  avisoSemAssinatura: {
    flexShrink: 0,
    maxWidth: 220,
    fontSize: 12,
    color: "#8a8371",
    textAlign: "right",
  },
  rotuloFicha: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#8a8371",
    marginBottom: 4,
  },
  numeroRegisto: {
    fontFamily: "Georgia, serif",
    fontSize: 24,
    fontWeight: 700,
    color: "var(--cor-primaria)",
  },
  assunto: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2b2b2b",
    marginTop: 2,
  },
  remetente: {
    fontSize: 13,
    color: "#8a8371",
  },
  cartao: {
    background: "#ffffff",
    border: "1px solid #e7e5e5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cartaoAssinatura: {
    background: "#ffffff",
    border: "1px solid #e7e5e5",
    borderLeft: "3px solid #d92b1f",
    borderRadius: 12,
    padding: 14,
  },
  tituloSeccao: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a8371",
    margin: "0 0 8px",
  },
  grelhaDados: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 20px",
  },
  rotuloDado: {
    fontSize: 9.5,
    color: "#8a8371",
    marginBottom: 2,
  },
  valorDado: {
    fontSize: 12,
    fontWeight: 600,
    color: "#2b2b2b",
  },
  semDados: {
    fontSize: 13,
    color: "#8a8371",
    margin: 0,
  },
  linhaObservacao: {
    borderBottom: "1px solid #e9e4d5",
    paddingBottom: 8,
    marginBottom: 8,
  },
  cabecalhoObservacao: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 12,
  },
  autorObservacao: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2b2b2b",
  },
  perfilObservacao: {
    fontWeight: 400,
    color: "#8a8371",
  },
  dataObservacao: {
    fontSize: 12,
    color: "#8a8371",
    whiteSpace: "nowrap",
  },
  textoObservacao: {
    fontSize: 13,
    color: "#444444",
  },
  grelhaHistorico: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridAutoFlow: "column",
    rowGap: 8,
    columnGap: 24,
  },
  linhaTempo: {
    display: "flex",
    gap: 8,
  },
  marcadorColuna: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  marcadorCirculo: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: "2px solid #d92b1f",
    background: "#ffffff",
    flexShrink: 0,
    marginTop: 2,
  },
  marcadorLinha: {
    width: 1,
    flex: 1,
    background: "#ddd6c4",
  },
  itemEstado: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--cor-primaria)",
  },
  itemMeta: {
    fontSize: 9.5,
    color: "#8a8371",
    marginTop: 2,
  },
  itemJustificacao: {
    fontSize: 9.5,
    color: "#6b6350",
    marginTop: 4,
  },
  assinaturaTitulo: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2b2b2b",
    marginBottom: 2,
  },
  assinaturaMeta: {
    fontSize: 12,
    color: "#8a8371",
  },
};
