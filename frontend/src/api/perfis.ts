import { apiClient } from "./client";
import type { Perfil as PerfilSigla } from "../types";

export interface PerfilResumo {
  id: number;
  sigla: PerfilSigla;
  nome_servico: string;
}

export async function listarPerfis() {
  const { data } = await apiClient.get<PerfilResumo[]>("/perfis");
  return data;
}