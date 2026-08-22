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

export async function removerAnexo(anexoId: string) {
  await apiClient.delete(`/anexos/${anexoId}`);
}