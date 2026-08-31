import { apiClient } from "./client";
import type { Anexo } from "../types";

export async function carregarAnexo(documentoId: string, ficheiro: File) {
  const formData = new FormData();
  formData.append("ficheiro", ficheiro);

  const { data } = await apiClient.post<Anexo>(`/documentos/${documentoId}/anexos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function urlDownloadAnexo(anexoId: string) {
  return `${apiClient.defaults.baseURL}/anexos/${anexoId}/download`;
}

export async function baixarAnexo(anexoId: string, nomeFicheiro: string) {
  const resposta = await apiClient.get(`/anexos/${anexoId}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFicheiro;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Igual a baixarAnexo, mas devolve o Blob em vez de disparar o download —
// usado para pré-visualizar o anexo num modal (PDF/imagem) sem abrir nova aba.
// Importante: devolve resposta.data diretamente (já é um Blob com o
// content-type correto do servidor) — não voltar a embrulhar em `new
// Blob([...])` sem `type`, isso perde o MIME type e o browser mostra o
// ficheiro como texto em bruto em vez de o pré-visualizar.
export async function obterAnexoBlob(anexoId: string): Promise<Blob> {
  const resposta = await apiClient.get(`/anexos/${anexoId}/download`, { responseType: "blob" });
  return resposta.data;
}

// Anexos Word/Excel/PowerPoint não têm visualizador nativo no browser —
// este endpoint converte-os para PDF no servidor (via LibreOffice) para
// poderem ser pré-visualizados no mesmo modal usado para PDFs.
export async function obterPreviewPdfAnexo(anexoId: string): Promise<Blob> {
  const resposta = await apiClient.get(`/anexos/${anexoId}/preview-pdf`, { responseType: "blob" });
  return resposta.data;
}

export async function removerAnexo(anexoId: string) {
  await apiClient.delete(`/anexos/${anexoId}`);
}

// Substitui o ficheiro de um anexo já existente (mesmo anexo, novo
// conteúdo) — fluxo de "descarregar, editar no Office, carregar de
// volta". Mantém o mesmo id e histórico de comentários/ver, só troca o
// ficheiro.
export async function atualizarAnexo(anexoId: string, ficheiro: File) {
  const formData = new FormData();
  formData.append("ficheiro", ficheiro);

  const { data } = await apiClient.post<Anexo>(`/anexos/${anexoId}/nova-versao`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}