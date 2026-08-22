import { apiClient } from "./client";
import type { Documento, EstadoHistorico, PaginaDocumentos } from "../types";

export async function listarDocumentos(params: { q?: string; estado?: string; page?: number }) {
  const { data } = await apiClient.get<PaginaDocumentos>("/documentos", { params });
  return data;
}

export async function obterDocumento(id: string) {
  const { data } = await apiClient.get<Documento>(`/documentos/${id}`);
  return data;
}

export interface NovoDocumentoInput {
  remetente: string;
  assunto: string;
  tipo_documento: string;
  prioridade: "Normal" | "Urgente" | "Muito Urgente";
  observacoes?: string;
}

export async function criarDocumento(input: NovoDocumentoInput) {
  const { data } = await apiClient.post<Documento>("/documentos", input);
  return data;
}

export async function submeterDocumento(id: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/submeter`);
  return data;
}

export async function validarDocumento(id: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/validar`);
  return data;
}

export async function encaminharDocumento(id: string, servicoDestinoIds: number[], comentario?: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/encaminhar`, {
    servico_destino_ids: servicoDestinoIds,
    comentario,
  });
  return data;
}

export async function rejeitarDocumento(id: string, justificacao: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/rejeitar`, { justificacao });
  return data;
}

export async function arquivarDocumento(id: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/arquivar`);
  return data;
}

export async function iniciarAnaliseDocumento(id: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/iniciar-analise`);
  return data;
}

export async function validarServicoDocumento(id: string) {
  const { data } = await apiClient.post<Documento>(`/documentos/${id}/validar-servico`);
  return data;
}

export async function obterHistoricoDocumento(id: string) {
  const { data } = await apiClient.get<EstadoHistorico[]>(`/documentos/${id}/historico`);
  return data;
}