import { FichaDocumento } from "../components/FichaDocumento";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  arquivarDocumento, encaminharDocumento, iniciarAnaliseDocumento, obterDocumento,
  obterHistoricoDocumento, reabrirDocumento, rejeitarDocumento, submeterDocumento, validarDocumento,
  validarServicoDocumento,
} from "../api/documentos";
import { baixarAnexo, carregarAnexo, obterAnexoBlob } from "../api/anexos";
import {
  listarObservacoes, criarObservacao, editarObservacao, eliminarObservacaoApi, type ObservacaoApi,
} from "../api/observacoes";
import { listarPerfis, type PerfilResumo } from "../api/perfis";
import { ROTULOS_ESTADO, type Documento, type EstadoHistorico } from "../types";
import { useAuth } from "../auth/AuthContext";

type Observacao = {
  id: number;
  autor: string;
  perfil: string;
  texto: string;
  estadoCriacao: string;
  estadoLabel: string;
  criadoEm: string;
};

export function DetalheDocumento() {
  const { id } = useParams<{ id: string }>();
  const { utilizador, logout } = useAuth();

  const [documento, setDocumento] = useState<Documento | null>(null);
  const [historico, setHistorico] = useState<EstadoHistorico[]>([]);
  const [perfis, setPerfis] = useState<PerfilResumo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState(false);

  const [servicosEscolhidos, setServicosEscolhidos] = useState<number[]>([]);
  const [justificacaoRejeicao, setJustificacaoRejeicao] = useState("");
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);

  const [modalReaberturaAberto, setModalReaberturaAberto] = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState("");
  const [aReabrir, setAReabrir] = useState(false);
  const [aba, setAba] = useState<"detalhes" | "observacoes" | "historico" | "ficha">("detalhes");

  // Observações persistidas no servidor — visíveis a todos os perfis com
  // acesso ao documento. Contrato assumido enquanto o backend implementa o
  // endpoint: GET/POST /documentos/{id}/observacoes,
  // PUT/DELETE /documentos/{id}/observacoes/{obsId}.
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [aCarregarObservacoes, setACarregarObservacoes] = useState(false);
  const [erroObservacoes, setErroObservacoes] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [textoObservacao, setTextoObservacao] = useState("");
  const [observacaoEmEdicaoId, setObservacaoEmEdicaoId] = useState<number | null>(null);
  const [aGravarObservacao, setAGravarObservacao] = useState(false);

  const [anexoPreview, setAnexoPreview] = useState<{ nome: string; url: string; tipo: "pdf" | "imagem" } | null>(null);
  const [aCarregarPreview, setACarregarPreview] = useState(false);
  const [erroPreview, setErroPreview] = useState<string | null>(null);

  // TODO: falta endpoint próprio (ex.: POST /documentos/{id}/assinar) que
  // produza a assinatura digital qualificada (PAdES/CAdES) via o serviço de
  // certificação do Ministro e devolva quem assinou e quando. Por agora fica
  // em estado local só para validar o fluxo/UI; troque por dados do servidor
  // quando o endpoint existir.
  const [assinatura, setAssinatura] = useState<{ por: string; em: string } | null>(null);
  const [modalAssinaturaAberto, setModalAssinaturaAberto] = useState(false);
  const [aAssinar, setAAssinar] = useState(false);

  useEffect(() => {
    if (id) carregarTudo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id) carregarObservacoesDoServidor(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function apiParaObservacao(o: ObservacaoApi): Observacao {
    return {
      id: o.id,
      autor: o.autor_nome,
      perfil: o.autor_perfil,
      texto: o.texto,
      estadoCriacao: o.estado_criacao,
      estadoLabel: ROTULOS_ESTADO[o.estado_criacao] ?? o.estado_criacao,
      criadoEm: o.criado_em,
    };
  }

  async function carregarObservacoesDoServidor(documentoId: string) {
    setACarregarObservacoes(true);
    setErroObservacoes(null);
    try {
      const lista = await listarObservacoes(documentoId);
      setObservacoes(lista.map(apiParaObservacao));
    } catch {
      setErroObservacoes("Não foi possível carregar as observações.");
    } finally {
      setACarregarObservacoes(false);
    }
  }

  async function carregarTudo(documentoId: string) {
    setACarregar(true);
    setErro(null);
    try {
      const [doc, hist, listaPerfis] = await Promise.all([
        obterDocumento(documentoId),
        obterHistoricoDocumento(documentoId),
        listarPerfis(),
      ]);
      setDocumento(doc);
      setHistorico(hist);
      setPerfis(listaPerfis);
    } catch {
      setErro("Não foi possível carregar o documento. Pode não ter permissão para o consultar.");
    } finally {
      setACarregar(false);
    }
  }

  async function executarAcao(acao: () => Promise<Documento>) {
    setAProcessar(true);
    setErro(null);
    try {
      await acao();
      if (id) {
        setDocumento(await obterDocumento(id));
        setHistorico(await obterHistoricoDocumento(id));
        await carregarObservacoesDoServidor(id);
      }
    } catch (e: any) {
      setErro(e?.response?.data?.error?.message ?? "Não foi possível concluir a ação.");
    } finally {
      setAProcessar(false);
    }
  }

  async function submeterAnexo(e: FormEvent<HTMLInputElement>) {
    const ficheiro = e.currentTarget.files?.[0];
    if (!ficheiro || !id) return;
    setAProcessar(true);
    setErro(null);
    try {
      await carregarAnexo(id, ficheiro);
      setDocumento(await obterDocumento(id));
    } catch (err: any) {
      setErro(err?.response?.data?.error?.message ?? "Não foi possível carregar o anexo.");
    } finally {
      setAProcessar(false);
      e.currentTarget.value = "";
    }
  }

  function alternarServico(perfilId: number) {
    setServicosEscolhidos((atual) =>
      atual.includes(perfilId) ? atual.filter((s) => s !== perfilId) : [...atual, perfilId]
    );
  }

  if (aCarregar) {
    return (
      <div style={estilos.pagina}>
        <BarraTopo utilizador={utilizador} logout={logout} />
        <div style={estilos.conteudo}>
          <p style={estilos.mensagemEstado}>A carregar...</p>
        </div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div style={estilos.pagina}>
        <BarraTopo utilizador={utilizador} logout={logout} />
        <div style={estilos.conteudo}>
          <p style={{ ...estilos.mensagemEstado, color: "#b3261e" }}>
            {erro ?? "Documento não encontrado."}
          </p>
          <Link to="/documentos" style={estilos.linkVoltar}>
            ← Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  const perfil = utilizador?.perfil;
  const podeSubmeter = documento.estado_atual === "recepcao" && (perfil === "RECEP" || perfil === "SECR");
  const podeValidarSecretariado = documento.estado_atual === "submetido" && perfil === "SECR";
  const podeEncaminhar = documento.estado_atual === "validado_secretariado" && perfil === "MIN";
  const podeIniciarAnalise = documento.estado_atual === "encaminhado" && perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ";
  const podeValidarServico = documento.estado_atual === "em_analise" && perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ";
  const podeArquivar = documento.estado_atual === "validado_servico" && perfil === "ARQ";
  const podeRejeitar = (documento.estado_atual === "submetido" && perfil === "SECR") ||
    (["encaminhado", "em_analise"].includes(documento.estado_atual) &&
      perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ");

  const documentoTerminal = documento.estado_atual === "arquivado" || documento.estado_atual === "rejeitado";

  const podeAnexar =
    (perfil === "RECEP" && documento.estado_atual === "recepcao") ||
    (perfil === "SECR" && ["recepcao", "submetido"].includes(documento.estado_atual)) ||
    (perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ" &&
      ["encaminhado", "em_analise"].includes(documento.estado_atual)) ||
    (perfil === "ADMIN" && !documentoTerminal);

  const podeAssinar = perfil === "MIN" && documento.estado_atual === "validado_secretariado" && !assinatura;

  const temAcoes = podeSubmeter || podeValidarSecretariado || podeEncaminhar || podeIniciarAnalise ||
    podeValidarServico || podeArquivar || podeRejeitar || podeAssinar;

  async function assinarDocumento() {
    setAAssinar(true);
    try {
      // await apiClient.post(`/documentos/${id}/assinar`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAssinatura({ por: utilizador?.nome ?? "Ministro", em: new Date().toISOString() });
      setModalAssinaturaAberto(false);
    } finally {
      setAAssinar(false);
    }
  }

  // Regra 2: só pode escrever observação quem, no estado atual, também tem
  // uma ação disponível sobre o documento (mesma lógica de permissão).
  // Exceção: ADMIN pode sempre observar, tal como no backend
  // (ComentarioPolicy::criar só bloqueia quando o documento está arquivado).
  const podeObservar = temAcoes || (perfil === "ADMIN" && documento.estado_atual !== "arquivado");

  const rotuloEstadoAtual = ROTULOS_ESTADO[documento.estado_atual];
  // A primeira entrada do histórico (ordem cronológica ascendente, garantida
  // pelo backend) é sempre a criação do documento — a última seria a
  // transição mais recente, o que mostraria o autor errado em "Criado por".
  const entradaCriacao = historico[0];

  // Regra 3: uma observação deixa de ser editável/eliminável assim que o
  // documento mudar de estado, mesmo que volte depois a esse mesmo estado —
  // por isso o bloqueio olha para o histórico (qualquer entrada mais recente
  // que a observação), não apenas para o estado atual.
  function observacaoEditavel(obs: Observacao): boolean {
    if (obs.perfil !== perfil) return false;
    const mudouDesde = historico.some((h) => new Date(h.alterado_em).getTime() > new Date(obs.criadoEm).getTime());
    return !mudouDesde;
  }

  function abrirModalNovaObservacao() {
    setObservacaoEmEdicaoId(null);
    setTextoObservacao("");
    setModalAberto(true);
  }

  function abrirModalEditarObservacao(obs: Observacao) {
    setObservacaoEmEdicaoId(obs.id);
    setTextoObservacao(obs.texto);
    setModalAberto(true);
  }

  async function gravarObservacao() {
    if (!textoObservacao.trim() || !id) return;
    setAGravarObservacao(true);
    setErroObservacoes(null);
    try {
      if (observacaoEmEdicaoId) {
        const atualizada = await editarObservacao(id, observacaoEmEdicaoId, textoObservacao);
        setObservacoes((atual) =>
          atual.map((o) => (o.id === observacaoEmEdicaoId ? apiParaObservacao(atualizada) : o))
        );
      } else {
        const nova = await criarObservacao(id, textoObservacao);
        setObservacoes((atual) => [apiParaObservacao(nova), ...atual]);
      }
      setModalAberto(false);
    } catch {
      setErroObservacoes("Não foi possível gravar a observação. Tente novamente.");
    } finally {
      setAGravarObservacao(false);
    }
  }

  async function eliminarObservacao(observacaoId: number) {
    if (!id) return;
    setErroObservacoes(null);
    try {
      await eliminarObservacaoApi(id, observacaoId);
      setObservacoes((atual) => atual.filter((o) => o.id !== observacaoId));
    } catch {
      setErroObservacoes("Não foi possível eliminar a observação.");
    }
  }

  function extensaoDe(nomeFicheiro: string): string {
    const partes = nomeFicheiro.split(".");
    return partes[partes.length - 1]?.toLowerCase() ?? "";
  }

  // Pré-visualiza em modal (PDF e imagens, que o browser sabe renderizar
  // nativamente num <iframe>/<img>); outros formatos (Word, Excel, ...) não
  // têm um visualizador nativo, por isso caem para o download direto.
  async function abrirPreviewAnexo(anexo: { id: string; nome_ficheiro: string }) {
    const ext = extensaoDe(anexo.nome_ficheiro);
    const tipo = ext === "pdf" ? "pdf" : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? "imagem" : null;
    if (!tipo) {
      baixarAnexo(anexo.id, anexo.nome_ficheiro);
      return;
    }
    setErroPreview(null);
    setACarregarPreview(true);
    try {
      const blob = await obterAnexoBlob(anexo.id);
      const tipoMime = tipo === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      const blobComTipo = blob.type ? blob : new Blob([blob], { type: tipoMime });
      const url = URL.createObjectURL(blobComTipo);
      setAnexoPreview({ nome: anexo.nome_ficheiro, url, tipo });
    } catch {
      setErroPreview("Não foi possível pré-visualizar o anexo.");
    } finally {
      setACarregarPreview(false);
    }
  }

  function fecharPreviewAnexo() {
    if (anexoPreview) URL.revokeObjectURL(anexoPreview.url);
    setAnexoPreview(null);
  }

  // Comentários gerados automaticamente pelo backend (motivo de rejeição,
  // motivo de reabertura) são registos formais do processo — não passam
  // pelo mecanismo genérico de editar/eliminar observações; a única ação
  // possível sobre o motivo de rejeição é reabrir o processo (ADMIN).
  function isRegistoSistema(texto: string): boolean {
    return texto.startsWith("[Rejeição]") || texto.startsWith("[Reabertura]");
  }

  async function reabrirProcesso() {
    if (!motivoReabertura.trim() || !id) return;
    setAReabrir(true);
    setErro(null);
    try {
      await executarAcao(() => reabrirDocumento(id, motivoReabertura));
      setModalReaberturaAberto(false);
      setMotivoReabertura("");
    } finally {
      setAReabrir(false);
    }
  }

  return (
    <div style={estilos.pagina}>
      <BarraTopo utilizador={utilizador} logout={logout} />

      <div style={estilos.faixaTopo}>
        <Link to="/documentos" style={estilos.linkVoltar}>
          ← Voltar à lista
        </Link>
        <div style={estilos.cabecalho}>
          <div>
            <h1 style={estilos.numeroRegisto}>{documento.numero_registo}</h1>
            <p style={estilos.assunto}>{documento.assunto}</p>
            <p style={estilos.remetente}>{documento.remetente}</p>
          </div>
          <span style={{ ...estilos.badgeEstado, ...estiloEstado(rotuloEstadoAtual) }}>
            <span style={estilos.badgePonto} />
            {rotuloEstadoAtual}
          </span>
        </div>
      </div>

      <div style={estilos.conteudo}>
        {erro && <p style={estilos.mensagemErro}>{erro}</p>}

        <div style={estilos.abas}>
          {(
            [
              { id: "detalhes", rotulo: "Detalhes" },
              { id: "observacoes", rotulo: "Observações" },
              { id: "historico", rotulo: "Histórico e Anexos" },
              { id: "ficha", rotulo: "Ficha" },
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

        {aba === "detalhes" && (
          <div style={estilos.painelDetalhes}>
            <section style={estilos.cartao}>
              <h2 style={estilos.tituloCartao}>Dados do documento</h2>
              <div style={estilos.grelhaDados}>
                <div>
                  <div style={estilos.rotuloDado}>Tipo</div>
                  <div style={estilos.valorDado}>{documento.tipo_documento}</div>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Prioridade</div>
                  <span style={{ ...estilos.badge, ...estiloPrioridade(documento.prioridade) }}>
                    {documento.prioridade}
                  </span>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Criado por</div>
                  <div style={estilos.valorDado}>{entradaCriacao?.alterado_por?.nome ?? "—"}</div>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Data de criação</div>
                  <div style={estilos.valorDado}>
                    {entradaCriacao
                      ? new Date(entradaCriacao.alterado_em).toLocaleDateString("pt-PT")
                      : "—"}
                  </div>
                </div>
              </div>
              {assinatura && (
                <div style={estilos.seloAssinatura}>
                  <span style={estilos.seloIcone}>✓</span>
                  <div>
                    <div style={estilos.seloTitulo}>Documento assinado digitalmente</div>
                    <div style={estilos.seloMeta}>
                      {assinatura.por} ·{" "}
                      {new Date(assinatura.em).toLocaleString("pt-PT", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {temAcoes && (
              <section style={estilos.cartaoAcoes}>
                <div style={estilos.cabecalhoAcoes}>
                  <h2 style={estilos.tituloAcoes}>Ações disponíveis — {perfil}</h2>
                  {(podeAssinar || podeEncaminhar) && (
                    <div style={estilos.botoesTopoAcoes}>
                      {podeAssinar && (
                        <button
                          disabled={aProcessar}
                          onClick={() => setModalAssinaturaAberto(true)}
                          style={estilos.botaoAcaoTopoContorno}
                        >
                          Assin. Digital
                        </button>
                      )}
                      {podeEncaminhar && (
                        <button
                          disabled={aProcessar || servicosEscolhidos.length === 0}
                          onClick={() => id && executarAcao(() => encaminharDocumento(id, servicosEscolhidos))}
                          style={estilos.botaoAcaoTopo}
                        >
                          Enviar para
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={estilos.linhaBotoes}>
                  {podeSubmeter && (
                    <button
                      disabled={aProcessar}
                      onClick={() => id && executarAcao(() => submeterDocumento(id))}
                      style={estilos.botaoPrimario}
                    >
                      Submeter para validação
                    </button>
                  )}
                  {podeValidarSecretariado && (
                    <button
                      disabled={aProcessar}
                      onClick={() => id && executarAcao(() => validarDocumento(id))}
                      style={estilos.botaoPrimario}
                    >
                      Validar
                    </button>
                  )}
                  {podeIniciarAnalise && (
                    <button
                      disabled={aProcessar}
                      onClick={() => id && executarAcao(() => iniciarAnaliseDocumento(id))}
                      style={estilos.botaoPrimario}
                    >
                      Iniciar análise
                    </button>
                  )}
                  {podeValidarServico && (
                    <button
                      disabled={aProcessar}
                      onClick={() => id && executarAcao(() => validarServicoDocumento(id))}
                      style={estilos.botaoPrimario}
                    >
                      Validar (concluir análise)
                    </button>
                  )}
                  {podeArquivar && (
                    <button
                      disabled={aProcessar}
                      onClick={() => id && executarAcao(() => arquivarDocumento(id))}
                      style={estilos.botaoPrimario}
                    >
                      Arquivar
                    </button>
                  )}
                  {podeRejeitar && (
                    <button
                      disabled={aProcessar}
                      onClick={() => setMostrarRejeicao((v) => !v)}
                      style={estilos.botaoSecundario}
                    >
                      Rejeitar...
                    </button>
                  )}
                </div>

                {podeRejeitar && mostrarRejeicao && (
                  <div style={estilos.subCartao}>
                    <label style={estilos.rotuloDado}>
                      Justificação (obrigatória)
                      <textarea
                        value={justificacaoRejeicao}
                        onChange={(e) => setJustificacaoRejeicao(e.target.value)}
                        style={estilos.textarea}
                        rows={3}
                      />
                    </label>
                    <button
                      disabled={aProcessar || justificacaoRejeicao.trim().length < 5}
                      onClick={() => id && executarAcao(() => rejeitarDocumento(id, justificacaoRejeicao))}
                      style={estilos.botaoSecundario}
                    >
                      Confirmar rejeição
                    </button>
                  </div>
                )}

                {podeEncaminhar && (
                  <div style={estilos.subCartao}>
                    <p style={estilos.rotuloDado}>Encaminhar para:</p>
                    <div style={estilos.gridChecklist}>
                      {perfis.filter((p) => p.sigla !== "MIN" && p.sigla !== "RECEP").map((p, indice) => (
                        <label
                          key={p.id}
                          style={{
                            ...estilos.linhaCheckbox,
                            backgroundColor: Math.floor(indice / 2) % 2 === 1 ? "#f7f6f6" : "#ffffff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={servicosEscolhidos.includes(p.id)}
                            onChange={() => alternarServico(p.id)}
                          />
                          {" "}{p.nome_servico} ({p.sigla})
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {aba === "observacoes" && (
          <div style={estilos.painelObservacoes}>
            <div style={estilos.cabecalhoObservacoes}>
              <p style={estilos.notaObservacoes}>Visíveis a todos os perfis com acesso a este documento.</p>
              {podeObservar && (
                <button onClick={abrirModalNovaObservacao} style={estilos.botaoNovaObservacao}>
                  + Observação
                </button>
              )}
            </div>

            <div style={estilos.listaObservacoes}>
              {observacoes.map((o, indice) => {
                const registoSistema = isRegistoSistema(o.texto);
                const podeReabrirEsteRegisto =
                  registoSistema &&
                  o.texto.startsWith("[Rejeição]") &&
                  perfil === "ADMIN" &&
                  documento.estado_atual === "rejeitado";
                const editavel = !registoSistema && observacaoEditavel(o);
                return (
                  <div key={o.id} style={{ ...estilos.itemObservacao, backgroundColor: indice % 2 === 1 ? "#f7f6f6" : "#ffffff" }}>
                    <div style={estilos.cabecalhoItemObservacao}>
                      <div>
                        <div style={estilos.autorObservacao}>
                          {o.autor} <span style={estilos.perfilObservacao}>· {o.perfil}</span>
                        </div>
                        <div style={estilos.metaObservacao}>
                          {new Date(o.criadoEm).toLocaleString("pt-PT", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · escrita no estado "{o.estadoLabel}"
                        </div>
                      </div>
                      {podeReabrirEsteRegisto ? (
                        <div style={estilos.acoesObservacao}>
                          <button
                            onClick={() => setModalReaberturaAberto(true)}
                            style={estilos.botaoReabrirObservacao}
                          >
                            ✏️ Reabrir
                          </button>
                        </div>
                      ) : editavel ? (
                        <div style={estilos.acoesObservacao}>
                          <button onClick={() => abrirModalEditarObservacao(o)} style={estilos.botaoEditarObservacao}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => eliminarObservacao(o.id)} style={estilos.botaoEliminarObservacao}>
                            <span style={estilos.iconeCirculoEliminar}>−</span> Eliminar
                          </button>
                        </div>
                      ) : (
                        <span style={estilos.tagSoLeitura}>Só leitura</span>
                      )}
                    </div>
                    <p style={estilos.textoObservacao}>{o.texto}</p>
                  </div>
                );
              })}
              {aCarregarObservacoes && (
                <p style={estilos.semObservacoes}>A carregar observações...</p>
              )}
              {!aCarregarObservacoes && observacoes.length === 0 && (
                <p style={estilos.semObservacoes}>Ainda não há observações neste documento.</p>
              )}
            </div>
            {erroObservacoes && <p style={estilos.mensagemErro}>{erroObservacoes}</p>}
          </div>
        )}

        {aba === "historico" && (
          <div style={estilos.grelhaHistorico}>
            <section style={estilos.cartao}>
              <h2 style={estilos.tituloCartao}>Histórico</h2>
              <div style={estilos.linhaTempo}>
                {historico.map((h, indice) => (
                  <div key={h.id} style={estilos.itemTempo}>
                    <div style={estilos.marcadorColuna}>
                      <span style={estilos.marcadorCirculo} />
                      {indice < historico.length - 1 && <span style={estilos.marcadorLinha} />}
                    </div>
                    <div style={estilos.itemConteudo}>
                      <div style={estilos.itemEstado}>{ROTULOS_ESTADO[h.estado]}</div>
                      <div style={estilos.itemMeta}>
                        {h.alterado_por?.nome} · {new Date(h.alterado_em).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {h.justificacao && (
                        <div style={estilos.itemJustificacao}>Justificação: {h.justificacao}</div>
                      )}
                    </div>
                  </div>
                ))}
                {historico.length === 0 && <p style={estilos.semAnexos}>Sem histórico.</p>}
              </div>
            </section>

            <section style={estilos.cartao}>
              <h2 style={estilos.tituloCartao}>Anexos</h2>
              <div>
                {(documento.anexos ?? []).map((anexo, indice) => (
                  <div key={anexo.id} style={{ ...estilos.linhaAnexo, backgroundColor: indice % 2 === 1 ? "#f7f6f6" : "#ffffff" }}>
                    <div style={estilos.anexoInfo}>
                      <span style={estilos.iconeAnexo}>PDF</span>
                      <div>
                        <button
                          onClick={() => abrirPreviewAnexo(anexo)}
                          style={estilos.nomeAnexo}
                        >
                          {anexo.nome_ficheiro}
                        </button>
                        <div style={estilos.tamanhoAnexo}>
                          {Math.round(anexo.tamanho_bytes / 1024)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => abrirPreviewAnexo(anexo)}
                      style={estilos.botaoDescarregar}
                    >
                      👁️ Ver
                    </button>
                  </div>
                ))}
                {(!documento.anexos || documento.anexos.length === 0) && (
                  <p style={estilos.semAnexos}>Sem anexos.</p>
                )}
              </div>
              {podeAnexar && (
                <div style={estilos.zonaCarregar}>
                  <input
                    type="file"
                    onChange={submeterAnexo}
                    disabled={aProcessar}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <p style={estilos.dicaFicheiro}>PDF, Word, Excel ou imagem, até 20 MB.</p>
                </div>
              )}
            </section>
          </div>
        )}
        {aba === "ficha" && (
          <FichaDocumento documento={documento} historico={historico} observacoes={observacoes} />
        )}
      </div>

      {modalAberto && (
        <div style={estilos.modalFundo}>
          <div style={estilos.modalCaixa}>
            <h3 style={estilos.modalTitulo}>
              {observacaoEmEdicaoId ? "Editar observação" : "Nova observação"}
            </h3>
            <p style={estilos.modalSubtitulo}>
              A observação fica visível a todos os perfis com acesso ao documento.
            </p>
            <textarea
              value={textoObservacao}
              onChange={(e) => setTextoObservacao(e.target.value.slice(0, 500))}
              rows={5}
              maxLength={500}
              style={estilos.textarea}
            />
            <div style={estilos.contagemCaracteres}>{textoObservacao.length}/500</div>
            <div style={estilos.modalAcoes}>
              <button onClick={() => setModalAberto(false)} style={estilos.botaoSecundario}>
                Cancelar
              </button>
              <button disabled={aGravarObservacao} onClick={gravarObservacao} style={estilos.botaoPrimario}>
                {aGravarObservacao ? "A gravar..." : "Gravar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReaberturaAberto && (
        <div style={estilos.modalFundo}>
          <div style={estilos.modalCaixa}>
            <h3 style={estilos.modalTitulo}>Reabrir processo</h3>
            <p style={estilos.modalSubtitulo}>
              O documento volta ao estado em que estava antes da rejeição. Indique o motivo da
              reabertura — fica registado como observação, com data, hora e o seu nome.
            </p>
            <textarea
              value={motivoReabertura}
              onChange={(e) => setMotivoReabertura(e.target.value.slice(0, 500))}
              rows={5}
              maxLength={500}
              placeholder="Motivo da reabertura..."
              style={estilos.textarea}
            />
            <div style={estilos.contagemCaracteres}>{motivoReabertura.length}/500</div>
            <div style={estilos.modalAcoes}>
              <button
                onClick={() => {
                  setModalReaberturaAberto(false);
                  setMotivoReabertura("");
                }}
                style={estilos.botaoSecundario}
              >
                Cancelar
              </button>
              <button
                disabled={aReabrir || motivoReabertura.trim().length < 5}
                onClick={reabrirProcesso}
                style={estilos.botaoPrimario}
              >
                {aReabrir ? "A reabrir..." : "Reabrir processo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aCarregarPreview && (
        <div style={estilos.modalFundo}>
          <p style={{ color: "#ffffff", fontSize: 14 }}>A carregar pré-visualização...</p>
        </div>
      )}

      {erroPreview && (
        <div style={estilos.modalFundo} onClick={() => setErroPreview(null)}>
          <div style={estilos.modalCaixa}>
            <p style={estilos.mensagemErro}>{erroPreview}</p>
          </div>
        </div>
      )}

      {anexoPreview && (
        <div style={estilos.modalFundo} onClick={fecharPreviewAnexo}>
          <div style={estilos.modalPreviewCaixa} onClick={(e) => e.stopPropagation()}>
            <div style={estilos.modalPreviewCabecalho}>
              <span style={estilos.modalPreviewNome}>{anexoPreview.nome}</span>
              <div style={estilos.modalPreviewAcoes}>
                <a
                  href={anexoPreview.url}
                  download={anexoPreview.nome}
                  style={estilos.linkDescarregarPreview}
                >
                  Descarregar
                </a>
                <button onClick={fecharPreviewAnexo} style={estilos.botaoFecharPreview}>
                  ✕
                </button>
              </div>
            </div>
            <div style={estilos.modalPreviewCorpo}>
              {anexoPreview.tipo === "pdf" ? (
                <iframe title={anexoPreview.nome} src={anexoPreview.url} style={estilos.iframePreview} />
              ) : (
                <img src={anexoPreview.url} alt={anexoPreview.nome} style={estilos.imagemPreview} />
              )}
            </div>
          </div>
        </div>
      )}
      {modalAssinaturaAberto && (
        <div style={estilos.modalFundo}>
          <div style={estilos.modalCaixa}>
            <h3 style={estilos.modalTitulo}>Assinar digitalmente</h3>
            <p style={estilos.modalSubtitulo}>
              Está a assinar digitalmente, como Ministro, o documento{" "}
              <strong>{documento.numero_registo}</strong> ({documento.assunto}). Esta ação tem valor
              legal e não pode ser desfeita.
            </p>
            <div style={estilos.modalAcoes}>
              <button onClick={() => setModalAssinaturaAberto(false)} style={estilos.botaoSecundario}>
                Cancelar
              </button>
              <button disabled={aAssinar} onClick={assinarDocumento} style={estilos.botaoPrimario}>
                {aAssinar ? "A assinar..." : "Confirmar e assinar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function BarraTopo({ utilizador, logout }: { utilizador: any; logout: () => void }) {
  return (
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
    case "Validado (Secretariado)":
    case "Validado (serviço)":
      return { backgroundColor: "#e8f3ec", color: "#1f7a4d" };
    case "Arquivado":
      return { backgroundColor: "#f0eeee", color: "#6b6350" };
    case "Receção":
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
    fontWeight: 600,
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
    padding: "24px 32px 48px",
  },
  faixaTopo: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "20px 32px",
    minHeight: 120,
    boxSizing: "border-box",
    borderBottom: "1px solid #e7e5e5",
  },
  abas: {
    display: "flex",
    gap: 4,
    borderBottom: "1px solid #e7e5e5",
    marginBottom: 24,
  },
  abaBotao: {
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#4a4638",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  abaBotaoAtiva: {
    borderBottom: "2px solid #d92b1f",
    color: "#d92b1f",
  },
  painelDetalhes: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    maxWidth: 640,
  },
  grelhaHistorico: {
    display: "grid",
    gridTemplateColumns: "28% 1fr",
    gap: 24,
  },
  painelObservacoes: {
    maxWidth: 760,
  },
  cabecalhoObservacoes: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap",
  },
  notaObservacoes: {
    margin: 0,
    fontSize: 13,
    color: "#8a8371",
  },
  botaoNovaObservacao: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  listaObservacoes: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e7e5e5",
    borderRadius: 12,
    overflow: "hidden",
  },
  itemObservacao: {
    backgroundColor: "#ffffff",
    padding: "16px 18px",
    borderBottom: "1px solid #f0eeee",
  },
  cabecalhoItemObservacao: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  autorObservacao: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1c2b4a",
  },
  perfilObservacao: {
    fontWeight: 400,
    color: "#8a8371",
  },
  metaObservacao: {
    fontSize: 11,
    color: "#8a8371",
    marginTop: 2,
  },
  acoesObservacao: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  botaoEditarObservacao: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2854c9",
    fontSize: 12,
    fontWeight: 600,
  },
  botaoReabrirObservacao: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#ffffff",
    border: "1px solid #2854c9",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    color: "#2854c9",
    fontSize: 12,
    fontWeight: 600,
  },
  tagSoLeitura: {
    fontSize: 11,
    fontWeight: 700,
    color: "#8a8371",
    backgroundColor: "#f0eeee",
    padding: "4px 8px",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  botaoEliminarObservacao: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#d92b1f",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  iconeCirculoEliminar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 15,
    height: 15,
    borderRadius: "50%",
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    fontSize: 12,
    lineHeight: 1,
    fontWeight: 700,
  },
  textoObservacao: {
    margin: "10px 0 0",
    fontSize: 14,
    color: "#2b2b2b",
    lineHeight: 1.5,
  },
  semObservacoes: {
    padding: 24,
    textAlign: "center",
    fontSize: 13,
    color: "#8a8371",
    margin: 0,
  },
  modalFundo: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(28,43,74,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 50,
  },
  modalCaixa: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
  },
  modalTitulo: {
    margin: "0 0 4px",
    fontSize: 17,
    fontWeight: 700,
    color: "#1c2b4a",
  },
  modalSubtitulo: {
    margin: "0 0 16px",
    fontSize: 13,
    color: "#8a8371",
  },
  contagemCaracteres: {
    textAlign: "right",
    fontSize: 12,
    color: "#8a8371",
    marginTop: 6,
  },
  modalAcoes: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  seloAssinatura: {
    marginTop: 20,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 14px",
    backgroundColor: "#e8f3ec",
  },
  seloIcone: {
    color: "#1f7a4d",
    fontWeight: 700,
    fontSize: 14,
  },
  seloTitulo: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1f7a4d",
  },
  seloMeta: {
    fontSize: 12,
    color: "#3f6e54",
    marginTop: 2,
  },
  modalPreviewCaixa: {
    width: "100%",
    maxWidth: 900,
    height: "85vh",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalPreviewCabecalho: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: "1px solid #e7e5e5",
  },
  modalPreviewNome: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1c2b4a",
  },
  modalPreviewAcoes: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  linkDescarregarPreview: {
    fontSize: 13,
    fontWeight: 600,
    color: "#d92b1f",
    textDecoration: "none",
  },
  botaoFecharPreview: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "#4a4638",
    lineHeight: 1,
  },
  modalPreviewCorpo: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0eeee",
    overflow: "auto",
  },
  iframePreview: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  imagemPreview: {
    maxWidth: "100%",
    maxHeight: "100%",
  },
  linkVoltar: {
    display: "inline-block",
    fontSize: 13,
    color: "#4a4638",
    textDecoration: "none",
    marginBottom: 16,
  },
  cabecalho: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  numeroRegisto: {
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 26,
    color: "#1c2b4a",
    letterSpacing: 0.5,
  },
  assunto: {
    margin: "6px 0 2px",
    fontSize: 15,
    fontWeight: 600,
    color: "#2b2b2b",
  },
  remetente: {
    margin: 0,
    fontSize: 13,
    color: "#7a735f",
  },
  badgeEstado: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  badgePonto: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: "currentColor",
  },
  mensagemErro: {
    padding: "10px 14px",
    borderRadius: 8,
    backgroundColor: "#f3dada",
    color: "#a13a3a",
    fontSize: 13,
    marginBottom: 16,
  },
  mensagemEstado: {
    color: "#6b6350",
    fontSize: 14,
  },
  grelha: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 24,
    alignItems: "start",
  },
  colunaEsquerda: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  colunaDireita: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  cartao: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e5e5",
    borderRadius: 12,
    padding: 24,
  },
  tituloCartao: {
    margin: "0 0 16px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a8371",
  },
  grelhaDados: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
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
  badge: {
    display: "inline-flex",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  linhaAnexo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 8px",
    margin: "0 -8px",
    borderBottom: "1px solid #e9e4d5",
  },
  anexoInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconeAnexo: {
    backgroundColor: "#e8edfb",
    color: "#2854c9",
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 8px",
    borderRadius: 6,
  },
  nomeAnexo: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#2b2b2b",
    cursor: "pointer",
    textAlign: "left",
  },
  tamanhoAnexo: {
    fontSize: 12,
    color: "#8a8371",
  },
  botaoDescarregar: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#d92b1f",
    cursor: "pointer",
  },
  semAnexos: {
    fontSize: 13,
    color: "#8a8371",
    margin: 0,
  },
  zonaCarregar: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px dashed #ddd6c4",
  },
  dicaFicheiro: {
    fontSize: 12,
    color: "#8a8371",
    marginTop: 6,
  },
  cartaoAcoes: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e5e5",
    borderLeft: "3px solid #d92b1f",
    borderRadius: 12,
    padding: 24,
  },
  cabecalhoAcoes: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  tituloAcoes: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#d92b1f",
  },
  botoesTopoAcoes: {
    display: "flex",
    gap: 10,
  },
  botaoAcaoTopo: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    cursor: "pointer",
    width: 150,
    height: 38,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
  },
  botaoAcaoTopoContorno: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    border: "1.5px solid #d92b1f",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#d92b1f",
    cursor: "pointer",
    width: 150,
    height: 38,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
  },
  gridChecklist: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
  },
  linhaBotoes: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  botaoPrimario: {
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    cursor: "pointer",
    minWidth: 110,
  },
  botaoSecundario: {
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    border: "1px solid #d92b1f",
    borderRadius: 8,
    backgroundColor: "transparent",
    color: "#d92b1f",
    cursor: "pointer",
    minWidth: 110,
  },
  subCartao: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Arial, Helvetica, sans-serif",
    border: "1px solid #ddd6c4",
    borderRadius: 8,
    resize: "vertical",
  },
  linhaCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#2b2b2b",
    padding: "10px 12px",
    boxSizing: "border-box",
  },
  linhaTempo: {
    display: "flex",
    flexDirection: "column",
  },
  itemTempo: {
    display: "flex",
    gap: 12,
  },
  marcadorColuna: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  marcadorCirculo: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #d92b1f",
    backgroundColor: "#ffffff",
    flexShrink: 0,
    marginTop: 2,
  },
  marcadorLinha: {
    flex: 1,
    width: 1,
    backgroundColor: "#ddd6c4",
    margin: "2px 0",
  },
  itemConteudo: {
    paddingBottom: 20,
  },
  itemEstado: {
    fontSize: 14,
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
};
