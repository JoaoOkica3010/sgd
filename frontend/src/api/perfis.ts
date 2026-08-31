import { apiClient } from "./client";
import type { PerfilResumo } from "../types";

export type { PerfilResumo };

export async function listarPerfis() {
  const { data } = await apiClient.get<PerfilResumo[]>("/perfis");
  return data;
}