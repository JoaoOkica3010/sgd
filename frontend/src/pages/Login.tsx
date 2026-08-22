import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setACarregar(true);
    try {
      await login(email, password);
      navegar("/documentos");
    } catch {
      setErro("Credenciais inválidas. Verifique o e-mail e a palavra-passe.");
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20 }}>Sistema de Gestão Documental</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Ministério dos Transportes, Telecomunicações e Economia Digital
      </p>
      <form onSubmit={submeter} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Palavra-passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        {erro && <p style={{ color: "crimson", fontSize: 14 }}>{erro}</p>}
        <button type="submit" disabled={aCarregar} style={{ padding: 10, marginTop: 8 }}>
          {aCarregar ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
