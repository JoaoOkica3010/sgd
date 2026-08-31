import { useState } from "react";
import { Link } from "react-router-dom";
import { Cabecalho } from "../../components/Cabecalho";
import { Rodape } from "../../components/Rodape";
import { AdminUtilizadores } from "./Utilizadores";
import { AdminServicos } from "./Servicos";
import { AdminConfiguracoes } from "./Configuracoes";

type Aba = "utilizadores" | "servicos" | "configuracoes";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "utilizadores", rotulo: "Utilizadores" },
  { id: "servicos", rotulo: "Serviços" },
  { id: "configuracoes", rotulo: "Configurações" },
];

export function GestaoSistema() {
  const [aba, setAba] = useState<Aba>("utilizadores");

  return (
    <div style={estilos.pagina}>
      <Cabecalho subtitulo="Gestão de Sistema" />

      <main style={estilos.conteudo}>
        <div style={estilos.cabecalhoLista}>
          <h1 style={estilos.titulo}>Gestão de Sistema</h1>
          <Link to="/dashboard" style={estilos.linkLista}>
            ← Dashboard
          </Link>
        </div>

        <div style={estilos.abas}>
          {ABAS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              style={{
                ...estilos.aba,
                ...(aba === item.id ? estilos.abaAtiva : {}),
              }}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        <div style={estilos.painel}>
          {aba === "utilizadores" && <AdminUtilizadores semNavbar />}
          {aba === "servicos" && <AdminServicos semNavbar />}
          {aba === "configuracoes" && <AdminConfiguracoes semNavbar />}
        </div>
      </main>
      <Rodape />
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
  cabecalhoLista: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 },
  titulo: { margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 28, color: "var(--cor-primaria)" },
  linkLista: { fontSize: 13, fontWeight: 600, color: "var(--cor-primaria)", textDecoration: "none" },
  abas: { display: "flex", gap: 4, borderBottom: "1px solid #e9e4d5", marginBottom: 24 },
  aba: {
    border: "none",
    background: "none",
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#6b6350",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
  },
  abaAtiva: { color: "var(--cor-primaria)", borderBottom: "2px solid var(--cor-primaria)" },
  painel: {},
};
