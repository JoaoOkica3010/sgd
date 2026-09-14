import { apiClient } from "./client";

export type TipoRelatorioId =
  | "documentos-por-estado"
  | "documentos-por-servico"
  | "fora-de-prazo"
  | "atividade-por-utilizador"
  | "volume-mensal"
  | "auditoria-acessos";

const NOME_FICHEIRO_PADRAO: Record<TipoRelatorioId, string> = {
  "documentos-por-estado": "documentos-por-estado.csv",
  "documentos-por-servico": "documentos-por-servico.csv",
  "fora-de-prazo": "fora-de-prazo.csv",
  "atividade-por-utilizador": "atividade-por-utilizador.csv",
  "volume-mensal": "volume-mensal.csv",
  "auditoria-acessos": "auditoria-acessos.csv",
};

function nomeFicheiroDoCabecalho(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition !== "string") return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

/**
 * Gera o relatório indicado e devolve-o já pronto a descarregar
 * (o backend responde com um CSV em anexo — ver RelatorioController).
 */
export async function gerarRelatorio(tipo: TipoRelatorioId): Promise<void> {
  const resposta = await apiClient.get(`/relatorios/${tipo}`, { responseType: "blob" });

  const nomeFicheiro = nomeFicheiroDoCabecalho(
    resposta.headers["content-disposition"],
    NOME_FICHEIRO_PADRAO[tipo]
  );

  const url = URL.createObjectURL(resposta.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFicheiro;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
