import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export interface Marca {
  siglaInstituicao: string;
  subtitulo: string;
  selo: string;
  /** "SGD · MTTED", ou apenas "SGD" se a instituição não tiver sigla definida. */
  titulo: string;
  /**
   * Endereço pelo qual o SGD é alcançável de fora (SGD_URL_PUBLICA no
   * backend, ex.: o IP Tailscale da srv-sgd), sem barra final. Vazio se
   * não configurado — nesse caso usa-se window.location.origin (ver
   * FichaDocumento.tsx), que só funciona bem se toda a gente aceder
   * sempre pelo mesmo endereço.
   */
  urlPublica: string;
}

// Valores usados enquanto o pedido a /config está em curso, ou se falhar
// (nunca deixa o cabeçalho em branco).
const PADRAO: Marca = {
  siglaInstituicao: "",
  subtitulo: "Gestão Documental",
  selo: "S",
  titulo: "SGD",
  urlPublica: "",
};

function construirTitulo(sigla: string): string {
  return sigla ? `SGD · ${sigla}` : "SGD";
}

let cache: Marca | null = null;
let pedidoEmCurso: Promise<Marca> | null = null;

async function obterMarca(): Promise<Marca> {
  if (cache) return cache;
  if (!pedidoEmCurso) {
    pedidoEmCurso = apiClient
      .get<{ sigla_instituicao: string; subtitulo: string; selo: string; url_publica?: string }>("/config")
      .then((resposta) => {
        const marca: Marca = {
          siglaInstituicao: resposta.data.sigla_instituicao,
          subtitulo: resposta.data.subtitulo,
          selo: resposta.data.selo,
          titulo: construirTitulo(resposta.data.sigla_instituicao),
          urlPublica: resposta.data.url_publica ?? "",
        };
        cache = marca;
        return marca;
      })
      .catch(() => PADRAO);
  }
  return pedidoEmCurso;
}

/**
 * Limpa a cache em memória, para que a próxima página a chamar useMarca()
 * volte a pedir /config — usado depois de o SADMIN gravar alterações no
 * ecrã de Configurações, para o resto da aplicação refletir o novo valor
 * sem precisar de recarregar a página.
 */
export function invalidarMarcaCache() {
  cache = null;
  pedidoEmCurso = null;
}

/**
 * Identidade visual desta instalação (nome/sigla do ministério, selo),
 * vinda de GET /config (ver backend config/sgd.php). Substitui o texto
 * "SGD · MTTED" que estava fixo em cada página — ajustar o .env do
 * backend é suficiente para reutilizar a aplicação noutro ministério.
 */
export function useMarca(): Marca {
  const [marca, setMarca] = useState<Marca>(cache ?? PADRAO);

  useEffect(() => {
    let ativo = true;
    obterMarca().then((m) => {
      if (ativo) setMarca(m);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return marca;
}
