import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { invalidarMarcaCache } from "../../config/marca";
import { obterConfig, atualizarConfig } from "../../api/config";
import { Cabecalho } from "../../components/Cabecalho";
import { Rodape } from "../../components/Rodape";

export function AdminConfiguracoes({ semNavbar = false }: { semNavbar?: boolean } = {}) {
  const [sigla, setSigla] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [selo, setSelo] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setACarregar(true);
    setErro(null);
    try {
      const config = await obterConfig();
      setSigla(config.sigla_instituicao);
      setSubtitulo(config.subtitulo);
      setSelo(config.selo);
    } catch {
      setErro("Não foi possível carregar a configuração.");
    } finally {
      setACarregar(false);
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);

    if (!selo.trim()) {
      setErro("O selo (letra/sigla curta no círculo) é obrigatório.");
      return;
    }

    setAGuardar(true);
    try {
      await atualizarConfig({
        sigla_instituicao: sigla.trim(),
        subtitulo: subtitulo.trim(),
        selo: selo.trim(),
      });
      invalidarMarcaCache();
      setSucesso(true);
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? "Não foi possível guardar a configuração.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div style={semNavbar ? undefined : estilos.pagina}>
      {!semNavbar && <Cabecalho subtitulo="Administração · Configurações" />}

      <main style={semNavbar ? undefined : estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <div>
            <h1 style={estilos.titulo}>Configurações da instalação</h1>
            <p style={estilos.subtitulo}>
              Identidade visual mostrada no cabeçalho de toda a aplicação. Útil ao instalar o
              sistema noutro ministério.
            </p>
          </div>
          {!semNavbar && (
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/admin/servicos" style={estilos.linkLista}>
                Serviços
              </Link>
              <Link to="/admin/utilizadores" style={estilos.linkLista}>
                Utilizadores
              </Link>
              <Link to="/dashboard" style={estilos.linkLista}>
                ← Dashboard
              </Link>
            </div>
          )}
        </div>

        {aCarregar ? (
          <p style={estilos.mensagemEstado}>A carregar…</p>
        ) : (
          <form onSubmit={guardar} style={estilos.cartaoForm}>
            <div style={estilos.linhaForm}>
              <label style={estilos.rotulo}>
                Sigla da instituição
                <input
                  value={sigla}
                  onChange={(e) => setSigla(e.target.value)}
                  style={estilos.input}
                  placeholder="Ex.: MTTED"
                  maxLength={30}
                />
                <span style={estilos.ajuda}>
                  Aparece no cabeçalho como "SGD · {sigla || "…"}". Deixe em branco para mostrar
                  apenas "SGD".
                </span>
              </label>
              <label style={estilos.rotulo}>
                Selo (círculo do cabeçalho)
                <input
                  value={selo}
                  onChange={(e) => setSelo(e.target.value)}
                  style={estilos.input}
                  placeholder="Ex.: M"
                  maxLength={4}
                />
                <span style={estilos.ajuda}>Uma letra ou sigla muito curta (até 4 caracteres).</span>
              </label>
            </div>
            <div style={estilos.linhaForm}>
              <label style={{ ...estilos.rotulo, flex: 1 }}>
                Subtítulo
                <input
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  style={estilos.input}
                  placeholder="Ex.: Gestão Documental"
                  maxLength={100}
                />
              </label>
            </div>

            <div style={estilos.pratoPrevia}>
              <span style={estilos.rotuloPrevia}>Pré-visualização:</span>
              <div style={estilos.previaNavbar}>
                <div style={estilos.previaSelo}>{selo || "?"}</div>
                <div>
                  <div style={estilos.previaTitulo}>{sigla ? `SGD · ${sigla}` : "SGD"}</div>
                  <div style={estilos.previaSubtitulo}>{subtitulo || "—"}</div>
                </div>
              </div>
            </div>

            {erro && <p style={estilos.erroTexto}>{erro}</p>}
            {sucesso && <p style={estilos.sucessoTexto}>Configuração guardada com sucesso.</p>}

            <button type="submit" className="botao-vermelho-alerta" style={estilos.botaoPrimario} disabled={aGuardar}>
              {aGuardar ? "A guardar…" : "Guardar configuração"}
            </button>
          </form>
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
  conteudo: { maxWidth: 800, margin: "0 auto", padding: "32px 32px 48px" },
  cabecalhoLista: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  titulo: { margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 28, color: "var(--cor-primaria)" },
  subtitulo: { margin: "6px 0 0", fontSize: 13, color: "#6b6350", maxWidth: 420 },
  linkLista: { fontSize: 13, fontWeight: 600, color: "var(--cor-primaria)", textDecoration: "none" },
  mensagemEstado: { color: "#6b6350", fontSize: 14 },
  cartaoForm: { backgroundColor: "#f5f2e9", borderRadius: 12, padding: 24 },
  linhaForm: { display: "flex", gap: 16, marginBottom: 16 },
  rotulo: { flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#6b6350" },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d2bf", fontSize: 14, fontFamily: "inherit" },
  ajuda: { fontSize: 11, color: "#8a8371" },
  pratoPrevia: { marginBottom: 16 },
  rotuloPrevia: { display: "block", fontSize: 12, color: "#6b6350", marginBottom: 8 },
  previaNavbar: {
    backgroundColor: "var(--cor-primaria)",
    padding: "14px 20px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  previaSelo: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1.5px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 14,
  },
  previaTitulo: { color: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 15 },
  previaSubtitulo: { color: "var(--cor-primaria-suave)", fontSize: 11 },
  erroTexto: { color: "#b3261e", fontSize: 13, marginBottom: 10 },
  sucessoTexto: { color: "#2e7d32", fontSize: 13, marginBottom: 10 },
  botaoPrimario: {
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer",
  },
};
