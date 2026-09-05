import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Users,
  UserRoundPlus,
  Phone, // Adicionado para o ícone de WhatsApp
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
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);

      const loadedVisitors = await getVisitors();
      setVisitors(loadedVisitors);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os dados do painel.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const overdueVisitors = visitors
    .filter((visitor) =>
      isOverdueContact(
        visitor.nextContactDate,
        visitor.followUpCompleted,
      ),
    )
    .sort((firstVisitor, secondVisitor) =>
      (firstVisitor.nextContactDate ?? "").localeCompare(
        secondVisitor.nextContactDate ?? "",
      ),
    );

  const todayVisitors = visitors
    .filter((visitor) =>
      isTodayContact(
        visitor.nextContactDate,
        visitor.followUpCompleted,
      ),
    )
    .sort((firstVisitor, secondVisitor) =>
      firstVisitor.name.localeCompare(secondVisitor.name, "pt-BR"),
    );

  const visitorsWithoutOwner = visitors
    .filter((visitor) =>
      isWithoutOwner(
        visitor.responsibleLeaderId,
        visitor.followUpCompleted,
      ),
    )

  const upcomingVisitors = visitors
    .filter(
      (visitor) =>
        !visitor.followUpCompleted &&
        visitor.nextContactDate &&
        visitor.nextContactDate > getTodayDate(),
    )
    .sort((firstVisitor, secondVisitor) =>
      (firstVisitor.nextContactDate ?? "").localeCompare(
        secondVisitor.nextContactDate ?? "",
      ),
    )
    .slice(0, 5);

  const priorityVisitors = [
    ...overdueVisitors.map((visitor) => ({
      visitor,
      priority: "overdue" as const,
    })),
    ...todayVisitors.map((visitor) => ({
      visitor,
      priority: "today" as const,
    })),
    ...visitorsWithoutOwner
      .filter(
        (visitor) =>
          !overdueVisitors.some(
            (overdueVisitor) => overdueVisitor.id === visitor.id,
          ) &&
          !todayVisitors.some(
            (todayVisitor) => todayVisitor.id === visitor.id,
          ),
      )
      .map((visitor) => ({
        visitor,
        priority: "withoutOwner" as const,
      })),
  ].slice(0, 8);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useVisitorsRealtime({
    onChange: () => {
      void loadDashboard();
    },
  });

  const dashboard = useMemo(() => {
    const pendingContact = visitors.filter(
      (visitor) =>
        Boolean(visitor.phone) &&
        !visitor.firstContactMade &&
        !visitor.followUpCompleted,
    );

    const inFollowUp = visitors.filter(
      (visitor) =>
        visitor.firstContactMade && !visitor.followUpCompleted,
    );

    const completed = visitors.filter(
      (visitor) => visitor.followUpCompleted,
    );

    return {
      totalVisitors: visitors.length,
      pendingContact,
      inFollowUp,
      completed,
    };
  }, [visitors]);

  // Dados para os cards de métricas, agora incluindo os que faltavam e sem mock
  const dashboardMetrics = [
    {
      label: "Pessoas cadastradas",
      value: dashboard.totalVisitors,
      description: `+${visitors.filter(v => new Date(v.createdAt).getMonth() === new Date().getMonth()).length} neste mês`,
      icon: Users,
      iconBg: "bg-paz-soft",
      iconColor: "text-paz-primary",
      badge: null,
    },
    {
      label: "Pendentes de contato",
      value: dashboard.pendingContact.length,
      description: "Precisam de atenção",
      icon: Clock3,
      iconBg: "bg-paz-soft",
      iconColor: "text-paz-warning",
      badge: null,
    },
    {
      label: "Em acompanhamento",
      value: dashboard.inFollowUp.length,
      description: "Contato já realizado",
      icon: MessageCircle,
      iconBg: "bg-paz-soft",
      iconColor: "text-paz-primary",
      badge: null,
    },
    {
      label: "Consolidações concluídas",
      value: dashboard.completed.length, // Agora dinâmico
      description: null,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-paz-success",
      badge: null, // Mantido mockado, pois não há dados para meta
      progressBar: { value: Math.round((dashboard.completed.length / dashboard.totalVisitors) * 100) || 0, color: "bg-paz-primary" }, // Agora dinâmico
    },
  ];

  const { profile } = useAccess(); // Usar o hook useAccess

  return (
    <section>
      {/* Cabeçalho da página - Adaptado para o DS */}
      <section className="mb-8 flex flex-wrap items-end justify-between gap-5">
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
        <div className="mb-6 rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm font-medium text-paz-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <DashboardLoading />
      ) : (
        <>
          {/* Cards de Métricas - Adaptados para o DS */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardMetrics.map((metric, index) => (
              <article key={index} className="rounded-xl border border-paz-border bg-white p-5 shadow-panel">
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.iconBg} ${metric.iconColor}`}>
                    <metric.icon className="h-[18px] w-[18px]" strokeWidth="1.9" />
                  </div>
                  {/* {metric.badge && (
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${metric.badge?.bg} ${metric.badge.color}`}>
                      {metric.badge.text}
                    </span>
                  )} */}
                </div>
                <p className="mt-5 text-[12px] font-medium text-paz-muted">{metric.label}</p>
                <p className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-paz-text">{metric.value}</p>
                {metric.description && <p className="mt-1 text-[11px] text-slate-400">{metric.description}</p>}
                {metric.progressBar && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${metric.progressBar.value}%`, backgroundColor: "var(--paz-primary)" }}></div>
                  </div>
                )}
              </article>
            ))}
          </section>

          {/* Seção de Pendências de acompanhamento (Lista de Pendências) - Movida para cima e 100% da largura */}
          <section className="mt-6 rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:mt-8 sm:p-6">
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

          {/* Seção de Próximas ações - Agora ocupando 100% da largura */}
          <section className="mt-6 rounded-xl border border-paz-border bg-white shadow-panel">
            <div className="border-b border-paz-border px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold tracking-[-0.02em] text-paz-text">
                    Próximas ações
                  </h3>
                  <p className="mt-1 text-[12px] text-paz-muted">
                    Para concluir hoje.
                  </p>
                </div>
                <span className="rounded-full bg-paz-soft px-2 py-1 text-[10px] font-bold text-paz-primary">
                  {priorityVisitors.length}
                </span>
              </div>
            </div>

            <div className="space-y-1 p-3">
              {priorityVisitors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-paz-border bg-paz-soft px-5 py-10 text-center">
                  <UserRoundPlus className="mx-auto text-paz-muted" size={32} />
                  <p className="mt-3 font-bold text-paz-text">
                    Nenhuma pendência prioritária
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-paz-muted">
                    Não há contatos atrasados, previstos para hoje ou visitantes sem
                    responsável.
                  </p>
                </div>
              ) : (
                priorityVisitors.map(({ visitor, priority }) => (
                  <Link
                    key={visitor.id}
                    to={`/visitantes/${visitor.id}`}
                    className="task-card flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left hover:border-paz-border"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-paz-primary"></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-paz-text">
                        {priority === "withoutOwner" && "Atribuir líder a "}
                        {visitor.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-paz-muted">
                        {priority === "overdue" && `Acompanhamento · Atrasado desde ${formatDate(visitor.nextContactDate!)}`}
                        {priority === "today" && `Acompanhamento · Previsto para hoje`}
                        {priority === "withoutOwner" && `Novo visitante · Urgente`}
                      </span>
                    </span>
                    {priority === "overdue" && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-paz-error"></span>}
                    {priority === "today" && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-paz-warning"></span>}
                  </Link>
                ))
              )}
            </div>

            <div className="mx-6 border-t border-paz-border py-4">
              <Link to="/visitantes" className="text-[12px] font-semibold text-paz-primary hover:text-paz-hover">
                Ver todas as tarefas →
              </Link>
            </div>
          </section>

          {/* Seção de Próximos contatos (Lista de Próximos Contatos) - Mantida */}
          <section className="mt-6 rounded-xl border border-paz-border bg-white p-5 shadow-panel sm:p-6">
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