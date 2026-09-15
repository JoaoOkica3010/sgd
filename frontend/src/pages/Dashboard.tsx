import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarDocumentos } from "../api/documentos";
import { gerarRelatorio, type TipoRelatorioId } from "../api/relatorios";
import { listarAtividadeRecente, type AtividadeItem } from "../api/atividade";
import { ROTULOS_ESTADO, type Documento } from "../types";
import { useAuth } from "../auth/AuthContext";
import { Cabecalho } from "../components/Cabecalho";
import { Rodape } from "../components/Rodape";

/**
 * NOTAS IMPORTANTES SOBRE OS DADOS DESTE DASHBOARD
 * ---------------------------------------------------------------
 * Esta página usa, por agora, o mesmo endpoint `listarDocumentos`
 * já existente em `ListaDocumentos.tsx`. Isto permite calcular:
 *   - Os contadores por estado (cartões do topo)
 *   - A lista "A aguardar a minha ação" (reaproveita a lógica de
 *     permissões usada em DetalheDocumento.tsx)
 *   - "Fora de prazo": calculado no cliente a partir de criado_em +
 *     prioridade (ver PRAZO_DIAS_POR_PRIORIDADE abaixo — regra de
 *     negócio combinada com o cliente: Muito Urgente = 1 dia,
 *     Urgente = 2 dias, Normal = 5 dias). Documentos arquivados ou
 *     rejeitados não contam, mesmo que o prazo já tenha passado.
 *   - "Atividade": lê /atividade/recente (AtividadeController, backend),
 *     que resume as últimas entradas de auditoria em frases simples.
 *     Sem infraestrutura de WebSockets no projeto, a "atualização em
 *     tempo real" é feita por sondagem (polling) a cada 10s — ver
 *     INTERVALO_ATIVIDADE_MS abaixo.
 * ---------------------------------------------------------------
 */

const INTERVALO_ATIVIDADE_MS = 10_000;

const ITENS_POR_PAGINA = 2;

type TipoRelatorio = {
  id: TipoRelatorioId;
  inicial: string;
  nome: string;
  descricao: string;
};

// Lista de tipos de relatório — placeholder a confirmar com o produto
// antes de ligar aos endpoints reais de geração.
const TIPOS_RELATORIO: TipoRelatorio[] = [
  {
    id: "documentos-por-estado",
    inicial: "E",
    nome: "Documentos por Estado",
    descricao: "Distribuição dos documentos pelos vários estados do fluxo.",
  },
  {
    id: "documentos-por-servico",
    inicial: "S",
    nome: "Documentos por Serviço",
    descricao: "Volume de documentos processados por cada serviço.",
  },
  {
    id: "fora-de-prazo",
    inicial: "P",
    nome: "Fora de Prazo",
    descricao: "Documentos que ultrapassaram o prazo definido por prioridade.",
  },
  {
    id: "atividade-por-utilizador",
    inicial: "U",
    nome: "Atividade por Utilizador",
    descricao: "Ações realizadas por cada utilizador num período.",
  },
  {
    id: "volume-mensal",
    inicial: "V",
    nome: "Volume Mensal",
    descricao: "Evolução mensal do número de documentos recebidos.",
  },
  {
    id: "auditoria-acessos",
    inicial: "A",
    nome: "Auditoria de Acessos",
    descricao: "Registo de acessos e consultas realizadas no sistema.",
  },
];

// Prazo (em dias de calendário, a contar da criação) por prioridade —
// regra de negócio combinada com o cliente. Documentos já arquivados ou
// rejeitados não contam como "fora de prazo": já estão resolvidos.
const PRAZO_DIAS_POR_PRIORIDADE: Record<Documento["prioridade"], number> = {
  "Muito Urgente": 1,
  Urgente: 2,
  Normal: 5,
};

const ESTADOS_RESOLVIDOS: Documento["estado_atual"][] = ["arquivado", "rejeitado"];

function dataLimite(doc: Documento): Date {
  const dias = PRAZO_DIAS_POR_PRIORIDADE[doc.prioridade] ?? PRAZO_DIAS_POR_PRIORIDADE.Normal;
  const limite = new Date(doc.criado_em);
  limite.setDate(limite.getDate() + dias);
  return limite;
}

