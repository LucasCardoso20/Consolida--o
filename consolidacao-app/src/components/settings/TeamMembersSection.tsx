// src/components/settings/TeamMembersSection.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Crown,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useAccess } from "../../contexts/AccessContext";
import { supabase } from "../../lib/supabase";

type UserRole = "MASTER" | "LEADER";
type AccessStatus = "ACTIVE" | "INACTIVE";

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  access_status: AccessStatus;
  created_at: string;
};

type MemberCardProps = {
  member: TeamMember;
  currentUserId: string | null;
  selectedRole: UserRole;
  isProcessing: boolean;
  onRoleChange: (memberId: string, role: UserRole) => void;
  onSaveRole: (member: TeamMember) => Promise<void>;
  onToggleStatus: (member: TeamMember) => Promise<void>;
};

function getInitials(name: string | null) {
  if (!name?.trim()) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getRoleLabel(role: UserRole) {
  return role === "MASTER" ? "Master" : "Líder";
}

export function TeamMembersSection() {
  const { profile } = useAccess();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<
    Record<string, UserRole>
  >({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMaster =
    profile?.role === "MASTER" &&
    profile?.access_status === "ACTIVE" &&
    Boolean(profile.organization_id);

  const loadMembers = useCallback(
    async (showRefreshState = false) => {
      if (!isMaster || !profile?.organization_id) {
        setMembers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            phone,
            role,
            access_status,
            created_at
          `,
        )
        .eq("organization_id", profile.organization_id)
        .in("role", ["MASTER", "LEADER"])
        .in("access_status", ["ACTIVE", "INACTIVE"])
        .order("role", { ascending: true })
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar membros da equipe:", error);

        setMembers([]);
        setErrorMessage(
          "Não foi possível carregar os membros da equipe. Tente atualizar novamente.",
        );
      } else {
        const teamMembers = (data ?? []) as TeamMember[];

        setMembers(teamMembers);

        setSelectedRoles((currentRoles) => {
          const nextRoles: Record<string, UserRole> = {};

          for (const member of teamMembers) {
            nextRoles[member.id] = currentRoles[member.id] ?? member.role;
          }

          return nextRoles;
        });
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [isMaster, profile?.organization_id],
  );

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  function handleRoleChange(memberId: string, role: UserRole) {
    setSelectedRoles((currentRoles) => ({
      ...currentRoles,
      [memberId]: role,
    }));
  }

  async function updateMember(
    member: TeamMember,
    nextRole: UserRole,
    nextStatus: AccessStatus,
    successText: string,
  ) {
    setProcessingMemberId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.rpc(
      "update_organization_member_access",
      {
        p_profile_id: member.id,
        p_role: nextRole,
        p_access_status: nextStatus,
      },
    );

    if (error) {
      console.error("Erro ao atualizar membro:", error);

      setErrorMessage(
        error.message ||
          "Não foi possível atualizar o acesso deste usuário. Tente novamente.",
      );

      setProcessingMemberId(null);
      return;
    }

    setMembers((currentMembers) =>
      currentMembers.map((currentMember) =>
        currentMember.id === member.id
          ? {
              ...currentMember,
              role: nextRole,
              access_status: nextStatus,
            }
          : currentMember,
      ),
    );

    setSelectedRoles((currentRoles) => ({
      ...currentRoles,
      [member.id]: nextRole,
    }));

    setSuccessMessage(successText);
    setProcessingMemberId(null);
  }

  async function handleSaveRole(member: TeamMember) {
    const nextRole = selectedRoles[member.id] ?? member.role;

    if (nextRole === member.role) {
      setSuccessMessage(
        `${member.full_name || "Este usuário"} já possui o perfil selecionado.`,
      );
      return;
    }

    const roleLabel = getRoleLabel(nextRole);

    const confirmed = window.confirm(
      `Alterar o perfil de ${member.full_name || "este usuário"} para ${roleLabel}?\n\n${
        nextRole === "MASTER"
          ? "Essa pessoa poderá aprovar acessos e administrar a equipe."
          : "Essa pessoa continuará com acesso operacional, mas não poderá administrar usuários."
      }`,
    );

    if (!confirmed) {
      setSelectedRoles((currentRoles) => ({
        ...currentRoles,
        [member.id]: member.role,
      }));
      return;
    }

    await updateMember(
      member,
      nextRole,
      member.access_status,
      `${member.full_name || "Usuário"} agora possui o perfil ${roleLabel}.`,
    );
  }

  async function handleStatusChange(member: TeamMember) {
    const nextStatus: AccessStatus =
      member.access_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const isDeactivating = nextStatus === "INACTIVE";

    const confirmed = window.confirm(
      isDeactivating
        ? `Inativar o acesso de ${member.full_name || "este usuário"}?\n\nA pessoa não poderá acessar visitantes, células ou acompanhamentos enquanto estiver inativa.`
        : `Reativar o acesso de ${member.full_name || "este usuário"}?\n\nA pessoa poderá voltar a acessar o sistema imediatamente.`,
    );

    if (!confirmed) {
      return;
    }

    await updateMember(
      member,
      selectedRoles[member.id] ?? member.role,
      nextStatus,
      nextStatus === "ACTIVE"
        ? `${member.full_name || "Usuário"} foi reativado com sucesso.`
        : `${member.full_name || "Usuário"} foi inativado com sucesso.`,
    );
  }

  if (!isMaster) {
    return null;
  }

  const activeMembers = members.filter(
    (member) => member.access_status === "ACTIVE",
  );

  const inactiveMembers = members.filter(
    (member) => member.access_status === "INACTIVE",
  );

  return (
    <section className="mt-6 rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
            <UsersRound size={22} />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-paz-primary">
              Equipe
            </p>

            <h3 className="mt-1 text-xl font-bold tracking-tight text-paz-text">
              Membros e permissões
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-paz-muted">
              Gerencie os perfis e acessos dos Masters e Líderes da sua igreja.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadMembers(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-paz-border bg-white px-3 py-2 text-sm font-bold text-paz-muted transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={isRefreshing ? "animate-spin" : undefined}
          />
          Atualizar
        </button>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm leading-relaxed text-paz-error"
        >
          <strong>Não foi possível concluir a ação.</strong>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-xl border border-paz-success bg-paz-success/10 p-4 text-sm leading-relaxed text-paz-success">
          <strong>Ação concluída.</strong>
          <p className="mt-1">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-paz-soft px-4 py-10 text-sm font-semibold text-paz-muted text-center"> {/* Adicionado text-center */}
          <LoaderCircle size={20} className="animate-spin text-paz-primary" />
          Carregando membros da equipe...
        </div>
      ) : members.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-paz-border bg-paz-soft px-5 py-10 text-center">
          <UserRound className="mx-auto text-paz-muted" size={26} />

          <h4 className="mt-4 font-bold text-paz-text">
            Nenhum membro encontrado
          </h4>

          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-paz-muted">
            Os usuários aprovados como Master ou Líder aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-paz-success" />

              <h4 className="font-bold text-paz-text">
                Acessos ativos ({activeMembers.length})
              </h4>
            </div>

            {activeMembers.length === 0 ? (
              <p className="rounded-xl bg-paz-soft px-4 py-3 text-sm text-paz-muted">
                Nenhum membro ativo no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {activeMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserId={profile?.id ?? null}
                    selectedRole={selectedRoles[member.id] ?? member.role}
                    isProcessing={processingMemberId === member.id}
                    onRoleChange={handleRoleChange}
                    onSaveRole={handleSaveRole}
                    onToggleStatus={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <CircleOff size={18} className="text-paz-warning" />

              <h4 className="font-bold text-paz-text">
                Acessos inativos ({inactiveMembers.length})
              </h4>
            </div>

            {inactiveMembers.length === 0 ? (
              <p className="rounded-xl bg-paz-soft px-4 py-3 text-sm text-paz-muted">
                Nenhum membro inativo no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {inactiveMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentUserId={profile?.id ?? null}
                    selectedRole={selectedRoles[member.id] ?? member.role}
                    isProcessing={processingMemberId === member.id}
                    onRoleChange={handleRoleChange}
                    onSaveRole={handleSaveRole}
                    onToggleStatus={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MemberCard({
  member,
  currentUserId,
  selectedRole,
  isProcessing,
  onRoleChange,
  onSaveRole,
  onToggleStatus,
}: MemberCardProps) {
  const isCurrentUser = member.id === currentUserId;
  const isActive = member.access_status === "ACTIVE";
  const hasRoleChanged = selectedRole !== member.role;

  return (
    <article className="rounded-xl border border-paz-border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"> {/* Ajustado gap para mobile */}
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
              isActive
                ? "bg-paz-soft text-paz-primary"
                : "bg-paz-soft text-paz-muted"
            }`}
          >
            {getInitials(member.full_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="font-bold text-paz-text">
                {member.full_name || "Nome não informado"}
              </h5>

              {isCurrentUser ? (
                <span className="rounded-full bg-paz-soft px-2 py-0.5 text-xs font-bold text-paz-primary">
                  Você
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  member.role === "MASTER"
                    ? "bg-paz-soft text-paz-primary"
                    : "bg-paz-soft text-paz-primary"
                }`}
              >
                {member.role === "MASTER" ? (
                  <Crown size={13} />
                ) : (
                  <ShieldCheck size={13} />
                )}
                {getRoleLabel(member.role)}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  isActive
                    ? "bg-paz-success/10 text-paz-success"
                    : "bg-paz-warning/10 text-paz-warning"
                }`}
              >
                {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm text-paz-muted">
              {member.email ? (
                <p className="flex items-center gap-2 break-all">
                  <Mail size={15} className="shrink-0 text-paz-muted" />
                  {member.email}
                </p>
              ) : null}

              {member.phone ? (
                <p className="flex items-center gap-2">
                  <Phone size={15} className="shrink-0 text-paz-muted" />
                  {member.phone}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {isCurrentUser ? (
          <p className="text-sm font-medium text-paz-muted">
            Sua própria conta não pode ser alterada aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto"> {/* Adicionado w-full e sm:w-auto */}
            <div className="relative min-w-36 flex-1"> {/* Adicionado flex-1 */}
              <ShieldCheck
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paz-primary"
              />

              <select
                aria-label={`Perfil de ${member.full_name || "usuário"}`}
                value={selectedRole}
                disabled={isProcessing}
                onChange={(event) =>
                  onRoleChange(member.id, event.target.value as UserRole)
                }
                className="w-full appearance-none rounded-xl border border-paz-border bg-white py-2.5 pl-9 pr-9 text-sm font-bold text-paz-text outline-none transition focus:border-paz-primary focus:ring-4 focus:ring-paz-soft disabled:cursor-not-allowed disabled:bg-paz-soft"
              >
                <option value="LEADER">Líder</option>
                <option value="MASTER">Master</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paz-muted"
              />
            </div >

            {hasRoleChanged ? (
              <button
                type="button"
                onClick={() => void onSaveRole(member)}
                disabled={isProcessing}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60 flex-1"
              >
                {isProcessing ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Salvar perfil
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void onToggleStatus(member)}
              disabled={isProcessing}
              className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 flex-1 ${ /* Adicionado flex-1 */
                isActive
                  ? "border border-paz-error bg-white text-paz-error hover:bg-paz-soft"
                  : "bg-paz-success text-white hover:bg-paz-primary"
              }`}
            >
              {isProcessing ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Salvando...
                </>
              ) : isActive ? (
                <>
                  <CircleOff size={18} />
                  Inativar
                </>
              ) : (
                <>
                  <Check size={18} />
                  Reativar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}