import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listarUtilizadores, criarUtilizador, atualizarUtilizador } from "../../api/utilizadores";
import { listarPerfis, type PerfilResumo } from "../../api/perfis";
import type { UtilizadorAdmin } from "../../types";
import { Cabecalho } from "../../components/Cabecalho";
import { Rodape } from "../../components/Rodape";

export function AdminUtilizadores({ semNavbar = false }: { semNavbar?: boolean } = {}) {
  const [utilizadores, setUtilizadores] = useState<UtilizadorAdmin[]>([]);
  const [perfis, setPerfis] = useState<PerfilResumo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perfilId, setPerfilId] = useState<number | "">("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [emEdicao, setEmEdicao] = useState<UtilizadorAdmin | null>(null);
  const [perfilEdicao, setPerfilEdicao] = useState<number | "">("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setACarregar(true);
    setErro(null);
    try {
      const [resUtilizadores, resPerfis] = await Promise.all([
        listarUtilizadores({ per_page: 100 }),
        listarPerfis(),
      ]);
      setUtilizadores(resUtilizadores.data);
      setPerfis(resPerfis);
    } catch {
      setErro("Não foi possível carregar os utilizadores.");
    } finally {
      setACarregar(false);
    }
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setErroForm(null);

    if (!nome.trim() || !email.trim() || !password || !perfilId) {
      setErroForm("Preencha nome, email, palavra-passe e perfil.");
      return;
    }

    setAGuardar(true);
    try {
      await criarUtilizador({ nome: nome.trim(), email: email.trim(), password, perfil_id: Number(perfilId) });
      setNome("");
      setEmail("");
      setPassword("");
      setPerfilId("");
      setFormAberto(false);
      carregar();
    } catch (e: any) {
      setErroForm(e?.response?.data?.message ?? "Não foi possível criar o utilizador.");
    } finally {
      setAGuardar(false);
    }
  }

  function iniciarEdicao(u: UtilizadorAdmin) {
    setEmEdicao(u);
    setPerfilEdicao(u.perfil_id);
  }

  async function guardarEdicao() {
    if (!emEdicao || !perfilEdicao) return;
    try {
      const atualizado = await atualizarUtilizador(emEdicao.id, { perfil_id: Number(perfilEdicao) });
      setUtilizadores((atual) => atual.map((u) => (u.id === emEdicao.id ? atualizado : u)));
      setEmEdicao(null);
    } catch {
      setErro("Não foi possível atualizar o perfil do utilizador.");
    }
  }

  async function alternarAtivo(u: UtilizadorAdmin) {
    try {
      const atualizado = await atualizarUtilizador(u.id, { ativo: !u.ativo });
      setUtilizadores((atual) => atual.map((x) => (x.id === u.id ? atualizado : x)));
    } catch {
      setErro("Não foi possível alterar o estado do utilizador.");
    }
  }

  return (
    <div style={semNavbar ? undefined : estilos.pagina}>
      {!semNavbar && <Cabecalho subtitulo="Administração · Utilizadores" />}

      <main style={semNavbar ? undefined : estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <div>
            <h1 style={estilos.titulo}>Utilizadores</h1>
            <p style={estilos.subtitulo}>Criar novos utilizadores e atribuir/alterar o respetivo perfil de acesso.</p>
          </div>
          {!semNavbar && (
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/admin/servicos" style={estilos.linkLista}>
                Serviços
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
          <button className="botao-vermelho-alerta" style={estilos.botaoPrimario} onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "+ Novo utilizador"}
          </button>
        </div>

        {formAberto && (
          <form onSubmit={criar} style={estilos.cartaoForm}>
            <div style={estilos.linhaForm}>
              <label style={estilos.rotulo}>
                Nome
                <input value={nome} onChange={(e) => setNome(e.target.value)} style={estilos.input} />
              </label>
              <label style={estilos.rotulo}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={estilos.input}
                />
              </label>
            </div>
            <div style={estilos.linhaForm}>
              <label style={estilos.rotulo}>
                Palavra-passe inicial
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={estilos.input}
                  minLength={8}
                />
              </label>
              <label style={estilos.rotulo}>
                Perfil de acesso
                <select
                  value={perfilId}
                  onChange={(e) => setPerfilId(e.target.value ? Number(e.target.value) : "")}
                  style={estilos.input}
                >
                  <option value="">Selecionar…</option>
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sigla} — {p.nome_servico}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {erroForm && <p style={estilos.erroTexto}>{erroForm}</p>}
            <button type="submit" className="botao-vermelho-alerta" style={estilos.botaoPrimario} disabled={aGuardar}>
              {aGuardar ? "A guardar…" : "Criar utilizador"}
            </button>
          </form>
        )}

        {erro && <p style={estilos.erroTexto}>{erro}</p>}

        {aCarregar ? (
          <p style={estilos.mensagemEstado}>A carregar…</p>
        ) : (
          <div style={estilos.tabela}>
            <div style={{ ...estilos.linhaTabela, ...estilos.cabecalhoTabela }}>
              <span style={{ flex: 2 }}>Nome</span>
              <span style={{ flex: 2 }}>Email</span>
              <span style={{ flex: 1 }}>Perfil</span>
              <span style={{ flex: 1 }}>Estado</span>
              <span style={{ flex: 2, textAlign: "right" }}>Ações</span>
            </div>
            {utilizadores.map((u) => (
              <div key={u.id} style={estilos.linhaTabela}>
                <span style={{ flex: 2, fontWeight: 600 }}>{u.nome}</span>
                <span style={{ flex: 2, color: "#6b6350" }}>{u.email}</span>
                <span style={{ flex: 1 }}>
                  {emEdicao?.id === u.id ? (
                    <select
                      value={perfilEdicao}
                      onChange={(e) => setPerfilEdicao(Number(e.target.value))}
                      style={estilos.inputCompacto}
                    >
                      {perfis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sigla}
                        </option>
                      ))}
                    </select>
                  ) : (
                    u.perfil?.sigla
                  )}
                </span>
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      ...estilos.estadoBadge,
                      ...(u.ativo ? estilos.estadoAtivo : estilos.estadoInativo),
                    }}
                  >
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </span>
                <span style={{ flex: 2, textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  {emEdicao?.id === u.id ? (
                    <>
                      <button onClick={guardarEdicao} className="botao-vermelho-alerta" style={estilos.botaoPrimario}>
                        Guardar
                      </button>
                      <button onClick={() => setEmEdicao(null)} style={estilos.botaoSecundario}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => iniciarEdicao(u)} style={estilos.botaoSecundario}>
                        Alterar perfil
                      </button>
                      <button onClick={() => alternarAtivo(u)} style={estilos.botaoSecundario}>
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </>
                  )}
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
  conteudo: { maxWidth: 1100, margin: "0 auto", padding: "32px 32px 48px" },
  cabecalhoLista: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  titulo: { margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 28, color: "var(--cor-primaria)" },
  subtitulo: { margin: "6px 0 0", fontSize: 13, color: "#6b6350" },
  linkLista: { fontSize: 13, fontWeight: 600, color: "var(--cor-primaria)", textDecoration: "none" },
  barraAcoes: { display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 16 },
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
  cartaoForm: { backgroundColor: "#f5f2e9", borderRadius: 12, padding: 20, marginBottom: 20 },
  linhaForm: { display: "flex", gap: 16, marginBottom: 12 },
  rotulo: { flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#6b6350" },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d2bf", fontSize: 14, fontFamily: "inherit" },
  inputCompacto: { padding: "4px 8px", borderRadius: 6, border: "1px solid #d8d2bf", fontSize: 13 },
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
  estadoBadge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 },
  estadoAtivo: { backgroundColor: "#e3f0e3", color: "#2e7d32" },
  estadoInativo: { backgroundColor: "#f2e3e3", color: "#b3261e" },
};