function estaForaPrazo(doc: Documento): boolean {
  if (ESTADOS_RESOLVIDOS.includes(doc.estado_atual)) return false;
  return new Date() > dataLimite(doc);
}

function diasEmAtraso(doc: Documento): number {
  const diffMs = new Date().getTime() - dataLimite(doc).getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function tempoRelativo(iso: string): string {
  const diffSeg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSeg < 60) return "agora mesmo";
  const diffMin = Math.round(diffSeg / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras} h`;
  const diffDias = Math.round(diffHoras / 24);
  return `há ${diffDias} ${diffDias === 1 ? "dia" : "dias"}`;
}

export function Dashboard() {
  const { utilizador } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [aba, setAba] = useState<"dashboard" | "relatorios">("dashboard");

  const [atividade, setAtividade] = useState<AtividadeItem[]>([]);
  const [aCarregarAtividade, setACarregarAtividade] = useState(true);
  const [erroAtividade, setErroAtividade] = useState<string | null>(null);
  const [ultimaAtualizacaoAtividade, setUltimaAtualizacaoAtividade] = useState<Date | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Tempo real" sem WebSockets: o painel sonda o endpoint a cada
  // INTERVALO_ATIVIDADE_MS enquanto a página estiver aberta.
  useEffect(() => {
    carregarAtividade();
    const temporizador = setInterval(carregarAtividade, INTERVALO_ATIVIDADE_MS);
    return () => clearInterval(temporizador);
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

  async function carregarAtividade() {
    try {
      const itens = await listarAtividadeRecente();
      setAtividade(itens);
      setErroAtividade(null);
      setUltimaAtualizacaoAtividade(new Date());
    } catch {
      setErroAtividade("Não foi possível carregar a atividade recente.");
    } finally {
      setACarregarAtividade(false);
    }
  }

  const contadores = useMemo(() => {
    const contar = (estado: string) => documentos.filter((d) => d.estado_atual === estado).length;
    return {
      paraApreciacaoCG: contar("validado_secretariado"),
      paraDespacho: contar("validado_chefe_gabinete"),
      encaminhados: contar("encaminhado"),
      emAnalise: contar("em_analise"),
      paraArquivo: contar("validado_servico"),
      rejeitados: contar("rejeitado"),
    };
  }, [documentos]);

  const perfil = utilizador?.perfil;

  const foraPrazo = useMemo(() => {
    return documentos
      .filter(estaForaPrazo)
      .sort((a, b) => diasEmAtraso(b) - diasEmAtraso(a));
  }, [documentos]);

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
    <div className="pagina-sgd">
      <Cabecalho
        extra={
          utilizador?.perfil === "SADMIN" ? (
            <Link to="/admin" style={estilos.linkAdmin}>
              Administração
            </Link>
          ) : undefined
        }
      />

      <main style={estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <h1 style={estilos.titulo}>DASHBOARD E RELATÓRIO</h1>
          {aba === "dashboard" &&
            (utilizador?.perfil === "SADMIN" ? (
              <Link to="/admin" style={estilos.linkLista}>
                Gestão de Sistema →
              </Link>
            ) : (
              <Link to="/documentos" style={estilos.linkLista}>
                Ver todos os documentos →
              </Link>
            ))}
        </div>

        <div style={estilos.abas}>
          {(
            [
              { id: "dashboard", rotulo: "Dashboard" },
              { id: "relatorios", rotulo: "Relatórios" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              style={{ ...estilos.abaBotao, ...(aba === t.id ? estilos.abaBotaoAtiva : {}) }}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        {erro && <p style={{ ...estilos.mensagemEstado, color: "#b3261e" }}>{erro}</p>}

        {aba === "dashboard" && (
          <>
            <div className="grelha-kpi">
              <CartaoKpi
                cor="apreciacao-cg"
                rotulo="Para apreciação"
                valor={contadores.paraApreciacaoCG}
                legenda="validados pelo Secretariado"
                aCarregar={aCarregar}
              />
              <CartaoKpi
                cor="despacho"
                rotulo="Para despacho"
                valor={contadores.paraDespacho}
                legenda="validados pelo Chefe de Gabinete"
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
                <div style={estilos.cabecalhoAtividade}>
                  <h2 style={{ ...estilos.tituloSeccao, margin: 0 }}>Atividade</h2>
                  <span style={estilos.indicadorAoVivo}>
                    <span style={estilos.pontoAoVivo} />
                    {ultimaAtualizacaoAtividade
                      ? `atualizado ${tempoRelativo(ultimaAtualizacaoAtividade.toISOString())}`
                      : "a atualizar..."}
                  </span>
                </div>

                <div style={estilos.cartaoAtividade}>
                  {aCarregarAtividade && <p style={estilos.mensagemVaziaAtividade}>A carregar...</p>}

                  {!aCarregarAtividade && erroAtividade && (
                    <p style={{ ...estilos.mensagemVaziaAtividade, color: "#b3261e" }}>{erroAtividade}</p>
                  )}

                  {!aCarregarAtividade && !erroAtividade && atividade.length === 0 && (
                    <p style={estilos.mensagemVaziaAtividade}>Ainda não há atividade registada.</p>
                  )}

                  {!aCarregarAtividade &&
                    !erroAtividade &&
                    atividade.map((item, i) => (
                      <div
                        key={item.id}
                        style={{
                          ...estilos.linhaAtividade,
                          borderBottom: i === atividade.length - 1 ? "none" : estilos.linhaAtividade.borderBottom,
                        }}
                      >
                        <span style={estilos.pontoAtividade} />
                        <div style={estilos.corpoAtividade}>
                          <div style={estilos.textoAtividade}>
                            <strong>{item.utilizador}</strong> {item.descricao}
                            {item.documento && (
                              <>
                                {" "}
                                <Link to={`/documentos/${item.documento.id}`} style={estilos.linkAtividade}>
                                  {item.documento.numero_registo}
                                </Link>
                              </>
                            )}
                          </div>
                          <div style={estilos.tempoAtividade}>{tempoRelativo(item.ocorrido_em)}</div>
                        </div>
                      </div>
                    ))}
                </div>

                <div
                  style={{
                    ...estilos.cartaoForaPrazo,
                    backgroundColor: foraPrazo.length > 0 ? "#c94f2f" : "#f5f2e9",
                    color: foraPrazo.length > 0 ? "#ffffff" : "#6b6350",
                  }}
                >
                  <div style={estilos.rotuloForaPrazo}>Fora de prazo</div>
                  <div style={estilos.valorForaPrazo}>
                    {String(foraPrazo.length).padStart(2, "0")}
                  </div>
                  {foraPrazo.length === 0 ? (
                    <div style={estilos.legendaForaPrazo}>Nenhum documento fora do prazo.</div>
                  ) : (
                    <div style={estilos.legendaForaPrazo}>
                      O mais atrasado ({foraPrazo[0].numero_registo}) está {diasEmAtraso(foraPrazo[0])}{" "}
                      {diasEmAtraso(foraPrazo[0]) === 1 ? "dia" : "dias"} além do prazo.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {aba === "relatorios" && <PainelRelatorios />}
      </main>
      <Rodape />
    </div>
  );
}

function PainelRelatorios() {
  const [aGerar, setAGerar] = useState<TipoRelatorioId | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleGerarRelatorio(tipo: TipoRelatorio) {
    setErro(null);
    setAGerar(tipo.id);
    try {
      await gerarRelatorio(tipo.id);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setErro(
        status === 403
          ? `Não tem permissão para gerar "${tipo.nome}".`
          : `Não foi possível gerar "${tipo.nome}". Tente novamente.`
      );
    } finally {
      setAGerar(null);
    }
  }

  return (
    <div>
      <p style={estilos.introRelatorios}>
        Selecione um tipo de relatório para gerar. Os relatórios são compilados a partir dos
        dados atuais do SGD.
      </p>

      {erro && <p style={{ ...estilos.mensagemEstado, color: "#b3261e" }}>{erro}</p>}

      <div style={estilos.grelhaRelatorios}>
        {TIPOS_RELATORIO.map((tipo) => (
          <div key={tipo.id} style={estilos.cartaoRelatorio}>
            <div style={estilos.iconeRelatorio}>{tipo.inicial}</div>
            <div style={estilos.nomeRelatorio}>{tipo.nome}</div>
            <div style={estilos.descricaoRelatorio}>{tipo.descricao}</div>
            <button
              type="button"
              style={{
                ...estilos.botaoGerarRelatorio,
                ...(aGerar === tipo.id ? estilos.botaoGerarRelatorioDesativado : {}),
              }}
              disabled={aGerar === tipo.id}
              onClick={() => handleGerarRelatorio(tipo)}
            >
              {aGerar === tipo.id ? "A gerar..." : "Gerar relatório"}
            </button>
          </div>
        ))}
      </div>
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
  cor: "apreciacao-cg" | "despacho" | "encaminhados" | "analise" | "arquivo" | "rejeitados";
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
  if (estado === "validado_secretariado" && perfil === "CG") return true;
  if (estado === "validado_chefe_gabinete" && perfil === "MIN") return true;
  const perfilDeServico = perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ" && perfil !== "CONSULTA";
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
    case "Validado (Chefe de Gabinete)":
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
    backgroundColor: "var(--cor-primaria)",
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
    color: "var(--cor-primaria-suave)",
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
  linkAdmin: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.35)",
    padding: "8px 14px",
    borderRadius: 8,
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
    color: "var(--cor-primaria)",
  },
  linkLista: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--cor-primaria)",
    textDecoration: "none",
  },
  mensagemEstado: {
    color: "#6b6350",
    fontSize: 14,
  },
  abas: {
    display: "flex",
    gap: 32,
    borderBottom: "1px solid #e7e5e5",
    marginBottom: 24,
  },
  abaBotao: {
    padding: "0 0 12px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#201e1d",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  abaBotaoAtiva: {
    borderBottom: "2px solid #d92b1f",
    color: "#d92b1f",
    marginBottom: -1,
  },
  introRelatorios: {
    fontSize: 15,
    color: "#5a564d",
    margin: "0 0 20px",
  },
  grelhaRelatorios: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  cartaoRelatorio: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backgroundColor: "#ffffff",
    border: "1px solid #e6e2d6",
    borderRadius: 14,
    padding: 22,
  },
  iconeRelatorio: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eaf3ee",
    color: "var(--cor-primaria)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 16,
  },
  nomeRelatorio: {
    fontSize: 16,
    fontWeight: 700,
    color: "#201e1d",
  },
  descricaoRelatorio: {
    fontSize: 13,
    color: "#8a857a",
    flexGrow: 1,
  },
  botaoGerarRelatorio: {
    alignSelf: "flex-start",
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "var(--cor-primaria)",
    color: "#ffffff",
    cursor: "pointer",
  },
  botaoGerarRelatorioDesativado: {
    opacity: 0.6,
    cursor: "not-allowed",
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
    color: "var(--cor-primaria)",
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
    color: "var(--cor-primaria)",
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
    backgroundColor: "var(--cor-primaria)",
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
  cabecalhoAtividade: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  indicadorAoVivo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: "#8a8371",
  },
  pontoAoVivo: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "#3f6b34",
    display: "inline-block",
  },
  cartaoAtividade: {
    backgroundColor: "#f5f2e9",
    borderRadius: 16,
    padding: "6px 20px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
    maxHeight: 360,
    overflowY: "auto",
  },
  mensagemVaziaAtividade: {
    fontSize: 13,
    color: "#8a8371",
    padding: "14px 0",
    margin: 0,
  },
  linhaAtividade: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 0",
    borderBottom: "1px solid #e9e4d5",
  },
  pontoAtividade: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "var(--cor-primaria)",
    flexShrink: 0,
    marginTop: 6,
  },
  corpoAtividade: {
    flex: 1,
    minWidth: 0,
  },
  textoAtividade: {
    fontSize: 13,
    color: "#2b2b2b",
    lineHeight: 1.4,
  },
  linkAtividade: {
    color: "var(--cor-primaria)",
    fontWeight: 700,
    textDecoration: "none",
  },
  tempoAtividade: {
    fontSize: 11,
    color: "#a39c8b",
    marginTop: 2,
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
