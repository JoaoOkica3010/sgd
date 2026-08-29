import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarDocumentos } from "../api/documentos";
import { ROTULOS_ESTADO, type Documento } from "../types";
import { useAuth } from "../auth/AuthContext";

const FILTROS_ESTADO = ["Todos", "Submetido", "Encaminhado", "Rejeitado"] as const;
type FiltroEstado = (typeof FILTROS_ESTADO)[number];

const PERFIS_PODEM_CRIAR = ["RECEP", "SECR", "ADMIN"];

export function ListaDocumentos() {
  const { utilizador, logout } = useAuth();
  const podeCriar = !!utilizador?.perfil && PERFIS_PODEM_CRIAR.includes(utilizador.perfil);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [termo, setTermo] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("Todos");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar(q?: string) {
    setACarregar(true);
    setErro(null);
    try {
      const pagina = await listarDocumentos({ q });
      setDocumentos(pagina.data);
    } catch {
      setErro("Não foi possível carregar os documentos.");
    } finally {
      setACarregar(false);
    }
  }

  const documentosFiltrados = useMemo(() => {
    if (filtro === "Todos") return documentos;
    return documentos.filter((doc) => ROTULOS_ESTADO[doc.estado_atual] === filtro);
  }, [documentos, filtro]);

  return (
    <div style={estilos.pagina}>
      <header style={estilos.navbar}>
        <div style={estilos.marca}>
          <div style={estilos.selo}>M</div>
          <div>
            <div style={estilos.marcaTitulo}>SGD · MTTED</div>
            <div style={estilos.marcaSubtitulo}>Gestão Documental</div>
          </div>
        </div>
        <div style={estilos.utilizadorArea}>
          <span style={estilos.utilizadorNome}>{utilizador?.nome}</span>
          {utilizador?.perfil && <span style={estilos.perfilBadge}>{utilizador.perfil}</span>}
          <button onClick={() => logout()} style={estilos.botaoSessao}>
            Terminar sessão
          </button>
        </div>
      </header>

      <main style={estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <h1 style={estilos.titulo}>Documentos</h1>
          <span style={estilos.contagem}>
            {documentos.length} registo{documentos.length === 1 ? "" : "s"} ·{" "}
            {filtro === "Todos" ? "a mostrar todos" : `a mostrar ${filtro}`}
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            carregar(termo);
          }}
          style={estilos.barraFerramentas}
        >
          <div style={estilos.campoPesquisaContentor}>
            <span style={estilos.iconePesquisa}>⌕</span>
            <input
              placeholder="Pesquisar por número, remetente ou assunto..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              style={estilos.campoPesquisa}
            />
          </div>

          <div style={estilos.filtros}>
            {FILTROS_ESTADO.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setFiltro(opcao)}
                style={{
                  ...estilos.filtroBotao,
                  ...(filtro === opcao ? estilos.filtroBotaoAtivo : {}),
                }}
              >
                {opcao}
              </button>
            ))}
          </div>

          <div style={estilos.colunaAcoesTopo}>
            <Link to="/dashboard" style={estilos.botaoDashboard}>
              Ver dashboard →
            </Link>
            {podeCriar && (
              <Link to="/documentos/novo" style={{ textDecoration: "none" }}>
                <button type="button" style={estilos.botaoNovo}>
                  + Novo registo
                </button>
              </Link>
            )}
          </div>
        </form>

        {aCarregar && <p style={estilos.mensagemEstado}>A carregar...</p>}
        {erro && <p style={{ ...estilos.mensagemEstado, color: "#b3261e" }}>{erro}</p>}

        {!aCarregar && !erro && (
          <div style={estilos.tabelaCartao}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.th}>Nº registo</th>
                  <th style={estilos.th}>Remetente</th>
                  <th style={estilos.th}>Assunto</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((doc, indice) => {
                  const rotuloEstado = ROTULOS_ESTADO[doc.estado_atual];
                  return (
                    <tr key={doc.id} style={{ ...estilos.linha, backgroundColor: indice % 2 === 1 ? "#f7f6f6" : "#ffffff" }}>
                      <td style={estilos.td}>
                        <Link to={`/documentos/${doc.id}`} style={estilos.linkRegisto}>
                          {doc.numero_registo}
                        </Link>
                      </td>
                      <td style={estilos.td}>{doc.remetente}</td>
                      <td style={estilos.td}>{doc.assunto}</td>
                      <td style={estilos.td}>
                        <span style={{ ...estilos.badge, ...estiloEstado(rotuloEstado) }}>
                          <span style={estilos.badgePonto} />
                          {rotuloEstado}
                        </span>
                      </td>
                      <td style={estilos.td}>
                        <span style={{ ...estilos.badge, ...estiloPrioridade(doc.prioridade) }}>
                          {doc.prioridade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {documentosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} style={estilos.vazio}>
                      Nenhum documento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function estiloEstado(rotulo: string): React.CSSProperties {
  switch (rotulo) {
    case "Submetido":
      return { backgroundColor: "#fdf1e0", color: "#92600f" };
    case "Em análise":
      return { backgroundColor: "#e8f3ec", color: "#1f7a4d" };
    case "Encaminhado":
      return { backgroundColor: "#e8edfb", color: "#2854c9" };
    case "Rejeitado":
      return { backgroundColor: "#fdeceb", color: "#d92b1f" };
    case "Validado (serviço)":
      return { backgroundColor: "#e8f3ec", color: "#1f7a4d" };
    case "Arquivado":
      return { backgroundColor: "#f0eeee", color: "#6b6350" };
    default:
      return { backgroundColor: "#f0eeee", color: "#6b6350" };
  }
}

function estiloPrioridade(prioridade: string): React.CSSProperties {
  switch (prioridade) {
    case "Muito urgente":
      return { backgroundColor: "#fdeceb", color: "#d92b1f" };
    case "Urgente":
      return { backgroundColor: "#fdf1e0", color: "#92600f" };
    case "Normal":
    default:
      return { backgroundColor: "#f0eeee", color: "#6b6350" };
  }
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  navbar: {
    backgroundColor: "#1c2b4a",
    padding: "16px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marca: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  selo: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1.5px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 16,
  },
  marcaTitulo: {
    color: "#ffffff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 16,
  },
  marcaSubtitulo: {
    color: "#b9c2d6",
    fontSize: 12,
  },
  utilizadorArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  utilizadorNome: {
    color: "#ffffff",
    fontSize: 14,
  },
  perfilBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    padding: "4px 10px",
    borderRadius: 6,
  },
  botaoSessao: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#ffffff",
    fontSize: 13,
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  conteudo: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 32px 48px",
  },
  cabecalhoLista: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  titulo: {
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 28,
    color: "#1c2b4a",
  },
  contagem: {
    fontSize: 13,
    color: "#7a735f",
  },
  barraFerramentas: {
    display: "flex",
    gap: 10,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  campoPesquisaContentor: {
    position: "relative",
    flex: 1,
    minWidth: 240,
  },
  iconePesquisa: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9a927c",
    fontSize: 16,
  },
  campoPesquisa: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px 11px 36px",
    fontSize: 14,
    border: "1px solid #e6e0cf",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#2b2b2b",
    outline: "none",
  },
  filtros: {
    display: "flex",
    gap: 6,
  },
  filtroBotao: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid #e6e0cf",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#4a4638",
    cursor: "pointer",
  },
  filtroBotaoAtivo: {
    backgroundColor: "#1c2b4a",
    borderColor: "#1c2b4a",
    color: "#ffffff",
  },
  colunaAcoesTopo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
  },
  botaoDashboard: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    color: "#1c2b4a",
    backgroundColor: "transparent",
    border: "1.5px solid #1c2b4a",
    borderRadius: 8,
    textDecoration: "none",
    display: "inline-block",
    whiteSpace: "nowrap",
  },
  botaoNovo: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  mensagemEstado: {
    color: "#6b6350",
    fontSize: 14,
  },
  tabelaCartao: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e5e5",
    borderRadius: 12,
    overflow: "hidden",
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "16px 24px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#8a8371",
    borderBottom: "1px solid #e6e0cf",
  },
  linha: {
    borderBottom: "1px solid #e9e4d5",
  },
  td: {
    padding: "18px 24px",
    fontSize: 14,
    color: "#3a3629",
    verticalAlign: "top",
  },
  linkRegisto: {
    color: "#1c2b4a",
    fontWeight: 700,
    textDecoration: "none",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  badgePonto: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: "currentColor",
  },
  vazio: {
    padding: 32,
    textAlign: "center",
    color: "#8a8371",
    fontSize: 14,
  },
};
