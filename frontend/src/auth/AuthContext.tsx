import { createContext, useContext, useState, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { Utilizador } from "../types";

interface AuthContextValue {
  utilizador: Utilizador | null;
  autenticado: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function carregarUtilizadorGuardado(): Utilizador | null {
  const bruto = sessionStorage.getItem("sgd_utilizador");
  if (!bruto || bruto === "undefined") return null;
  try {
    return JSON.parse(bruto) as Utilizador;
  } catch {
    sessionStorage.removeItem("sgd_utilizador");
    sessionStorage.removeItem("sgd_token");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilizador, setUtilizador] = useState<Utilizador | null>(carregarUtilizadorGuardado);

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });

    // Nota: se a API devolver requer_2fa=true, o ecrã de login deve pedir
    // o código TOTP e reenviar com duplo_fator_validado=true.
    sessionStorage.setItem("sgd_token", data.token);
    sessionStorage.setItem("sgd_utilizador", JSON.stringify(data.utilizador));
    setUtilizador(data.utilizador);
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      sessionStorage.removeItem("sgd_token");
      sessionStorage.removeItem("sgd_utilizador");
      setUtilizador(null);
    }
  }

  return (
    <AuthContext.Provider value={{ utilizador, autenticado: !!utilizador, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return contexto;
}
