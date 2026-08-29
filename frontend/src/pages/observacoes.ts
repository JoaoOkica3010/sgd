import { apiClient } from "./client";

export type ObservacaoApi = {
  id: number;
  autor_nome: string;
  autor_perfil: string;
  texto: string;
  estado_criacao: string;
  criado_em: string;
};

export async function listarObservacoes(documentoId: string): Promise<ObservacaoApi[]> {
  const resposta = await apiClient.get(`/documentos/${documentoId}/observacoes`);
  return resposta.data;
}

export async function criarObservacao(documentoId: string, texto: string): Promise<ObservacaoApi> {
  const resposta = await apiClient.post(`/documentos/${documentoId}/observacoes`, { texto });
  return resposta.data;
}

export async function editarObservacao(
  documentoId: string,
  observacaoId: number,
  texto: string
): Promise<ObservacaoApi> {
  const resposta = await apiClient.put(`/documentos/${documentoId}/observacoes/${observacaoId}`, { texto });
  return resposta.data;
}

export async function eliminarObservacaoApi(documentoId: string, observacaoId: number): Promise<void> {
  await apiClient.delete(`/documentos/${documentoId}/observacoes/${observacaoId}`);
}
