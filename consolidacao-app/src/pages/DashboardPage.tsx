// src/pages/DashboardPage.tsx
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Users,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState} from "react";
import { Link } from "react-router-dom";

import { getVisitors } from "../lib/visitors";
import type { Visitor } from "../types/visitor";
import { useVisitorsRealtime } from "../hooks/useVisitorsRealtime";
import { useAccess } from "../contexts/AccessContext";

// Funções auxiliares (mantidas como estão)
function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function getFirstName(fullName: string) {
  return fullName.trim().split(" ")[0] || fullName;
}

function getInitials(fullName: string) {
  const parts = fullName.split(" ");
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getWhatsAppUrl(phone: string, name: string) {
  const normalizedPhone = phone.replace(/\D/g, "");

  const phoneWithCountryCode = normalizedPhone.startsWith("55")
    ? normalizedPhone
    : `55${normalizedPhone}`;

  const message = encodeURIComponent(
    `Olá, ${getFirstName(name)}! Foi muito bom receber você em nosso culto. Estamos felizes por ter você conosco!`,
  );

  return `https://wa.me/${phoneWithCountryCode}?text=${message}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdueContact(
  nextContactDate: string | null,
  followUpCompleted: boolean,
) {
  if (!nextContactDate || followUpCompleted) {
    return false;
  }

  return nextContactDate < getTodayDate();
}

function isTodayContact(
  nextContactDate: string | null,
  followUpCompleted: boolean,
) {
  if (!nextContactDate || followUpCompleted) {
    return false;
  }

  return nextContactDate === getTodayDate();
}

function isWithoutOwner(
  responsibleLeaderId: string | null,
  followUpCompleted: boolean,
) {
  return !responsibleLeaderId && !followUpCompleted;
}

export function DashboardPage() {
  const { profile } = useAccess();

  const [dashboard, setDashboard] = useState({
    totalVisitors: 0,
    pendingContact: [] as Visitor[],
    inFollowUp: 0,
    overdueContact: 0,
    todayContact: 0,
    withoutOwner: 0,
    upcomingContact: [] as Visitor[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const visitors = await getVisitors();

      const pendingContact = visitors.filter(
        (v) => !v.firstContactMade && v.phone,
      );
      const inFollowUp = visitors.filter(
        (v) => v.firstContactMade && !v.followUpCompleted,
      ).length;

      const overdueContact = visitors.filter((v) =>
        isOverdueContact(v.nextContactDate, v.followUpCompleted),
      ).length;

      const todayContact = visitors.filter((v) =>
        isTodayContact(v.nextContactDate, v.followUpCompleted),
      ).length;

      const withoutOwner = visitors.filter((v) =>
        isWithoutOwner(v.responsibleLeaderId, v.followUpCompleted),
      ).length;

      const upcomingContact = visitors
        .filter(
          (v) =>
            v.nextContactDate &&
            v.nextContactDate > getTodayDate() &&
            !v.followUpCompleted,
        )
        .sort((a, b) =>
          (a.nextContactDate || "").localeCompare(b.nextContactDate || ""),
        );

      setDashboard({
        totalVisitors: visitors.length,
        pendingContact,
        inFollowUp,
        overdueContact,
        todayContact,
        withoutOwner,
        upcomingContact,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Não foi possível carregar os dados do painel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useVisitorsRealtime({
    onChange: () => {
      void loadDashboardData();
    },
  });

  const dashboardMetrics = useMemo(
    () => [
      {
        label: "Total de visitantes",
        value: dashboard.totalVisitors,
        icon: Users,
        iconBg: "bg-paz-soft",
        iconColor: "text-paz-primary",
        description: "Total de pessoas cadastradas no sistema.",
      },
      {
        label: "Pendentes de contato",
        value: dashboard.pendingContact.length,
        icon: Clock3,
        iconBg: "bg-paz-warning/10",
        iconColor: "text-paz-warning",
        description: "Pessoas que precisam do primeiro contato.",
      },
      {
        label: "Em acompanhamento",
        value: dashboard.inFollowUp,
        icon: MessageCircle,
        iconBg: "bg-paz-info/10",
        iconColor: "text-paz-info",
        description: "Pessoas que já receberam o primeiro contato.",
      },
      {
        label: "Concluídos",
        value: dashboard.totalVisitors - dashboard.inFollowUp - dashboard.pendingContact.length, // Ajuste para refletir os concluídos
        icon: CheckCircle2,
        iconBg: "bg-paz-success/10",
        iconColor: "text-paz-success",
        description: "Acompanhamentos finalizados.",
      },
    ],
    [dashboard],
  );


  const upcomingVisitors = useMemo(() => {
    return dashboard.upcomingContact.filter(
      (visitor) =>
        !isOverdueContact(visitor.nextContactDate, visitor.followUpCompleted) &&
        !isTodayContact(visitor.nextContactDate, visitor.followUpCompleted) &&
        !isWithoutOwner(visitor.responsibleLeaderId, visitor.followUpCompleted),
    );
  }, [dashboard.upcomingContact]);

  return (
    <section className="p-4 pb-24 lg:p-8 lg:pb-8 space-y-6 sm:space-y-8"> {/* Adicionado padding e space-y */}
      {/* Header da Página */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-paz-muted">
            <span>Visão geral</span>
            <span className="text-slate-300">/</span>
          </div>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-paz-text">
            Olá, {getFirstName(profile?.full_name ?? "") || "usuário"}.
          </h2>
          <p className="mt-1 text-[13px] text-paz-muted">
            Acompanhe os principais movimentos da sua comunidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="view-button active flex items-center gap-2 rounded-lg border border-paz-border bg-white px-3 py-2 text-[12px] font-medium text-paz-muted transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Visão geral
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm font-medium text-paz-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <DashboardLoading />
      ) : (
        <>
          {/* Cards de Métricas */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardMetrics.map((metric, index) => (
              <article key={index} className="rounded-xl border border-paz-border bg-white p-5 shadow-panel">
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.iconBg} ${metric.iconColor}`}>
                    <metric.icon className="h-[18px] w-[18px]" strokeWidth="1.9" />
                  </div>
                </div>
                <p className="mt-5 text-[16px] font-medium text-paz-muted">{metric.label}</p>
                <p className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-paz-text">{metric.value}</p>
                {metric.description && <p className="mt-1 text-[14px] text-slate-400">{metric.description}</p>}
                
              </article>
            ))}
          </section>

          {/* Seção de Pendências de acompanhamento */}
          <section className="rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-[15px] font-bold tracking-[-0.02em] text-paz-text">
                  Pendências de acompanhamento
                </h3>
                <p className="mt-1 text-[12px] text-paz-muted">
                  Pessoas que ainda precisam receber o primeiro contato.
                </p>
              </div>

              <Link
                to="/visitantes"
                className="flex items-center gap-1.5 text-[12px] font-semibold text-paz-primary hover:text-paz-hover"
              >
                Ver todos
                <ArrowRight className="h-4 w-4" strokeWidth="2" />
              </Link>
            </div>

            {dashboard.pendingContact.length === 0 ? (
              <EmptyPendingList />
            ) : (
              <div className="mt-6 divide-y divide-paz-border">
                {dashboard.pendingContact.slice(0, 5).map((visitor) => (
                  <PendingVisitorItem key={visitor.id} visitor={visitor} />
                ))}
              </div>
            )}

            {dashboard.pendingContact.length > 5 && (
              <Link
                to="/visitantes"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-paz-primary hover:text-paz-hover"
              >
                Ver mais {dashboard.pendingContact.length - 5} pendências
                <ArrowRight size={16} />
              </Link>
            )}
          </section>

          {/* Seção de Próximos contatos */}
          <section className="rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:p-6">
            <div>
              <h3 className="text-[15px] font-bold tracking-[-0.02em] text-paz-text">
                Próximos contatos
              </h3>
              <p className="mt-1 text-[12px] text-paz-muted">
                Acompanhamentos futuros já agendados.
              </p>
            </div>

            {upcomingVisitors.length === 0 ? (
              <p className="mt-5 rounded-xl bg-paz-soft p-4 text-sm text-paz-muted">
                Nenhum próximo contato agendado.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-paz-border">
                {upcomingVisitors.map((visitor) => (
                  <Link
                    key={visitor.id}
                    to={`/visitantes/${visitor.id}`}
                    className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 transition hover:bg-paz-soft/30 rounded-lg -mx-2 px-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-paz-text transition group-hover:text-paz-primary">
                        {visitor.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-paz-muted">
                        {visitor.nextAction ?? "Nenhuma ação definida"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-paz-primary">
                        {visitor.nextContactDate
                          ? formatDate(visitor.nextContactDate)
                          : ""}
                      </p>

                      <p className="mt-2 text-sm text-paz-muted">
                        <span className="font-semibold">Responsável: </span>
                        {visitor.responsibleLeader?.fullName ?? "Definido"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-paz-border bg-white p-6 text-center shadow-panel">
      <LoaderCircle className="animate-spin text-paz-primary" size={30} />
      <p className="mt-4 text-sm font-semibold text-paz-muted">
        Carregando painel...
      </p>
    </div>
  );
}

function EmptyPendingList() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-paz-border bg-paz-soft px-4 py-10 text-center">
      <CheckCircle2 className="mx-auto text-paz-success" size={34} />
      <p className="mt-3 text-sm font-bold text-paz-text">
        Nenhuma pendência de contato
      </p>
      <p className="mt-1 text-sm text-paz-muted">
        Muito bem! Os visitantes com telefone já receberam acompanhamento.
      </p>
    </div>
  );
}

type PendingVisitorItemProps = {
  visitor: Visitor;
};

function PendingVisitorItem({ visitor }: PendingVisitorItemProps) {
  return (
    <div className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between transition hover:bg-paz-soft/30 rounded-lg -mx-2 px-2">
      <Link
        to={`/visitantes/${visitor.id}`}
        className="group min-w-0 flex-1 flex items-center gap-3"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF1FF] text-[11px] font-bold text-paz-primary">
          {getInitials(visitor.name)}
        </div>
        <div>
          <p className="truncate font-bold text-paz-text transition group-hover:text-paz-primary">
            {visitor.name}
          </p>
          <p className="mt-0.5 text-[11px] text-paz-muted">
            {visitor.responsibleLeader?.fullName ? `Responsável: ${visitor.responsibleLeader.fullName}` : "Sem responsável"}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={`/visitantes/${visitor.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-paz-border bg-white px-3 py-2 text-xs font-bold text-paz-muted transition hover:bg-paz-soft focus:outline-none focus:ring-2 focus:ring-paz-soft"
        >
          Ver detalhes
        </Link>

        {visitor.phone && (
          <a
            href={getWhatsAppUrl(visitor.phone, visitor.name)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-paz-primary px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-paz-hover focus:outline-none focus:ring-2 focus:ring-paz-soft"
          >
            <Phone size={15} />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}