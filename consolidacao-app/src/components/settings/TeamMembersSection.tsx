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
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UsersRound size={22} />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
              Equipe
            </p>

            <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              Membros e permissões
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Gerencie os perfis e acessos dos Masters e Líderes da sua igreja.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadMembers(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800"
        >
          <strong>Não foi possível concluir a ação.</strong>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
          <strong>Ação concluída.</strong>
          <p className="mt-1">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 px-4 py-10 text-sm font-semibold text-slate-500">
          <LoaderCircle size={20} className="animate-spin text-brand-700" />
          Carregando membros da equipe...
        </div>
      ) : members.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <UserRound className="mx-auto text-slate-400" size={26} />

          <h4 className="mt-4 font-bold text-slate-800">
            Nenhum membro encontrado
          </h4>

          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
            Os usuários aprovados como Master ou Líder aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />

              <h4 className="font-bold text-slate-800">
                Acessos ativos ({activeMembers.length})
              </h4>
            </div>

            {activeMembers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
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
              <CircleOff size={18} className="text-amber-600" />

              <h4 className="font-bold text-slate-800">
                Acessos inativos ({inactiveMembers.length})
              </h4>
            </div>

            {inactiveMembers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {getInitials(member.full_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="font-bold text-slate-900">
                {member.full_name || "Nome não informado"}
              </h5>

              {isCurrentUser ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                  Você
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  member.role === "MASTER"
                    ? "bg-violet-50 text-violet-700"
                    : "bg-sky-50 text-sky-700"
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
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {member.email ? (
                <p className="flex items-center gap-2 break-all">
                  <Mail size={15} className="shrink-0 text-slate-400" />
                  {member.email}
                </p>
              ) : null}

              {member.phone ? (
                <p className="flex items-center gap-2">
                  <Phone size={15} className="shrink-0 text-slate-400" />
                  {member.phone}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {isCurrentUser ? (
          <p className="text-sm font-medium text-slate-400">
            Sua própria conta não pode ser alterada aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-36">
              <ShieldCheck
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-700"
              />

              <select
                aria-label={`Perfil de ${member.full_name || "usuário"}`}
                value={selectedRole}
                disabled={isProcessing}
                onChange={(event) =>
                  onRoleChange(member.id, event.target.value as UserRole)
                }
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-bold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="LEADER">Líder</option>
                <option value="MASTER">Master</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            {hasRoleChanged ? (
              <button
                type="button"
                onClick={() => void onSaveRole(member)}
                disabled={isProcessing}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
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
              className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
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