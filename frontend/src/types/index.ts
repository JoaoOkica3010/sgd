export type Perfil =
  | "RECEP" | "SECR" | "MIN" | "CG" | "SG" | "AJ" | "AAP" | "AIM"
  | "GE" | "DGED" | "ITMA" | "DGVTT" | "IMP" | "ARQ";

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export type EstadoDocumento =
  | "recepcao" | "submetido" | "validado_secretariado" | "encaminhado"
  | "em_analise" | "validado_servico" | "arquivado" | "rejeitado";

export const ROTULOS_ESTADO: Record<EstadoDocumento, string> = {
  recepcao: "Receção",
  submetido: "Submetido",
  validado_secretariado: "Validado (Secretariado)",
  encaminhado: "Encaminhado",
  em_analise: "Em análise",
  validado_servico: "Validado (serviço)",
  arquivado: "Arquivado",
  rejeitado: "Rejeitado",
};

export interface Documento {
  id: string;
  numero_registo: string;
  remetente: string;
  assunto: string;
  tipo_documento: string;
  prioridade: "Normal" | "Urgente" | "Muito Urgente";
  estado_atual: EstadoDocumento;
  criado_em: string;
  observacoes?: string | null;
  servico_destino_id?: number | null;
  anexos?: Anexo[];
}

export interface Anexo {
  id: string;
  documento_id: string;
  nome_ficheiro: string;
  tamanho_bytes: number;
  tipo_mime: string;
  created_at: string;
}

export interface EstadoHistorico {
  id: number;
  estado: EstadoDocumento;
  justificacao: string | null;
  alterado_em: string;
  alterado_por: { id: string; nome: string };
}

export interface PaginaDocumentos {
  data: Documento[];
  current_page: number;
  last_page: number;
  total: number;
}