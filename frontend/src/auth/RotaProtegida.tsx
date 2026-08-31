import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Perfil } from "../types";

interface Props {
  /**
   * Se indicado, só utilizadores com um destes perfis podem aceder — usado
   * para restringir os ecrãs de administração (ex.: ["SADMIN"]).
   * Se omitido, qualquer utilizador autenticado pode aceder.
   */
  perfis?: Perfil[];
}

export function RotaProtegida({ perfis }: Props) {
  const { autenticado, utilizador } = useAuth();

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && (!utilizador || !perfis.includes(utilizador.perfil))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
