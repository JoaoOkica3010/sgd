import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  listarServicosAdmin,
  criarServico,
  atualizarServico,
} from "../../api/servicos";
import type { Servico } from "../../types";
import { Cabecalho } from "../../components/Cabecalho";
import { Rodape } from "../../components/Rodape";

export function AdminServicos({ semNavbar = false }: { semNavbar?: boolean } = {}) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function carregar() {
    setACarregar(true);
    setErro(null);
    try {
      const params = filtro === "todos" ? undefined : { ativo: filtro === "ativos" };
      const resultado = await listarServicosAdmin({ ...params, per_page: 100 });
      setServicos(resultado.data);
    } catch {
      setErro("Não foi possível carregar os serviços.");
    } finally {
      setACarregar(false);
    }
  }

  async function alternarAtivo(servico: Servico) {
    try {
      const atualizado = await atualizarServico(servico.id, { ativo: !servico.ativo });
      setServicos((atual) =>
        atual.map((s) => (s.id === servico.id ? atualizado : s))
      );
    } catch {
      setErro("Não foi possível alterar o estado do serviço.");
    }
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setErroForm(null);

    if (!nome.trim()) {
      setErroForm("O nome é obrigatório.");
      return;
    }

    setAGuardar(true);
    try {
      await criarServico({ nome: nome.trim(), descricao: descricao.trim() || undefined });
      setNome("");
      setDescricao("");
      setFormAberto(false);
      carregar();
    } catch (e: any) {
      setErroForm(e?.response?.data?.message ?? "Não foi possível criar o serviço.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div style={semNavbar ? undefined : estilos.pagina}>
      {!semNavbar && <Cabecalho subtitulo="Administração · Serviços" />}

      <main style={semNavbar ? undefined : estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <div>
            <h1 style={estilos.titulo}>Serviços de encaminhamento</h1>
            <p style={estilos.subtitulo}>
              Apenas os serviços ativos aparecem no ecrã de encaminhamento do Ministro.
            </p>
          </div>
          {!semNavbar && (
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/admin/utilizadores" style={estilos.linkLista}>
                Utilizadores
              </Link>
              <Link to="/admin/configuracoes" style={estilos.linkLista}>
                Configurações
              </Link>
              <Link to="/dashboard" style={estilos.linkLista}>
                ← Dashboard
              </Link>
            </div>
          )}
        </div>

        <div style={estilos.barraAcoes}>
          <div style={estilos.filtros}>
            {(["todos", "ativos", "inativos"] as const).map((opcao) => (
              <button
                key={opcao}
                onClick={() => setFiltro(opcao)}
                style={{
                  ...estilos.botaoFiltro,
                  ...(filtro === opcao ? estilos.botaoFiltroAtivo : {}),
                }}
              >
                {opcao === "todos" ? "Todos" : opcao === "ativos" ? "Ativos" : "Inativos"}
              </button>
            ))}
          </div>
          <button className="botao-vermelho-alerta" style={estilos.botaoPrimario} onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "+ Novo serviço"}
          </button>
        </div>

        {formAberto && (
          <form onSubmit={criar} style={estilos.cartaoForm}>
            <div style={estilos.linhaForm}>
              <label style={estilos.rotulo}>
                Nome
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={estilos.input}
                  placeholder="Ex.: Gabinete de Estudos"
                />
              </label>
              <label style={estilos.rotulo}>
                Descrição (opcional)
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  style={estilos.input}
                />
              </label>
            </div>
            {erroForm && <p style={estilos.erroTexto}>{erroForm}</p>}
            <button type="submit" className="botao-vermelho-alerta" style={estilos.botaoPrimario} disabled={aGuardar}>
              {aGuardar ? "A guardar…" : "Guardar serviço"}
            </button>
          </form>
        )}

        {erro && <p style={estilos.erroTexto}>{erro}</p>}

        {aCarregar ? (
          <p style={estilos.mensagemEstado}>A carregar…</p>
        ) : servicos.length === 0 ? (
          <p style={estilos.mensagemEstado}>Nenhum serviço encontrado.</p>
        ) : (
          <div style={estilos.tabela}>
            <div style={{ ...estilos.linhaTabela, ...estilos.cabecalhoTabela }}>
              <span style={{ flex: 2 }}>Nome</span>
              <span style={{ flex: 3 }}>Descrição</span>
              <span style={{ flex: 1 }}>Estado</span>
              <span style={{ flex: 1, textAlign: "right" }}>Ação</span>
            </div>
            {servicos.map((servico) => (
              <div key={servico.id} style={estilos.linhaTabela}>
                <span style={{ flex: 2, fontWeight: 600 }}>{servico.nome}</span>
                <span style={{ flex: 3, color: "#6b6350" }}>{servico.descricao ?? "—"}</span>
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      ...estilos.estadoBadge,
                      ...(servico.ativo ? estilos.estadoAtivo : estilos.estadoInativo),
                    }}
                  >
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </span>
                </span>
                <span style={{ flex: 1, textAlign: "right" }}>
                  <button onClick={() => alternarAtivo(servico)} style={estilos.botaoSecundario}>
                    {servico.ativo ? "Desativar" : "Ativar"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
      {!semNavbar && <Rodape />}
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: { minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" },
  navbar: {
    backgroundColor: "var(--cor-primaria)",
    padding: "16px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marca: { display: "flex", alignItems: "center", gap: 12 },
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
  marcaTitulo: { color: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 16 },
  marcaSubtitulo: { color: "var(--cor-primaria-suave)", fontSize: 12 },
  utilizadorArea: { display: "flex", alignItems: "center", gap: 12 },
  utilizadorNome: { color: "#ffffff", fontSize: 14 },
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
  conteudo: { maxWidth: 1000, margin: "0 auto", padding: "32px 32px 48px" },
  cabecalhoLista: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  titulo: { margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 28, color: "var(--cor-primaria)" },
  subtitulo: { margin: "6px 0 0", fontSize: 13, color: "#6b6350" },
  linkLista: { fontSize: 13, fontWeight: 600, color: "var(--cor-primaria)", textDecoration: "none" },
  barraAcoes: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  filtros: { display: "flex", gap: 8 },
  botaoFiltro: {
    border: "1px solid #e9e4d5",
    backgroundColor: "#ffffff",
    color: "#6b6350",
    fontSize: 13,
    padding: "6px 14px",
    borderRadius: 20,
    cursor: "pointer",
  },
  botaoFiltroAtivo: { backgroundColor: "var(--cor-primaria)", color: "#ffffff", borderColor: "var(--cor-primaria)" },
  botaoPrimario: {
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer",
  },
  botaoSecundario: {
    backgroundColor: "#ffffff",
    color: "var(--cor-primaria)",
    border: "1px solid var(--cor-primaria)",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },
  cartaoForm: {
    backgroundColor: "#f5f2e9",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  linhaForm: { display: "flex", gap: 16, marginBottom: 12 },
  rotulo: { flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#6b6350" },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d8d2bf",
    fontSize: 14,
    fontFamily: "inherit",
  },
  erroTexto: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
  mensagemEstado: { color: "#6b6350", fontSize: 14 },
  tabela: { border: "1px solid #e9e4d5", borderRadius: 12, overflow: "hidden" },
  linhaTabela: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #e9e4d5",
    fontSize: 14,
  },
  cabecalhoTabela: {
    backgroundColor: "#f5f2e9",
    fontSize: 12,
    fontWeight: 700,
    color: "#6b6350",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  estadoBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 20,
  },
  estadoAtivo: { backgroundColor: "#e3f0e3", color: "#2e7d32" },
  estadoInativo: { backgroundColor: "#f2e3e3", color: "#b3261e" },
};
