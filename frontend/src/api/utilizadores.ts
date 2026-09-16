import { apiClient } from "./client";
import type { PaginaGenerica, UtilizadorAdmin } from "../types";

export async function listarUtilizadores(params?: { per_page?: number; page?: number }) {
  const { data } = await apiClient.get<PaginaGenerica<UtilizadorAdmin>>("/utilizadores", { params });
  return data;
}

export interface DadosNovoUtilizador {
  nome: string;
  email: string;
  password: string;
  perfil_id: number;
}

export async function criarUtilizador(dados: DadosNovoUtilizador) {
  const { data } = await apiClient.post<UtilizadorAdmin>("/utilizadores", dados);
  return data;
}

export interface DadosEditarUtilizador {
  nome?: string;
  email?: string;
  password?: string;
  perfil_id?: number;
  ativo?: boolean;
}

export async function atualizarUtilizador(id: string, dados: DadosEditarUtilizador) {
  const { data } = await apiClient.put<UtilizadorAdmin>(`/utilizadores/${id}`, dados);
  return data;
}

// Devolve o Blob da imagem já com o content-type correto do servidor —
// usar diretamente em URL.createObjectURL, sem reembrulhar em `new Blob`.
export async function obterAssinaturaImagemBlob(utilizadorId: string): Promise<Blob> {
  const resposta = await apiClient.get(`/utilizadores/${utilizadorId}/assinatura-imagem`, { responseType: "blob" });
  return resposta.data;
}

export async function carregarAssinaturaImagem(utilizadorId: string, imagem: File) {
  const formData = new FormData();
  formData.append("imagem", imagem);

  const { data } = await apiClient.post<UtilizadorAdmin>(`/utilizadores/${utilizadorId}/assinatura-imagem`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removerAssinaturaImagem(utilizadorId: string) {
  const { data } = await apiClient.delete<UtilizadorAdmin>(`/utilizadores/${utilizadorId}/assinatura-imagem`);
  return data;
}
