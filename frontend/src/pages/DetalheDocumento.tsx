import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  arquivarDocumento, encaminharDocumento, iniciarAnaliseDocumento, obterDocumento,
  obterHistoricoDocumento, rejeitarDocumento, submeterDocumento, validarDocumento,
  validarServicoDocumento,
} from "../api/documentos";
import { baixarAnexo, carregarAnexo } from "../api/anexos";
import { listarPerfis, type PerfilResumo } from "../api/perfis";
import { ROTULOS_ESTADO, type Documento, type EstadoHistorico } from "../types";
import { useAuth } from "../auth/AuthContext";

export function DetalheDocumento() {
  const { id } = useParams<{ id: string }>();
  const { utilizador } = useAuth();

  const [documento, setDocumento] = useState<Documento | null>(null);
  const [historico, setHistorico] = useState<EstadoHistorico[]>([]);
  const [perfis, setPerfis] = useState<PerfilResumo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState(false);

  const [servicosEscolhidos, setServicosEscolhidos] = useState<number[]>([]);
  const [justificacaoRejeicao, setJustificacaoRejeicao] = useState("");
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);

  useEffect(() => {
    if (id) carregarTudo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  if (aCarregar) return <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>A carregar...</div>;
  if (!documento) {
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
        <p style={{ color: "crimson" }}>{erro ?? "Documento não encontrado."}</p>
        <Link to="/documentos">← Voltar à lista</Link>
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
  const podeRejeitar = ["submetido", "encaminhado", "em_analise"].includes(documento.estado_atual) && perfil !== "RECEP" && perfil !== "ARQ";
  const podeAnexar =
    (perfil === "RECEP" && documento.estado_atual === "recepcao") ||
    (perfil === "SECR" && ["recepcao", "submetido"].includes(documento.estado_atual)) ||
    (perfil !== "RECEP" && perfil !== "SECR" && perfil !== "MIN" && perfil !== "ARQ" &&
      ["encaminhado", "em_analise"].includes(documento.estado_atual));

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <Link to="/documentos">← Voltar à lista</Link>

      <h1 style={{ fontSize: 20, marginTop: 12 }}>{documento.numero_registo}</h1>
      <p style={{ color: "#666" }}>
        Estado atual: <strong>{ROTULOS_ESTADO[documento.estado_atual]}</strong>
      </p>

      <table style={{ width: "100%", marginTop: 16, fontSize: 14 }}>
        <tbody>
          <tr><td style={{ color: "#666", padding: "4px 0" }}>Remetente</td><td>{documento.remetente}</td></tr>
          <tr><td style={{ color: "#666", padding: "4px 0" }}>Assunto</td><td>{documento.assunto}</td></tr>
          <tr><td style={{ color: "#666", padding: "4px 0" }}>Tipo</td><td>{documento.tipo_documento}</td></tr>
          <tr><td style={{ color: "#666", padding: "4px 0" }}>Prioridade</td><td>{documento.prioridade}</td></tr>
        </tbody>
      </table>

      {erro && <p style={{ color: "crimson", marginTop: 16 }}>{erro}</p>}

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Anexos</h2>
      <ul style={{ paddingLeft: 18, fontSize: 14 }}>
        {(documento.anexos ?? []).map((anexo) => (
          <li key={anexo.id} style={{ marginBottom: 4 }}>
            <button
              onClick={() => baixarAnexo(anexo.id, anexo.nome_ficheiro)}
              style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              {anexo.nome_ficheiro}
            </button>
            {" "}<span style={{ color: "#999" }}>({Math.round(anexo.tamanho_bytes / 1024)} KB)</span>
          </li>
        ))}
        {(!documento.anexos || documento.anexos.length === 0) && <li style={{ color: "#999" }}>Sem anexos.</li>}
      </ul>
      {podeAnexar && (
        <div>
          <input type="file" onChange={submeterAnexo} disabled={aProcessar} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
          <p style={{ color: "#999", fontSize: 12 }}>PDF, Word, Excel ou imagem, até 20 MB.</p>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Ações</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {podeSubmeter && (
          <button disabled={aProcessar} onClick={() => id && executarAcao(() => submeterDocumento(id))}>
            Submeter para validação
          </button>
        )}
        {podeValidarSecretariado && (
          <button disabled={aProcessar} onClick={() => id && executarAcao(() => validarDocumento(id))}>
            Validar (Secretariado)
          </button>
        )}
        {podeIniciarAnalise && (
          <button disabled={aProcessar} onClick={() => id && executarAcao(() => iniciarAnaliseDocumento(id))}>
            Iniciar análise
          </button>
        )}
        {podeValidarServico && (
          <button disabled={aProcessar} onClick={() => id && executarAcao(() => validarServicoDocumento(id))}>
            Validar (concluir análise)
          </button>
        )}
        {podeArquivar && (
          <button disabled={aProcessar} onClick={() => id && executarAcao(() => arquivarDocumento(id))}>
            Arquivar
          </button>
        )}
        {podeRejeitar && (
          <button disabled={aProcessar} onClick={() => setMostrarRejeicao((v) => !v)}>
            Rejeitar...
          </button>
        )}
      </div>

      {podeRejeitar && mostrarRejeicao && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <label>
            Justificação (obrigatória)
            <textarea
              value={justificacaoRejeicao}
              onChange={(e) => setJustificacaoRejeicao(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
              rows={3}
            />
          </label>
          <button
            disabled={aProcessar || justificacaoRejeicao.trim().length < 5}
            onClick={() => id && executarAcao(() => rejeitarDocumento(id, justificacaoRejeicao))}
            style={{ marginTop: 8 }}
          >
            Confirmar rejeição
          </button>
        </div>
      )}

      {podeEncaminhar && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Encaminhar para:</p>
          {perfis.filter((p) => p.sigla !== "MIN" && p.sigla !== "RECEP").map((p) => (
            <label key={p.id} style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={servicosEscolhidos.includes(p.id)}
                onChange={() => alternarServico(p.id)}
              />
              {" "}{p.nome_servico} ({p.sigla})
            </label>
          ))}
          <button
            disabled={aProcessar || servicosEscolhidos.length === 0}
            onClick={() => id && executarAcao(() => encaminharDocumento(id, servicosEscolhidos))}
            style={{ marginTop: 8 }}
          >
            Confirmar encaminhamento
          </button>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Histórico</h2>
      <ul style={{ paddingLeft: 18, fontSize: 14 }}>
        {historico.map((h) => (
          <li key={h.id} style={{ marginBottom: 6 }}>
            <strong>{ROTULOS_ESTADO[h.estado]}</strong> — {h.alterado_por?.nome} em{" "}
            {new Date(h.alterado_em).toLocaleString("pt-PT")}
            {h.justificacao && <div style={{ color: "#666" }}>Justificação: {h.justificacao}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}