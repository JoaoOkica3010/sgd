import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RotaProtegida() {
  const { autenticado } = useAuth();

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
