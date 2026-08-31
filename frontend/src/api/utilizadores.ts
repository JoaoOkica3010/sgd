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
