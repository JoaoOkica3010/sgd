import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { TemaProvider } from "./config/tema";
import { RotaProtegida } from "./auth/RotaProtegida";
import { Login } from "./pages/Login";
import { RecuperarAcesso } from "./pages/RecuperarAcesso";
import { Dashboard } from "./pages/Dashboard";
import { ListaDocumentos } from "./pages/ListaDocumentos";
import { NovoDocumento } from "./pages/NovoDocumento";
import { DetalheDocumento } from "./pages/DetalheDocumento";
import { FichaDocumentoPagina } from "./pages/FichaDocumentoPagina";
import { AdminServicos } from "./pages/admin/Servicos";
import { AdminUtilizadores } from "./pages/admin/Utilizadores";
import { AdminConfiguracoes } from "./pages/admin/Configuracoes";
import { GestaoSistema } from "./pages/admin/GestaoSistema";

export default function App() {
  return (
    <TemaProvider>
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

            <Route element={<RotaProtegida perfis={["SADMIN"]} />}>
              <Route path="/admin" element={<GestaoSistema />} />
              <Route path="/admin/servicos" element={<AdminServicos />} />
              <Route path="/admin/utilizadores" element={<AdminUtilizadores />} />
              <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TemaProvider>
  );
}
