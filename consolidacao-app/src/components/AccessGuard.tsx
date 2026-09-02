import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAccess } from "../contexts/AccessContext";
import { hasActiveOperationalAccess } from "../types/access";
import { PendingApprovalPage } from "../pages/PendingApprovalPage";

export function AccessGuard() {
  const { user, profile, isLoading } = useAccess();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <LoaderCircle size={20} className="animate-spin text-brand-700" />
          Verificando seu acesso...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!hasActiveOperationalAccess(profile)) {
    return <PendingApprovalPage />;
  }

  return <Outlet />;
}