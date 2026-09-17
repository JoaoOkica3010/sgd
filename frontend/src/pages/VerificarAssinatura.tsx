import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verificarCodigo, type ResultadoVerificacao } from "../api/verificacao";
import { useMarca } from "../config/marca";
import { Rodape } from "../components/Rodape";

// Página pública (sem sessão) — destino do QR/código impressos na Ficha
// do documento, para qualquer pessoa confirmar que uma assinatura é
// mesmo um registo válido do SGD, sem expor o conteúdo do documento.
export function VerificarAssinatura() {
  const { codigo } = useParams<{ codigo: string }>();
  const marca = useMarca();
  const [resultado, setResultado] = useState<ResultadoVerificacao | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo) return;
    (async () => {
      setACarregar(true);
      setErro(null);
      try {
        setResultado(await verificarCodigo(codigo));
      } catch {
        setErro("Não foi possível verificar este código agora. Tente novamente mais tarde.");
      } finally {
        setACarregar(false);
      }
    })();
  }, [codigo]);

  return (
    <div style={estilos.pagina}>
      <div style={estilos.navbarTopo}>
        <div style={estilos.navbarMarcaGrupo}>
          <div style={estilos.navbarSelo}>{marca.selo}</div>
          <span style={estilos.navbarMarca}>{marca.titulo}</span>
        </div>
      </div>

      <main style={estilos.conteudo}>
        <div style={estilos.eyebrow}>Verificação de assinatura</div>
        <h1 style={estilos.titulo}>Autenticidade do documento</h1>
        <p style={estilos.codigoTexto}>
          Código: <strong>{codigo}</strong>
        </p>

        <div style={estilos.cartao}>
          {aCarregar && <p style={estilos.textoNeutro}>A verificar…</p>}

          {!aCarregar && erro && <p style={estilos.textoErro}>{erro}</p>}

          {!aCarregar && !erro && resultado && !resultado.encontrado && (
            <>
              <div style={estilos.seloInvalido}>✕</div>
              <h2 style={estilos.tituloResultadoInvalido}>Código não reconhecido</h2>
              <p style={estilos.textoNeutro}>
                Não existe nenhuma assinatura registada no SGD com este código. Se o
                código veio de um documento impresso, confirme se foi copiado
                corretamente.
              </p>
            </>
          )}

          {!aCarregar && !erro && resultado?.encontrado && (
            <>
              <div style={estilos.seloValido}>✓</div>
              <h2 style={estilos.tituloResultadoValido}>Assinatura autêntica</h2>
              <p style={estilos.textoNeutro}>
                Este código corresponde a uma assinatura digital registada no SGD.
              </p>
              <div style={estilos.detalhes}>
                <div>
                  <div style={estilos.rotuloDado}>Documento</div>
                  <div style={estilos.valorDado}>{resultado.numero_registo ?? "—"}</div>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Tipo</div>
                  <div style={estilos.valorDado}>{resultado.tipo_documento ?? "—"}</div>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Assinado por</div>
                  <div style={estilos.valorDado}>{resultado.assinado_por ?? "—"}</div>
                </div>
                <div>
                  <div style={estilos.rotuloDado}>Data</div>
                  <div style={estilos.valorDado}>
                    {resultado.assinado_em
                      ? new Date(resultado.assinado_em).toLocaleString("pt-PT", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Rodape />
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: { minHeight: "100vh", backgroundColor: "#f5f2e9", fontFamily: "Arial, Helvetica, sans-serif" },
  navbarTopo: {
    backgroundColor: "var(--cor-primaria)",
    padding: "16px 32px",
  },
  navbarMarcaGrupo: { display: "flex", alignItems: "center", gap: 12, maxWidth: 560, margin: "0 auto" },
  navbarSelo: {
    width: 34,
    height: 34,
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
  navbarMarca: { color: "#ffffff", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 15 },
  conteudo: { maxWidth: 560, margin: "0 auto", padding: "48px 24px 64px" },
  eyebrow: {
    fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
    color: "#8a8371", marginBottom: 6,
  },
  titulo: {
    margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 26,
    color: "var(--cor-primaria)",
  },
  codigoTexto: { fontSize: 14, color: "#6b6350", marginTop: 8, marginBottom: 28, letterSpacing: 0.5 },
  cartao: {
    backgroundColor: "#ffffff", border: "1px solid #e9e4d5", borderRadius: 14,
    padding: "32px 28px", textAlign: "center",
  },
  textoNeutro: { fontSize: 14, color: "#6b6350", lineHeight: 1.6, margin: "0 auto", maxWidth: 400 },
  textoErro: { fontSize: 14, color: "#b3261e" },
  seloValido: {
    width: 52, height: 52, borderRadius: "50%", backgroundColor: "#e3f0e3", color: "#2e7d32",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
    fontSize: 26, fontWeight: 700,
  },
  seloInvalido: {
    width: 52, height: 52, borderRadius: "50%", backgroundColor: "#f2e3e3", color: "#b3261e",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
    fontSize: 26, fontWeight: 700,
  },
  tituloResultadoValido: { fontSize: 18, fontWeight: 700, color: "#2e7d32", margin: "0 0 8px" },
  tituloResultadoInvalido: { fontSize: 18, fontWeight: 700, color: "#b3261e", margin: "0 0 8px" },
  detalhes: {
    marginTop: 24, paddingTop: 20, borderTop: "1px solid #e9e4d5",
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "left",
  },
  rotuloDado: { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8371" },
  valorDado: { fontSize: 14, fontWeight: 600, color: "#2b2b2b", marginTop: 2 },
};
