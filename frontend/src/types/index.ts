export type Perfil =
  | "SADMIN" | "ADMIN"
  | "RECEP" | "SECR" | "MIN" | "CG" | "SG" | "AJ" | "AAP" | "AIM"
  | "GE" | "DGED" | "ITMA" | "DGVTT" | "IMP" | "ARQ" | "CONSULTA";

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PerfilResumo {
  id: number;
  sigla: Perfil;
  nome_servico: string;
}

export interface UtilizadorAdmin {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfil_id: number;
  perfil?: PerfilResumo;
  tem_assinatura_imagem?: boolean;
}

export interface PaginaGenerica<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export type EstadoDocumento =
  | "recepcao" | "submetido" | "validado_secretariado" | "validado_chefe_gabinete"
  | "encaminhado" | "em_analise" | "validado_servico" | "arquivado" | "rejeitado";

export const ROTULOS_ESTADO: Record<EstadoDocumento, string> = {
  recepcao: "Receção",
  submetido: "Submetido",
  validado_secretariado: "Validado (Secretariado)",
  validado_chefe_gabinete: "Validado (Chefe de Gabinete)",
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
  numero_referencia?: string | null;
  assunto: string;
  tipo_documento: string;
  prioridade: "Normal" | "Urgente" | "Muito Urgente";
  estado_atual: EstadoDocumento;
  criado_em: string;
  observacoes?: string | null;
  servico_destino_id?: number | null;
  anexos?: Anexo[];
  assinatura?: {
    utilizador: { id: string; nome: string; tem_assinatura_imagem?: boolean } | null;
    assinado_em: string;
  } | null;
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