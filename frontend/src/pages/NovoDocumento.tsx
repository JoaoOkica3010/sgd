import { useState, type FormEvent } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { criarDocumento } from "../api/documentos";
import { useAuth } from "../auth/AuthContext";

const PERFIS_PODEM_CRIAR = ["RECEP", "SECR", "ADMIN"];

export function NovoDocumento() {
  const navegar = useNavigate();
  const { utilizador, logout } = useAuth();
  const podeCriar = !!utilizador?.perfil && PERFIS_PODEM_CRIAR.includes(utilizador.perfil);
  const [remetente, setRemetente] = useState("");
  const [assunto, setAssunto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("Oficio");
  const [prioridade, setPrioridade] = useState<"Normal" | "Urgente" | "Muito Urgente">("Normal");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  if (!podeCriar) {
    return <Navigate to="/documentos" replace />;
  }

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAGuardar(true);
    try {
      const doc = await criarDocumento({ remetente, assunto, tipo_documento: tipoDocumento, prioridade });
      navegar(`/documentos/${doc.id}`);
    } catch (erroPedido) {
      if (isAxiosError(erroPedido) && erroPedido.response?.status === 403) {
        setErro("Não tem permissão para criar registos de documentos. Contacte o Secretariado.");
      } else if (isAxiosError(erroPedido) && erroPedido.response?.data?.detail) {
        setErro(erroPedido.response.data.detail);
      } else {
        setErro("Não foi possível criar o registo. Verifique os dados introduzidos.");
      }
    } finally {
      setAGuardar(false);
    }
  }

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

      <div style={estilos.conteudo}>
        <Link to="/documentos" style={estilos.linkVoltar}>
          ← Voltar à lista
        </Link>

        <h1 style={estilos.titulo}>Novo registo de documento</h1>

        <div style={estilos.cartao}>
          <form onSubmit={submeter} style={estilos.formulario}>
            <label style={estilos.campoBloco}>
              <span style={estilos.rotulo}>Remetente</span>
              <input
                value={remetente}
                onChange={(e) => setRemetente(e.target.value)}
                required
                style={estilos.campo}
              />
            </label>
            <label style={estilos.campoBloco}>
              <span style={estilos.rotulo}>Assunto</span>
              <input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                required
                style={estilos.campo}
              />
            </label>
            <label style={estilos.campoBloco}>
              <span style={estilos.rotulo}>Tipo de documento</span>
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={estilos.campo}>
                <option value="Oficio">Ofício</option>
                <option value="Carta">Carta</option>
                <option value="Memo">Memo</option>
                <option value="Nota">Nota</option>
                <option value="Outro">Outro</option>
              </select>
            </label>
            <label style={estilos.campoBloco}>
              <span style={estilos.rotulo}>Prioridade</span>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
                style={estilos.campo}
              >
                <option value="Normal">Normal</option>
                <option value="Urgente">Urgente</option>
                <option value="Muito Urgente">Muito Urgente</option>
              </select>
            </label>

            {erro && <p style={estilos.mensagemErro}>{erro}</p>}

            <button type="submit" disabled={aGuardar} style={estilos.botaoPrimario}>
              {aGuardar ? "A gravar..." : "Gravar"}
            </button>
          </form>

          <p style={estilos.dica}>
            Após gravar, poderá anexar ficheiros e submeter o registo para validação do Secretariado.
          </p>
        </div>
      </div>
    </div>
  );
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
  marcaTitulo: {
    color: "#ffffff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 16,
    whiteSpace: "nowrap",
  },
  marcaSubtitulo: { color: "#b9c2d6", fontSize: 12, whiteSpace: "nowrap" },
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
  conteudo: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "32px 32px 48px",
  },
  linkVoltar: {
    display: "inline-block",
    fontSize: 13,
    color: "#4a4638",
    textDecoration: "none",
    marginBottom: 16,
  },
  titulo: {
    margin: "0 0 20px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 24,
    color: "#1c2b4a",
  },
  cartao: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e5e5",
    borderRadius: 12,
    padding: 24,
  },
  formulario: { display: "flex", flexDirection: "column", gap: 16 },
  campoBloco: { display: "block" },
  rotulo: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#4a4638",
  },
  campo: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "Arial, Helvetica, sans-serif",
    border: "1px solid #ddd6c4",
    borderRadius: 8,
    backgroundColor: "#faf8f2",
    color: "#2b2b2b",
    outline: "none",
  },
  mensagemErro: {
    margin: 0,
    fontSize: 13,
    color: "#d92b1f",
  },
  botaoPrimario: {
    marginTop: 4,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#d92b1f",
    color: "#ffffff",
    cursor: "pointer",
  },
  dica: {
    fontSize: 12,
    color: "#8a8371",
    marginTop: 16,
  },
};
