import { useTema } from "./tema";

/**
 * Três quadrados de cor na barra de topo — clicar num deles muda a cor
 * principal de toda a aplicação (ver TemaProvider/tokens.css). Colocado
 * na barra de topo porque essa aparece a qualquer utilizador logo após o
 * login.
 *
 * Cada quadrado tem sempre um contorno duplo (branco + escuro), para se
 * manter visível mesmo quando a sua cor coincide com a da própria barra
 * de topo (ex.: o quadrado "Ameixa" quando o tema ativo já é Ameixa). O
 * tema selecionado mostra ainda uma marca de visto.
 */
export function SeletorTema() {
  const { temaId, temas, definirTema } = useTema();

  return (
    <div style={estilos.grupo} role="group" aria-label="Cor da aplicação">
      {temas.map((tema) => {
        const selecionado = temaId === tema.id;
        return (
          <button
            key={tema.id}
            type="button"
            onClick={() => definirTema(tema.id)}
            title={`Tema ${tema.nome}`}
            aria-label={`Tema ${tema.nome}`}
            aria-pressed={selecionado}
            style={{
              ...estilos.quadrado,
              backgroundColor: tema.primaria,
              boxShadow: selecionado
                ? "0 0 0 1.5px rgba(0,0,0,0.45), 0 0 0 3.5px #ffffff"
                : "0 0 0 1.5px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.85)",
            }}
          >
            {selecionado && <span style={estilos.visto}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  grupo: { display: "flex", alignItems: "center", gap: 8 },
  quadrado: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  visto: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    textShadow: "0 0 2px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.9)",
  },
};
