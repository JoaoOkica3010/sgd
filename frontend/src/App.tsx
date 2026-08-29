import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RotaProtegida } from "./auth/RotaProtegida";
import { Login } from "./pages/Login";
import { RecuperarAcesso } from "./pages/RecuperarAcesso";
import { Dashboard } from "./pages/Dashboard";
import { ListaDocumentos } from "./pages/ListaDocumentos";
import { NovoDocumento } from "./pages/NovoDocumento";
import { DetalheDocumento } from "./pages/DetalheDocumento";
import { FichaDocumentoPagina } from "./pages/FichaDocumentoPagina";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-acesso" element={<RecuperarAcesso />} />

          <Route element={<RotaProtegida />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documentos" element={<ListaDocumentos />} />
            <Route path="/documentos/novo" element={<NovoDocumento />} />
            <Route path="/documentos/:id" element={<DetalheDocumento />} />
   	<Route path="/documentos/:id/ficha" element={<FichaDocumentoPagina />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
