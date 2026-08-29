import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarDocumentos } from "../api/documentos";
import { ROTULOS_ESTADO, type Documento } from "../types";
import { useAuth } from "../auth/AuthContext";

/**
 * NOTAS IMPORTANTES SOBRE OS DADOS DESTE DASHBOARD
 * ---------------------------------------------------------------
 * Esta página usa, por agora, o mesmo endpoint `listarDocumentos`
 * já existente em `ListaDocumentos.tsx`. Isto permite calcular:
 *   - Os contadores por estado (cartões do topo)
 *   - A lista "A aguardar a minha ação" (reaproveita a lógica de
 *     permissões usada em DetalheDocumento.tsx)
 *
 * Duas secções do design NÃO têm, para já, uma fonte de dados real
 * no código que me enviou, por isso aparecem com um estado vazio
 * explicativo em vez de números inventados:
 *   1. "Atividade" — precisa de um feed de auditoria (quem fez o quê
 *      e quando, em todos os documentos). Sugestão: um endpoint tipo
 *      `listarAtividadeRecente(): Promise<AtividadeItem[]>`.
 *   2. "Fora de prazo" — precisa de um campo de prazo/limite por
 *      documento (ex.: `prazo_limite: string`) que não vi no tipo
 *      `Documento` partilhado. Assim que existir, é fácil calcular.
 *
 * Quando esses dois pontos existirem na API, basta substituir os
 * blocos assinalados com "TODO" abaixo.
 * ---------------------------------------------------------------
 */

const ITENS_POR_PAGINA = 2;

