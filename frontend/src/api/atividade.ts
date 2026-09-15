import { apiClient } from "./client";

export type AtividadeItem = {
  id: number;
  utilizador: string;
  descricao: string;
  documento: { id: string; numero_registo: string } | null;
  ocorrido_em: string;
};

export async function listarAtividadeRecente(limite = 15): Promise<AtividadeItem[]> {
  const { data } = await apiClient.get<AtividadeItem[]>("/atividade/recente", { params: { limite } });
  return data;
}
