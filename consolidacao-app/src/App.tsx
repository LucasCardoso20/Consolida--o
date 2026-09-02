import { Navigate, Route, Routes } from "react-router-dom";

import { AccessGuard } from "./components/AccessGuard";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { CellsPage } from "./pages/CellsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NewVisitorPage } from "./pages/NewVisitorPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VisitorDetailsPage } from "./pages/VisitorDetailsPage";
import { VisitorsPage } from "./pages/VisitorsPage";

export default function App() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Exige uma sessão autenticada */}
      <Route element={<ProtectedRoute />}>
        {/* Exige perfil ACTIVE, organization_id e role MASTER/LEADER */}
        <Route element={<AccessGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/visitantes" element={<VisitorsPage />} />

            <Route path="/visitantes/novo" element={<NewVisitorPage />} />

            <Route
              path="/visitantes/:visitorId"
              element={<VisitorDetailsPage />}
            />

            <Route path="/celulas" element={<CellsPage />} />

            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Qualquer URL desconhecida volta para a rota inicial */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}