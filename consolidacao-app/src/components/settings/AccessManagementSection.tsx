// src/components/settings/AccessManagementSection.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleX,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";

import { useAccess } from "../../contexts/AccessContext";
import { supabase } from "../../lib/supabase";

type AccessRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

type AccessRequest = {
  id: string;
  requester_id: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
  organization_id: string;
  status: AccessRequestStatus;
  created_at: string;
};

type UserRole = "MASTER" | "LEADER";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

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

export function AccessManagementSection() {
  const { profile } = useAccess();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedRoles, setSelectedRoles] = useState<
    Record<string, UserRole>
  >({});

  const [processingRequestId, setProcessingRequestId] = useState<
    string | null
  >(null);

  const isMaster =
    profile?.role === "MASTER" &&
    profile?.access_status === "ACTIVE" &&
    Boolean(profile.organization_id);

  const loadRequests = useCallback(
    async (showRefreshState = false) => {
      if (!isMaster) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const { data, error } = await supabase
        .from("access_requests")
        .select(
          `
            id,
            requester_id,
            requester_name,
            requester_email,
            requester_phone,
            organization_id,
            status,
            created_at
          `,
        )
        .eq("organization_id", profile.organization_id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar solicitações de acesso:", error);
        setErrorMessage(
          "Não foi possível carregar as solicitações de acesso.",
        );
        setRequests([]);
      } else {
        const pendingRequests = (data ?? []) as AccessRequest[];

        setRequests(pendingRequests);

        setSelectedRoles((currentRoles) => {
          const nextRoles: Record<string, UserRole> = {};

          for (const request of pendingRequests) {
            nextRoles[request.id] = currentRoles[request.id] ?? "LEADER";
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
    void loadRequests();
  }, [loadRequests]);

  async function handleApprove(requestId: string) {
    const selectedRole = selectedRoles[requestId] ?? "LEADER";

    const roleLabel = selectedRole === "MASTER" ? "Master" : "Líder";

    const confirmed = window.confirm(
      `Confirmar aprovação como ${roleLabel}?\n\nA pessoa terá acesso ativo ao sistema.`,
    );

    if (!confirmed) {
      return;
    }

    setProcessingRequestId(requestId);
    setErrorMessage(null);

    const { error } = await supabase.rpc("approve_access_request", {
      p_request_id: requestId,
      p_role: selectedRole,
    });

    if (error) {
      console.error("Erro ao aprovar solicitação:", error);
      setErrorMessage(
        error.message ||
          "Não foi possível aprovar a solicitação. Atualize a página e tente novamente.",
      );
      setProcessingRequestId(null);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );

    setProcessingRequestId(null);
  }

  async function handleReject(requestId: string) {
    const confirmed = window.confirm(
      "Recusar esta solicitação?\n\nA pessoa continuará sem acesso ao sistema.",
    );

    if (!confirmed) {
      return;
    }

    setProcessingRequestId(requestId);
    setErrorMessage(null);

    const { error } = await supabase.rpc("reject_access_request", {
      p_request_id: requestId,
      p_review_note: null,
    });

    if (error) {
      console.error("Erro ao recusar solicitação:", error);
      setErrorMessage(
        error.message ||
          "Não foi possível recusar a solicitação. Atualize a página e tente novamente.",
      );
      setProcessingRequestId(null);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );

    setProcessingRequestId(null);
  }

  if (!isMaster) {
    return null;
  }

  return (
    <section className="rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
            <UsersRound size={22} />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-paz-primary">
              Administração
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-paz-text">
              Solicitações de acesso
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-paz-muted">
              Analise novos cadastros e defina quem poderá acessar a
              organização.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadRequests(true)}
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
          <strong>Ocorreu um problema.</strong>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-paz-soft px-4 py-10 text-sm font-semibold text-paz-muted text-center"> {/* Adicionado text-center */}
          <LoaderCircle size={20} className="animate-spin text-paz-primary" />
          Carregando solicitações...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-paz-border bg-paz-soft px-5 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-white text-paz-muted shadow-sm">
            <UserCheck size={23} />
          </div>

          <h3 className="mt-4 font-bold text-paz-text">
            Nenhuma solicitação pendente
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-paz-muted">
            Quando alguém criar uma conta e selecionar esta igreja, a
            solicitação aparecerá aqui para aprovação.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-paz-muted">
              {requests.length === 1
                ? "1 solicitação aguardando análise"
                : `${requests.length} solicitações aguardando análise`}
            </p>
          </div>

          {requests.map((request) => {
            const selectedRole = selectedRoles[request.id] ?? "LEADER";
            const isProcessing = processingRequestId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-xl border border-paz-border bg-white p-4 transition sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"> {/* Ajustado gap para mobile */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paz-soft text-sm font-extrabold text-paz-primary">
                      {getInitials(request.requester_name)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-paz-text">
                        {request.requester_name || "Nome não informado"}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-paz-muted">
                        {request.requester_email ? (
                          <p className="flex items-center gap-2 break-all">
                            <Mail
                              size={15}
                              className="shrink-0 text-paz-muted"
                            />
                            {request.requester_email}
                          </p>
                        ) : null}

                        {request.requester_phone ? (
                          <p className="flex items-center gap-2">
                            <Phone
                              size={15}
                              className="shrink-0 text-paz-muted"
                            />
                            {request.requester_phone}
                          </p>
                        ) : null}
                      </div>

                      <p className="mt-3 text-xs font-medium text-paz-muted">
                        Solicitação enviada em {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:w-auto w-full"> {/* Adicionado w-full para mobile */}
                    <div className="relative min-w-40 flex-1"> {/* Adicionado flex-1 */}
                      <ShieldCheck
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paz-primary"
                      />

                      <select
                        aria-label={`Perfil para ${request.requester_name ?? "usuário"}`}
                        value={selectedRole}
                        disabled={isProcessing}
                        onChange={(event) =>
                          setSelectedRoles((currentRoles) => ({
                            ...currentRoles,
                            [request.id]: event.target.value as UserRole,
                          }))
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
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleApprove(request.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60 flex-1"
                    >
                      {isProcessing ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <Check size={18} />
                      )}
                      Aprovar
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReject(request.id)}
                      disabled={isProcessing}
                      title="Recusar solicitação"
                      aria-label={`Recusar solicitação de ${
                        request.requester_name ?? "usuário"
                      }`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-paz-error bg-white px-3 py-2.5 text-sm font-bold text-paz-error transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60 flex-1"
                    >
                      <CircleX size={18} />
                      <span className="sm:hidden">Recusar</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}