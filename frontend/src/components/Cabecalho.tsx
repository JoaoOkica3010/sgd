import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMarca } from "../config/marca";
import { SeletorTema } from "../config/SeletorTema";

interface CabecalhoProps {
  /** Texto sob o título (ex.: "Administração · Serviços"). Por omissão usa marca.subtitulo (ex.: "Gestão Documental"). */
  subtitulo?: string;
  /** Conteúdo extra entre o crachá de perfil e o botão de sessão (ex.: link "Administração"). */
  extra?: ReactNode;
}

/**
 * Barra de topo única, usada por todas as páginas pós-login. Antes desta
 * componente, cada página tinha a sua própria cópia quase idêntica deste
 * markup — qualquer alteração (ex.: o seletor de tema) tinha de ser
 * replicada manualmente em 8+ ficheiros.
 */
export function Cabecalho({ subtitulo, extra }: CabecalhoProps) {
  const { utilizador, logout } = useAuth();
  const marca = useMarca();

  return (
    <header className="navbar-sgd">
      <div className="navbar-marca">
        <div className="navbar-selo">{marca.selo}</div>
        <div>
          <div className="navbar-titulo">{marca.titulo}</div>
          <div className="navbar-subtitulo">{subtitulo ?? marca.subtitulo}</div>
        </div>
      </div>
      <div className="navbar-utilizador">
        <SeletorTema />
        <span>{utilizador?.nome}</span>
        {utilizador?.perfil && <span className="navbar-perfil-badge">{utilizador.perfil}</span>}
        {extra}
        <button onClick={() => logout()} className="botao-sessao">
          Terminar sessão
        </button>
      </div>
    </header>
  );
}
