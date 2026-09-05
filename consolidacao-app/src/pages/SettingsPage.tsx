// src/pages/SettingsPage.tsx
import { AccessManagementSection } from "../components/settings/AccessManagementSection";
import { TeamMembersSection } from "../components/settings/TeamMembersSection";

export function SettingsPage() {
  return (
    <section>
      <p className="text-sm font-semibold text-paz-primary">Administração</p>

      <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text">
        Configurações
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paz-muted">
        Gerencie os acessos e permissões da equipe da igreja.
      </p>

      {/* Adicionado um espaçamento entre as seções */}
      <div className="mt-8 space-y-8">
        <AccessManagementSection />
        <TeamMembersSection />
      </div>
    </section>
  );
}