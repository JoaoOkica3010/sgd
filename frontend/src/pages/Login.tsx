import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMarca } from "../config/marca";
import { Rodape } from "../components/Rodape";

export function Login() {
  const { login } = useAuth();
  const marca = useMarca();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [manterSessao, setManterSessao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setACarregar(true);
    try {
      await login(email, password);
      navegar("/dashboard");
    } catch {
      setErro("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.navbarTopo}>
        <div style={estilos.navbarMarcaGrupo}>
          <div style={estilos.navbarSelo}>{marca.selo}</div>
          <span style={estilos.navbarMarca}>{marca.titulo}</span>
        </div>
      </div>
      <div style={estilos.cartaoExterior}>
        <div style={estilos.colunaEsquerda}>
          <div style={estilos.marca}>SGD</div>
          <div style={estilos.blocoCentrado}>
            <h1 style={estilos.titulo}>
              Sistema
              <br />
              de Gestão
              <br />
              Documental
            </h1>
            <p style={estilos.subtitulo}>
              Registo, encaminhamento e arquivo do expediente ministerial. Cada
              documento com um estado, um responsável e um prazo.
            </p>
          </div>
        </div>

        <div style={estilos.colunaDireita}>
          <div style={estilos.formuladorContentor}>
            <div style={estilos.eyebrow}>Autenticação</div>
            <h2 style={estilos.tituloFormulario}>Entrar na plataforma</h2>
            <p style={estilos.subtituloFormulario}>
              Use as credenciais institucionais atribuídas ao seu perfil.
            </p>
            <div style={estilos.divisor} />

            <form onSubmit={submeter} style={estilos.formulario}>
              <label style={estilos.campoBloco}>
                <span style={estilos.rotulo}>E-mail institucional</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={estilos.campo}
                />
              </label>

              <label style={estilos.campoBloco}>
                <span style={estilos.rotulo}>Palavra-passe</span>
                <div style={estilos.campoSenhaContentor}>
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={estilos.campoSenha}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((v) => !v)}
                    style={estilos.botaoMostrarSenha}
                    aria-label={mostrarPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                    aria-pressed={mostrarPassword}
                    title={mostrarPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  >
                    {mostrarPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M6.5 6.7C4.3 8.1 2.7 10 2 12c1.5 4 5.5 7 10 7 1.6 0 3.1-.4 4.5-1.1M9.9 4.2A10.4 10.4 0 0112 4c4.5 0 8.5 3 10 7-.5 1.3-1.2 2.5-2.2 3.6"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M2 12c1.5-4 5.5-7 10-7s8.5 3 10 7c-1.5 4-5.5 7-10 7s-8.5-3-10-7z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <div style={estilos.linhaOpcoes}>
                <label style={estilos.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={manterSessao}
                    onChange={(e) => setManterSessao(e.target.checked)}
                    style={estilos.checkbox}
                  />
                  Manter sessão neste equipamento
                </label>
                <a href="/recuperar-acesso" style={estilos.linkRecuperar}>
                  Recuperar acesso
                </a>
              </div>

              {erro && <p style={estilos.mensagemErro}>{erro}</p>}

              <button type="submit" disabled={aCarregar} className="botao-vermelho-alerta" style={estilos.botao}>
                {aCarregar ? "A entrar..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Rodape />
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    fontFamily: "'Inter', Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },
  navbarTopo: {
    width: "100%",
    maxWidth: 970,
    backgroundColor: "var(--cor-primaria)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    marginBottom: 20,
  },
  navbarMarcaGrupo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  navbarSelo: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "1.5px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: 16,
  },
  navbarMarca: {
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  cartaoExterior: {
    width: "100%",
    maxWidth: 970,
    display: "grid",
    gridTemplateColumns: "40% 60%",
    border: "1px solid #e7e5e5",
    overflow: "hidden",
  },
  colunaEsquerda: {
    backgroundColor: "var(--cor-primaria)",
    display: "flex",
    flexDirection: "column",
    padding: "40px 56px",
  },
  marca: {
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  blocoCentrado: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 20,
  },
  titulo: {
    margin: 0,
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 30,
    lineHeight: 1.15,
  },
  subtitulo: {
    margin: 0,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 320,
  },
  colunaDireita: {
    backgroundColor: "#f3f2f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  formuladorContentor: {
    width: "100%",
    maxWidth: 380,
  },
  eyebrow: {
    color: "#d92b1f",
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  tituloFormulario: {
    margin: "0 0 8px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    fontSize: 27,
    color: "var(--cor-primaria)",
  },
  subtituloFormulario: {
    margin: "0 0 20px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "#5c5647",
  },
  divisor: {
    height: 2,
    backgroundColor: "#ddd6c4",
    marginBottom: 24,
  },
  formulario: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  campoBloco: {
    display: "block",
  },
  rotulo: {
    display: "block",
    marginBottom: 6,
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: "#5c5647",
  },
  campo: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 40,
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    border: "1px solid #ddd6c4",
    borderRadius: 0,
    backgroundColor: "#eae7e7",
    color: "#2b2b2b",
    outline: "none",
  },
  campoSenhaContentor: {
    position: "relative",
    display: "flex",
  },
  campoSenha: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 40,
    padding: "8px 42px 8px 12px",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    border: "1px solid #ddd6c4",
    borderRadius: 0,
    backgroundColor: "#eae7e7",
    color: "#2b2b2b",
    outline: "none",
  },
  botaoMostrarSenha: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "#7a7364",
    cursor: "pointer",
  },
  linhaOpcoes: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    flexWrap: "wrap",
    gap: 8,
    fontFamily: "'Inter', sans-serif",
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#2b2b2b",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#d92b1f",
  },
  linkRecuperar: {
    fontSize: 13,
    fontWeight: 700,
    color: "#d92b1f",
    textDecoration: "none",
  },
  mensagemErro: {
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "#d92b1f",
  },
  botao: {
    marginTop: 8,
    padding: "13px 0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 0,
    cursor: "pointer",
  },
};