export function Dashboard() {
  const { utilizador, logout } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    setACarregar(true);
    setErro(null);
    try {
      const resultado = await listarDocumentos({});
      setDocumentos(resultado.data);
    } catch {
      setErro("Não foi possível carregar os indicadores.");
    } finally {
      setACarregar(false);
    }
  }

  const contadores = useMemo(() => {
    const contar = (estado: string) => documentos.filter((d) => d.estado_atual === estado).length;
    return {
      paraDespacho: contar("validado_secretariado"),
      encaminhados: contar("encaminhado"),
      emAnalise: contar("em_analise"),
      paraArquivo: contar("validado_servico"),
      rejeitados: contar("rejeitado"),
    };
  }, [documentos]);

  const perfil = utilizador?.perfil;

  const aguardarAcao = useMemo(() => {
    return documentos.filter((doc) => precisaAcaoDoUtilizador(doc, perfil));
  }, [documentos, perfil]);

  const totalPaginas = Math.max(1, Math.ceil(aguardarAcao.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPagina = aguardarAcao.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

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
          <h1 style={estilos.titulo}>Dashboard</h1>
          <Link to="/documentos" style={estilos.linkLista}>
            Ver todos os documentos →
          </Link>
        </div>

        {erro && <p style={{ ...estilos.mensagemEstado, color: "#b3261e" }}>{erro}</p>}

        <div className="grelha-kpi">
          <CartaoKpi
            cor="despacho"
            rotulo="Para despacho"
            valor={contadores.paraDespacho}
            legenda="validados pelo Secretariado"
            aCarregar={aCarregar}
          />
          <CartaoKpi
            cor="encaminhados"
            rotulo="Encaminhados"
            valor={contadores.encaminhados}
            legenda="em serviços"
            aCarregar={aCarregar}
          />
          <CartaoKpi
            cor="analise"
            rotulo="Em análise"
            valor={contadores.emAnalise}
            legenda="em curso"
            aCarregar={aCarregar}
          />
          <CartaoKpi
            cor="arquivo"
            rotulo="Para arquivo"
            valor={contadores.paraArquivo}
            legenda="validados por serviço"
            aCarregar={aCarregar}
          />
          <CartaoKpi
            cor="rejeitados"
            rotulo="Rejeitados"
            valor={contadores.rejeitados}
            legenda="no total"
            aCarregar={aCarregar}
          />
        </div>

        <div style={estilos.grelhaPrincipal}>
          <section style={estilos.colunaLista}>
            <h2 style={estilos.tituloSeccao}>A aguardar a minha ação</h2>

            {aCarregar && <p style={estilos.mensagemEstado}>A carregar...</p>}

            {!aCarregar && itensPagina.length === 0 && (
              <p style={estilos.mensagemEstado}>Não tem documentos à espera de ação.</p>
            )}

            {!aCarregar &&
              itensPagina.map((doc) => {
                const rotuloEstado = ROTULOS_ESTADO[doc.estado_atual];
                return (
                  <Link key={doc.id} to={`/documentos/${doc.id}`} style={estilos.linhaLista}>
                    <div>
                      <div style={estilos.numeroELinha}>
                        <span style={estilos.numeroRegisto}>{doc.numero_registo}</span>
                      </div>
                      <div style={estilos.assuntoLista}>{doc.assunto}</div>
                      <div style={estilos.remetenteLista}>{doc.remetente}</div>
                    </div>
                    <div style={estilos.ladoDireitoLista}>
                      <span style={{ ...estilos.badgeContorno, ...estiloContornoEstado(rotuloEstado) }}>
                        {rotuloEstado}
                      </span>
                    </div>
                  </Link>
                );
              })}

            {!aCarregar && aguardarAcao.length > 0 && (
              <div style={estilos.paginacao}>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  style={estilos.botaoPaginacao}
                >
                  ‹
                </button>
                <span style={estilos.textoPaginacao}>
                  {paginaAtual}/{totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  style={estilos.botaoPaginacao}
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setPagina(1)}
                  style={estilos.botaoReset}
                  title="Repor paginação"
                >
                  Reset <span style={estilos.letraReset}>R</span>
                </button>
              </div>
            )}
          </section>

          <section style={estilos.colunaAtividade}>
            <h2 style={estilos.tituloSeccao}>Atividade</h2>
            {/* TODO: substituir por um feed real quando existir um endpoint
                de auditoria (ex.: listarAtividadeRecente()). */}
            <div style={estilos.estadoVazioAtividade}>
              Ainda não há uma fonte de atividade recente ligada a este painel.
            </div>

            {/* TODO: substituir por contagem real quando o Documento tiver
                um campo de prazo/limite (ex.: prazo_limite). */}
            <div style={estilos.cartaoForaPrazo}>
              <div style={estilos.rotuloForaPrazo}>Fora de prazo</div>
              <div style={estilos.valorForaPrazo}>—</div>
              <div style={estilos.legendaForaPrazo}>
                Sem dados de prazo disponíveis para calcular este indicador.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CartaoKpi({
  cor,
  rotulo,
  valor,
  legenda,
  aCarregar,
}: {
  cor: "despacho" | "encaminhados" | "analise" | "arquivo" | "rejeitados";
  rotulo: string;
  valor: number;
  legenda: string;
  aCarregar: boolean;
}) {
  return (
    <div className={`cartao-kpi cartao-kpi--${cor}`}>
      <div className="cartao-kpi__rotulo">{rotulo}</div>
      <div className="cartao-kpi__valor">{aCarregar ? "—" : String(valor).padStart(2, "0")}</div>
      <div className="cartao-kpi__legenda">{legenda}</div>
    </div>
  );
}

/** Reaproduz, de forma simplificada, a lógica de permissões de
 * DetalheDocumento.tsx para saber se o utilizador tem uma ação
 * pendente sobre um documento. */
function precisaAcaoDoUtilizador(doc: Documento, perfil?: string): boolean {
  if (!perfil) return false;
  const estado = doc.estado_atual;
  if (estado === "recepcao" && (perfil === "RECEP" || perfil === "SECR")) return true;
  if (estado === "submetido" && perfil === "SECR") return true;
  if (estado === "validado_secretariado" && perfil === "MIN") return true;
  const perfilDeServico = perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ";
  if (estado === "encaminhado" && perfilDeServico) return true;
  if (estado === "em_analise" && perfilDeServico) return true;
  if (estado === "validado_servico" && perfil === "ARQ") return true;
  return false;
}

function estiloContornoEstado(rotulo: string): React.CSSProperties {
  switch (rotulo) {
    case "Submetido":
      return { borderColor: "#c98a2f", color: "#8a5a17" };
    case "Em análise":
      return { borderColor: "#5f8a56", color: "#3f5c3a" };
    case "Encaminhado":
      return { borderColor: "#c94f4f", color: "#a13a3a" };
    case "Rejeitado":
      return { borderColor: "#a13a3a", color: "#a13a3a" };
    case "Validado (serviço)":
    case "Validado (Secretariado)":
      return { borderColor: "#d97a2f", color: "#a06a1f" };
    case "Arquivado":
      return { borderColor: "#8a8371", color: "#6b6350" };
    default:
      return { borderColor: "#8a8371", color: "#6b6350" };
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
  linkLista: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1c2b4a",
    textDecoration: "none",
  },
  mensagemEstado: {
    color: "#6b6350",
    fontSize: 14,
  },
  grelhaPrincipal: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 24,
    alignItems: "start",
  },
  colunaLista: {
    backgroundColor: "#f5f2e9",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
  },
  colunaAtividade: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  tituloSeccao: {
    margin: "0 0 16px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 18,
    color: "#1c2b4a",
  },
  linhaLista: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #e9e4d5",
    textDecoration: "none",
    color: "inherit",
  },
  numeroELinha: {
    marginBottom: 2,
  },
  numeroRegisto: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1c2b4a",
  },
  assuntoLista: {
    fontSize: 14,
    color: "#2b2b2b",
    marginTop: 2,
  },
  remetenteLista: {
    fontSize: 12,
    color: "#8a8371",
    marginTop: 2,
  },
  ladoDireitoLista: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  badgeContorno: {
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    backgroundColor: "#ffffff",
  },
  paginacao: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
    padding: "10px 16px",
    backgroundColor: "#1c2b4a",
    borderRadius: 999,
    width: "fit-content",
    marginLeft: "auto",
    marginRight: "auto",
  },
  botaoPaginacao: {
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: 16,
    cursor: "pointer",
    padding: "0 4px",
  },
  textoPaginacao: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
  },
  botaoReset: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: 13,
    cursor: "pointer",
    marginLeft: 8,
  },
  letraReset: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.15)",
    fontSize: 11,
  },
  estadoVazioAtividade: {
    backgroundColor: "#f5f2e9",
    borderRadius: 16,
    padding: 20,
    fontSize: 13,
    color: "#8a8371",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
  },
  cartaoForaPrazo: {
    backgroundColor: "#c94f2f",
    borderRadius: 16,
    padding: 20,
    color: "#ffffff",
  },
  rotuloForaPrazo: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  valorForaPrazo: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 32,
    margin: "6px 0 4px",
  },
  legendaForaPrazo: {
    fontSize: 12,
    opacity: 0.9,
  },
};
