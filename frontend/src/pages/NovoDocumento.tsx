import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { criarDocumento } from "../api/documentos";

export function NovoDocumento() {
  const navegar = useNavigate();
  const [remetente, setRemetente] = useState("");
  const [assunto, setAssunto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("Oficio");
  const [prioridade, setPrioridade] = useState<"Normal" | "Urgente" | "Muito Urgente">("Normal");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAGuardar(true);
    try {
      const doc = await criarDocumento({ remetente, assunto, tipo_documento: tipoDocumento, prioridade });
      navegar(`/documentos/${doc.id}`);
    } catch {
      setErro("Não foi possível criar o registo. Verifique os dados introduzidos.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20 }}>Novo registo de documento</h1>
      <form onSubmit={submeter} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Remetente
          <input value={remetente} onChange={(e) => setRemetente(e.target.value)} required style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Assunto
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} required style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Tipo de documento
          <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="Oficio">Ofício</option>
            <option value="Carta">Carta</option>
            <option value="Memo">Memo</option>
            <option value="Nota">Nota</option>
            <option value="Outro">Outro</option>
          </select>
        </label>
        <label>
          Prioridade
          <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as typeof prioridade)} style={{ width: "100%", padding: 8 }}>
            <option value="Normal">Normal</option>
            <option value="Urgente">Urgente</option>
            <option value="Muito Urgente">Muito Urgente</option>
          </select>
        </label>
        {erro && <p style={{ color: "crimson" }}>{erro}</p>}
        <button type="submit" disabled={aGuardar}>{aGuardar ? "A gravar..." : "Gravar"}</button>
      </form>
      <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>
        Após gravar, poderá anexar ficheiros e submeter o registo para validação do Secretariado.
      </p>
    </div>
  );
}
