import { apiClient } from "./client";
import type { PaginaGenerica, Servico } from "../types";

/** GET /servicos — apenas serviços ativos (usado no ecrã de encaminhamento). */
export async function listarServicosAtivos() {
  const { data } = await apiClient.get<Servico[]>("/servicos");
  return data;
}

/** GET /servicos/todos — ativos e inativos (ecrã de gestão do SADMIN). */
export async function listarServicosAdmin(params?: { ativo?: boolean; per_page?: number; page?: number }) {
  const { data } = await apiClient.get<PaginaGenerica<Servico>>("/servicos/todos", { params });
  return data;
}

export interface DadosNovoServico {
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

export async function criarServico(dados: DadosNovoServico) {
  const { data } = await apiClient.post<Servico>("/servicos", dados);
  return data;
}

export interface DadosEditarServico {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}

export async function atualizarServico(id: number, dados: DadosEditarServico) {
  const { data } = await apiClient.put<Servico>(`/servicos/${id}`, dados);
  return data;
}
