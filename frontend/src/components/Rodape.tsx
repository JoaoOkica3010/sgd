/**
 * Rodapé fixo na base da janela, em todas as páginas. O espaçador antes
 * dele evita que o rodapé tape o fim do conteúdo da página.
 */
export function Rodape() {
  return (
    <>
      <div className="rodape-espaco" aria-hidden="true" />
      <footer
        className="rodape-sgd"
        title="Okica & Bangura / Concebido e Implementado / email: joaookica@gmail.com"
      >
        @O&B - v1.0
      </footer>
    </>
  );
}
