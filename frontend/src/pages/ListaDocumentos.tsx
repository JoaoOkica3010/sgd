import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarDocumentos } from "../api/documentos";
import { ROTULOS_ESTADO, type Documento } from "../types";
import { useAuth } from "../auth/AuthContext";

export function ListaDocumentos() {
  const { utilizador, logout } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [termo, setTermo] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar(q?: string) {
    setACarregar(true);
    setErro(null);
    try {
      const pagina = await listarDocumentos({ q });
      setDocumentos(pagina.data);
    } catch {
      setErro("Não foi possível carregar os documentos.");
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Documentos</h1>
          <p style={{ color: "#666", fontSize: 13, margin: 0 }}>
            {utilizador?.nome} · Perfil: {utilizador?.perfil}
          </p>
        </div>
        <button onClick={() => logout()}>Terminar sessão</button>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); carregar(termo); }}
        style={{ display: "flex", gap: 8, margin: "20px 0" }}
      >
        <input
          placeholder="Pesquisar por número, remetente ou assunto..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Pesquisar</button>
        <Link to="/documentos/novo">
          <button type="button">+ Novo registo</button>
        </Link>
      </form>

      {aCarregar && <p>A carregar...</p>}
      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      {!aCarregar && !erro && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 8 }}>Nº registo</th>
              <th style={{ padding: 8 }}>Remetente</th>
              <th style={{ padding: 8 }}>Assunto</th>
              <th style={{ padding: 8 }}>Estado</th>
              <th style={{ padding: 8 }}>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  <Link to={`/documentos/${doc.id}`}>{doc.numero_registo}</Link>
                </td>
                <td style={{ padding: 8 }}>{doc.remetente}</td>
                <td style={{ padding: 8 }}>{doc.assunto}</td>
                <td style={{ padding: 8 }}>{ROTULOS_ESTADO[doc.estado_atual]}</td>
                <td style={{ padding: 8 }}>{doc.prioridade}</td>
              </tr>
            ))}
            {documentos.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#666" }}>
                Nenhum documento encontrado.
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
