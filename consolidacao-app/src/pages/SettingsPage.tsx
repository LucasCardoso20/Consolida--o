import { Settings } from "lucide-react";

import { AccessManagementSection } from "../components/settings/AccessManagementSection";
import { TeamMembersSection } from "../components/settings/TeamMembersSection";

export function SettingsPage() {
  return (
    <section>
      <p className="text-sm font-semibold text-brand-700">Administração</p>

      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        Configurações
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Gerencie os acessos e permissões da equipe da igreja.
      </p>

      <AccessManagementSection />

      <TeamMembersSection />

      <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
        <Settings className="mx-auto text-slate-300" size={38} />

        <p className="mt-4 font-bold text-slate-700">
          Mais configurações em breve
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Esta área terá os dados da igreja e outras preferências da equipe.
        </p>
      </div>
    </section>
  );
}