import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

export function RecuperarAcesso() {
  const [email, setEmail] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      await apiClient.post("/auth/recuperar-acesso", { email });
      // Mensagem genérica por segurança: não confirma nem nega se o e-mail
      // existe no sistema.
      setEnviado(true);
    } catch {
      setErro("Não foi possível processar o pedido. Tente novamente mais tarde.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.navbarTopo}>
        <div style={estilos.navbarMarcaGrupo}>
          <div style={estilos.navbarSelo}>M</div>
          <span style={estilos.navbarMarca}>SGD · MTTED</span>
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
            <h2 style={estilos.tituloFormulario}>Recuperar acesso</h2>
            <p style={estilos.subtituloFormulario}>
              Indique o seu e-mail institucional. Se existir uma conta associada,
              enviaremos instruções para repor a palavra-passe.
            </p>
            <div style={estilos.divisor} />

            {enviado ? (
              <div style={estilos.mensagemSucesso}>
                Se o e-mail introduzido corresponder a uma conta, receberá em
                breve instruções para repor a palavra-passe.
              </div>
            ) : (
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

                {erro && <p style={estilos.mensagemErro}>{erro}</p>}

                <button type="submit" disabled={aEnviar} style={estilos.botao}>
                  {aEnviar ? "A enviar..." : "Enviar instruções"}
                </button>
              </form>
            )}

            <Link to="/login" style={estilos.linkVoltar}>
              ← Voltar ao login
            </Link>
          </div>
        </div>
      </div>
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
    backgroundColor: "#1c2b4a",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 32px",
    marginBottom: 20,
    boxSizing: "border-box",
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
    backgroundColor: "#d92b1f",
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
    color: "#1c2b4a",
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
  mensagemErro: {
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "#d92b1f",
  },
  mensagemSucesso: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "#1f7a4d",
    backgroundColor: "#e8f3ec",
    padding: "14px 16px",
    lineHeight: 1.5,
  },
  botao: {
    marginTop: 8,
    padding: "13px 0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#d92b1f",
    border: "none",
    borderRadius: 0,
    cursor: "pointer",
  },
  linkVoltar: {
    display: "inline-block",
    marginTop: 20,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#1c2b4a",
    textDecoration: "none",
  },
};
