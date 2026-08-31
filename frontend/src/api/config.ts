import { apiClient } from "./client";

export interface ConfigInstituicao {
  sigla_instituicao: string;
  subtitulo: string;
  selo: string;
}

export async function obterConfig() {
  const { data } = await apiClient.get<ConfigInstituicao>("/config");
  return data;
}

export async function atualizarConfig(dados: Partial<ConfigInstituicao>) {
  const { data } = await apiClient.put<ConfigInstituicao>("/config", dados);
  return data;
}
