import { AccessManagementSection } from "../components/settings/AccessManagementSection";
import { TeamMembersSection } from "../components/settings/TeamMembersSection";

export function SettingsPage() {
  return (
    <section>
      <p className="text-sm font-semibold text-paz-primary">Administração</p> {/* Ajustado text */}

      <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text"> {/* Ajustado text */}
        Configurações
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paz-muted"> {/* Ajustado text */}
        Gerencie os acessos e permissões da equipe da igreja.
      </p>

      <AccessManagementSection />

      <TeamMembersSection />
    </section>
  );
}