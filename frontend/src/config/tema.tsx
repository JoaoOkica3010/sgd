import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface Tema {
  id: string;
  nome: string;
  /** Cor principal — barra de topo, títulos, botões primários, links. */
  primaria: string;
  /** Tom claro da cor principal — subtítulo na barra de topo escura. */
  primariaSuave: string;
}

// Três opções deliberadamente sóbrias/institucionais (nada berrante),
// para caber bem num sistema de gestão documental governamental.
export const TEMAS: Tema[] = [
  { id: "ameixa", nome: "Ameixa", primaria: "#6E2A66", primariaSuave: "#d9bcd4" },
  { id: "terracota", nome: "Terracota", primaria: "#C1502E", primariaSuave: "#eec3b3" },
  { id: "esmeralda", nome: "Esmeralda", primaria: "#128C5B", primariaSuave: "#b3ddc9" },
];

const CHAVE_ARMAZENAMENTO = "sgd_tema";

interface TemaContextValue {
  temaId: string;
  temas: Tema[];
  definirTema: (id: string) => void;
}

const TemaContext = createContext<TemaContextValue | undefined>(undefined);

function aplicarTema(tema: Tema) {
  const raiz = document.documentElement.style;
  raiz.setProperty("--cor-primaria", tema.primaria);
  raiz.setProperty("--cor-primaria-suave", tema.primariaSuave);
}

function temaInicial(): string {
  try {
    const guardado = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (guardado && TEMAS.some((t) => t.id === guardado)) return guardado;
  } catch {
    // localStorage indisponível (ex.: modo privado muito restritivo) — usa o padrão.
  }
  return TEMAS[0].id;
}

/**
 * Disponibiliza o tema de cor escolhido a toda a aplicação, aplicando-o
 * como variáveis CSS em :root (ver tokens.css). Envolver a aplicação uma
 * única vez em App.tsx.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [temaId, setTemaId] = useState<string>(temaInicial);

  useEffect(() => {
    const tema = TEMAS.find((t) => t.id === temaId) ?? TEMAS[0];
    aplicarTema(tema);
  }, [temaId]);

  function definirTema(id: string) {
    setTemaId(id);
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, id);
    } catch {
      // Preferência não persiste nesta sessão, mas continua a aplicar-se.
    }
  }

  return (
    <TemaContext.Provider value={{ temaId, temas: TEMAS, definirTema }}>{children}</TemaContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error("useTema deve ser usado dentro de <TemaProvider>");
  return contexto;
}
