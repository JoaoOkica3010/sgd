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

// A assinatura não faz parte do tipo Documento oficial ainda (ver TODO em
// DetalheDocumento.tsx). Mantemos o mesmo "as any" até esse tipo existir.
type Assinatura = { utilizador?: { nome: string }; assinado_em: string } | null | undefined;

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
  const assinatura = (documento as any).assinatura as Assinatura;
  const entradaCriacao = historico[0];

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
    <div className="ficha-documento" style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <div style={estilos.linhaCabecalho}>
          <div>
            <div style={estilos.rotuloFicha}>Ficha do documento</div>
            <div style={estilos.numeroRegisto}>{documento.numero_registo}</div>
            <div style={estilos.assunto}>{documento.assunto}</div>
            <div style={estilos.remetente}>{documento.remetente}</div>
          </div>
          <button className="no-print" onClick={imprimir} style={estilos.botaoImprimir}>
            <IconeImpressora />
            Imprimir
          </button>
        </div>
      </div>

      <section style={estilos.cartao}>
        <h2 style={estilos.tituloSeccao}>Detalhes do documento</h2>
        <div style={estilos.grelhaDados}>
          <Campo rotulo="Número de registo" valor={documento.numero_registo} />
          <Campo rotulo="Tipo" valor={documento.tipo_documento} />
          <Campo rotulo="Remetente" valor={documento.remetente} />
          <Campo rotulo="Prioridade" valor={documento.prioridade} />
          <Campo
            rotulo="Criado por"
            valor={entradaCriacao?.alteradoPor?.nome ?? (documento as any).criadoPor?.nome ?? "—"}
          />
          <Campo rotulo="Data de criação" valor={formatarData(documento.criado_em)} />
          <Campo
            rotulo="Estado atual"
            valor={ROTULOS_ESTADO[documento.estado_atual] ?? documento.estado_atual}
            span2
          />
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
                marginBottom: i === observacoes.length - 1 ? 0 : 12,
                paddingBottom: i === observacoes.length - 1 ? 0 : 12,
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
          historico.map((h, i) => (
            <div key={i} style={estilos.linhaTempo}>
              <div style={estilos.marcadorColuna}>
                <div style={estilos.marcadorCirculo} />
                {i < historico.length - 1 && <div style={estilos.marcadorLinha} />}
              </div>
              <div style={{ paddingBottom: i === historico.length - 1 ? 0 : 18 }}>
                <div style={estilos.itemEstado}>{ROTULOS_ESTADO[h.estado] ?? h.estado}</div>
                <div style={estilos.itemMeta}>
                  {formatarData(h.alterado_em)} · {h.alteradoPor?.nome ?? "—"}
                </div>
                {h.justificacao && <div style={estilos.itemJustificacao}>{h.justificacao}</div>}
              </div>
            </div>
          ))
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

function Campo({ rotulo, valor, span2 }: { rotulo: string; valor: string; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: "span 2" } : undefined}>
      <div style={estilos.rotuloDado}>{rotulo}</div>
      <div style={estilos.valorDado}>{valor}</div>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    maxWidth: 760,
    margin: "0 auto",
    fontFamily: "Arial, Helvetica, sans-serif",
    background: "#fdfcf8",
    padding: 24,
  },
  cabecalho: {
    borderBottom: "1px solid #e7e5e5",
    paddingBottom: 16,
    marginBottom: 20,
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
    border: "1.5px solid #d92b1f",
    borderRadius: 8,
    background: "#ffffff",
    color: "#d92b1f",
    cursor: "pointer",
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
    color: "#1c2b4a",
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
    padding: 24,
    marginBottom: 16,
  },
  cartaoAssinatura: {
    background: "#ffffff",
    border: "1px solid #e7e5e5",
    borderLeft: "3px solid #d92b1f",
    borderRadius: 12,
    padding: 24,
  },
  tituloSeccao: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a8371",
    margin: "0 0 16px",
  },
  grelhaDados: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px 20px",
  },
  rotuloDado: {
    fontSize: 12,
    color: "#8a8371",
    marginBottom: 4,
  },
  valorDado: {
    fontSize: 15,
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
    paddingBottom: 12,
    marginBottom: 12,
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
  linhaTempo: {
    display: "flex",
    gap: 12,
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
  },
  marcadorLinha: {
    width: 1,
    flex: 1,
    background: "#ddd6c4",
  },
  itemEstado: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1c2b4a",
  },
  itemMeta: {
    fontSize: 12,
    color: "#8a8371",
    marginTop: 2,
  },
  itemJustificacao: {
    fontSize: 12,
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
