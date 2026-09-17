import { apiClient } from "./client";

export type ResultadoVerificacao = {
  encontrado: boolean;
  numero_registo?: string;
  tipo_documento?: string;
  assinado_por?: string;
  assinado_em?: string;
};

// Endpoint público (sem sessão) — usado na página de verificação de
// assinaturas acedida pelo código/QR impressos na Ficha.
export async function verificarCodigo(codigo: string): Promise<ResultadoVerificacao> {
  try {
    const { data } = await apiClient.get<ResultadoVerificacao>(`/verificar/${encodeURIComponent(codigo)}`);
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return { encontrado: false };
    throw e;
  }
}
