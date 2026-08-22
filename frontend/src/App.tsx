import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RotaProtegida } from "./auth/RotaProtegida";
import { Login } from "./pages/Login";
import { ListaDocumentos } from "./pages/ListaDocumentos";
import { NovoDocumento } from "./pages/NovoDocumento";
import { DetalheDocumento } from "./pages/DetalheDocumento";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RotaProtegida />}>
            <Route path="/documentos" element={<ListaDocumentos />} />
            <Route path="/documentos/novo" element={<NovoDocumento />} />
            <Route path="/documentos/:id" element={<DetalheDocumento />} />
          </Route>

          <Route path="*" element={<Navigate to="/documentos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}