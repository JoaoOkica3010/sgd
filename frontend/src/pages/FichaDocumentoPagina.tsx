import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { obterDocumento, obterHistoricoDocumento } from "../api/documentos";
import { listarObservacoes, type ObservacaoApi } from "../api/observacoes";
import { ROTULOS_ESTADO, type Documento, type EstadoHistorico } from "../types";
import { FichaDocumento, type Observacao } from "../components/FichaDocumento";

// Página dedicada e autónoma (rota própria), pensada para impressão / export
// a PDF através do diálogo de impressão do browser (Ctrl+P -> "Guardar como PDF").
// Reaproveita o componente FichaDocumento também usado como separador dentro
// de DetalheDocumento.tsx — mantém os dois pontos de uso sempre visualmente
// consistentes. O botão "Imprimir" vive dentro do próprio FichaDocumento; esta
// página apenas lhe passa window.print() diretamente, e dispara a impressão
// automaticamente quando chega com ?imprimir=1 (usado quando o botão é
// carregado a partir do separador dentro da app, que abre esta página numa
// nova janela).
export function FichaDocumentoPagina() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [documento, setDocumento] = useState<Documento | null>(null);
  const [historico, setHistorico] = useState<EstadoHistorico[]>([]);
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setACarregar(true);
      setErro(null);
      try {
        const [doc, hist, obs] = await Promise.all([
          obterDocumento(id),
          obterHistoricoDocumento(id),
          listarObservacoes(id),
        ]);
        setDocumento(doc);
        setHistorico(hist);
        setObservacoes(obs.map(apiParaObservacao));
      } catch {
        setErro("Não foi possível carregar a ficha do documento.");
      } finally {
        setACarregar(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!aCarregar && documento && searchParams.get("imprimir") === "1") {
      // Pequeno atraso para garantir que o layout já pintou antes do print.
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [aCarregar, documento, searchParams]);

  if (aCarregar) return <p style={{ padding: 24 }}>A carregar...</p>;
  if (erro || !documento) return <p style={{ padding: 24, color: "#b3261e" }}>{erro ?? "Documento não encontrado."}</p>;

  return (
    <div>
      <div className="no-print" style={estilosBarra.barra}>
        <Link to={`/documentos/${id}`} style={estilosBarra.link}>
          ← Voltar ao documento
        </Link>
      </div>

      <FichaDocumento
        documento={documento}
        historico={historico}
        observacoes={observacoes}
        aoImprimir={() => window.print()}
      />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; margin: 0 !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </div>
  );
}

function apiParaObservacao(o: ObservacaoApi): Observacao {
  return {
    id: o.id,
    autor: o.autor_nome,
    perfil: o.autor_perfil,
    texto: o.texto,
    estadoCriacao: o.estado_criacao,
    estadoLabel: ROTULOS_ESTADO[o.estado_criacao] ?? o.estado_criacao,
    criadoEm: o.criado_em,
  };
}

const estilosBarra = {
  barra: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "16px 24px 0",
  },
  link: {
    fontSize: 13,
    color: "#8a8371",
    textDecoration: "none",
  },
} as const;
