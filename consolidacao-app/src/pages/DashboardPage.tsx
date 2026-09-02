import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Users,
  AlertTriangle,
CalendarClock,
CircleUserRound,
UserRoundPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { getVisitors } from "../lib/visitors";
import type { Visitor } from "../types/visitor";
import { useVisitorsRealtime } from "../hooks/useVisitorsRealtime";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function getFirstName(fullName: string) {
  return fullName.trim().split(" ")[0] || fullName;
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

  const stats = [
    {
      label: "Visitantes cadastrados",
      value: dashboard.totalVisitors,
      description: "Total no sistema",
      icon: Users,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Pendentes de contato",
      value: dashboard.pendingContact.length,
      description: "Precisam de atenção",
      icon: Clock3,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Em acompanhamento",
      value: dashboard.inFollowUp.length,
      description: "Contato já realizado",
      icon: MessageCircle,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Concluídos",
      value: dashboard.completed.length,
      description: "Acompanhamentos finalizados",
      icon: CheckCircle2,
      color: "bg-brand-50 text-brand-700",
    },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Visão geral</p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Acompanhe quem chegou
          </h2>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Cada visitante merece ser lembrado e cuidado.
          </p>
        </div>

        <Link
          to="/visitantes/novo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          Cadastrar visitante
          <ArrowRight size={18} />
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <DashboardLoading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, description, icon: Icon, color }) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">{description}</p>
                  </div>

                  <div className={`rounded-xl p-3 ${color}`}>
                    <Icon size={22} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:mt-8 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock3 className="text-amber-600" size={21} />
                  <h3 className="font-bold text-slate-900">
                    Pendências de acompanhamento
                  </h3>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Pessoas que ainda precisam receber o primeiro contato.
                </p>
              </div>

              <Link
                to="/visitantes"
                className="text-sm font-bold text-brand-700 transition hover:text-brand-900"
              >
                Ver todos
              </Link>
            </div>

            {dashboard.pendingContact.length === 0 ? (
              <EmptyPendingList />
            ) : (
              <div className="mt-6 divide-y divide-slate-100">
                {dashboard.pendingContact.slice(0, 5).map((visitor) => (
                  <PendingVisitorItem key={visitor.id} visitor={visitor} />
                ))}
              </div>
            )}

            {dashboard.pendingContact.length > 5 && (
              <Link
                to="/visitantes"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-900"
              >
                Ver mais {dashboard.pendingContact.length - 5} pendências
                <ArrowRight size={16} />
              </Link>
            )}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
              <CheckCircle2 className="text-brand-700" size={24} />

              <h3 className="mt-4 text-lg font-bold text-brand-900">
                Acompanhamentos concluídos
              </h3>

              <p className="mt-1 text-sm leading-relaxed text-brand-800">
                {dashboard.completed.length === 0
                  ? "Quando um acompanhamento for concluído, ele aparecerá contabilizado aqui."
                  : `${dashboard.completed.length} ${
                      dashboard.completed.length === 1
                        ? "pessoa já concluiu"
                        : "pessoas já concluíram"
                    } o acompanhamento inicial.`}
              </p>
            </article>

            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
              <MessageCircle className="text-blue-700" size={24} />

              <h3 className="mt-4 text-lg font-bold text-blue-900">
                Em acompanhamento
              </h3>

              <p className="mt-1 text-sm leading-relaxed text-blue-800">
                {dashboard.inFollowUp.length === 0
                  ? "Assim que o primeiro contato for marcado, a pessoa aparecerá nesta etapa."
                  : `${dashboard.inFollowUp.length} ${
                      dashboard.inFollowUp.length === 1
                        ? "visitante está em acompanhamento"
                        : "visitantes estão em acompanhamento"
                    } agora.`}
              </p>
            </article>
                     <DashboardMetricCard
  label="Contatos atrasados"
  value={overdueVisitors.length}
  description="Precisam de atenção imediata"
  icon={<AlertTriangle size={21} />}
  variant="danger"
/>

<DashboardMetricCard
  label="Contatos para hoje"
  value={todayVisitors.length}
  description="Acompanhamentos previstos hoje"
  icon={<CalendarClock size={21} />}
  variant="warning"
/>

<DashboardMetricCard
  label="Sem responsável"
  value={visitorsWithoutOwner.length}
  description="Visitantes sem líder definido"
  icon={<CircleUserRound size={21} />}
  variant="neutral"
/>
          </section>
 
        </>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h3 className="font-bold text-slate-900">
        Pendências prioritárias
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Visitantes que precisam de uma ação da equipe.
      </p>
    </div>

    <Link
      to="/visitantes"
      className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 transition hover:text-brand-800"
    >
      Ver todos os visitantes
      <ArrowRight size={16} />
    </Link>
  </div>

  {priorityVisitors.length === 0 ? (
    <div className="mt-6 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-5 py-10 text-center">
      <UserRoundPlus className="mx-auto text-brand-400" size={32} />

      <p className="mt-3 font-bold text-slate-800">
        Nenhuma pendência prioritária
      </p>

      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
        Não há contatos atrasados, previstos para hoje ou visitantes sem
        responsável.
      </p>
    </div>
  ) : (
    <div className="mt-5 space-y-3">
      {priorityVisitors.map(({ visitor, priority }) => (
        <PriorityVisitorItem
          key={visitor.id}
          visitor={visitor}
          priority={priority}
        />
      ))}
    </div>
  )}
</section>
<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <div>
    <h3 className="font-bold text-slate-900">Próximos contatos</h3>

    <p className="mt-1 text-sm text-slate-500">
      Acompanhamentos futuros já agendados.
    </p>
  </div>

  {upcomingVisitors.length === 0 ? (
    <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
      Nenhum próximo contato agendado.
    </p>
  ) : (
    <div className="mt-5 divide-y divide-slate-100">
      {upcomingVisitors.map((visitor) => (
        <Link
          key={visitor.id}
          to={`/visitantes/${visitor.id}`}
          className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-800 transition group-hover:text-brand-700">
              {visitor.name}
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
              {visitor.nextAction ?? "Nenhuma ação definida"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-brand-700">
              {visitor.nextContactDate
                ? formatDate(visitor.nextContactDate)
                : ""}
            </p>

            <p className="mt-2 text-sm text-slate-600">
  <span className="font-semibold">Responsável: </span>
  {visitor.responsibleLeader?.fullName ?? "Definido"}
</p>
          </div>
        </Link>
      ))}
    </div>
  )}
</section>
    </section>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <LoaderCircle className="animate-spin text-brand-600" size={30} />

      <p className="mt-4 text-sm font-semibold text-slate-600">
        Carregando painel...
      </p>
    </div>
  );
}

function EmptyPendingList() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-10 text-center">
      <CheckCircle2 className="mx-auto text-brand-600" size={34} />

      <p className="mt-3 text-sm font-bold text-brand-900">
        Nenhuma pendência de contato
      </p>

      <p className="mt-1 text-sm text-brand-800">
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
    <div className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <Link
        to={`/visitantes/${visitor.id}`}
        className="group min-w-0 flex-1"
      >
        <p className="truncate font-bold text-slate-900 transition group-hover:text-brand-700">
          {visitor.name}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Visitou em {formatDate(visitor.visitDate)}
          {visitor.cellName ? ` • ${visitor.cellName}` : ""}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={`/visitantes/${visitor.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Ver detalhes
        </Link>

        {visitor.phone && (
          <a
            href={getWhatsAppUrl(visitor.phone, visitor.name)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

type DashboardMetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  variant: "danger" | "warning" | "neutral";
};

function DashboardMetricCard({
  label,
  value,
  description,
  icon,
  variant,
}: DashboardMetricCardProps) {
  const styles = {
    danger: {
      container: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-700",
      value: "text-red-800",
    },
    warning: {
      container: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-800",
    },
    neutral: {
      container: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
      value: "text-slate-800",
    },
  };

  const currentStyle = styles[variant];

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${currentStyle.container}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>

          <p
            className={`mt-2 text-3xl font-bold tracking-tight ${currentStyle.value}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex size-10 items-center justify-center rounded-xl ${currentStyle.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {description}
      </p>
    </article>
  );
}

type PriorityVisitorItemProps = {
  visitor: Visitor;
  priority: "overdue" | "today" | "withoutOwner";
};

function PriorityVisitorItem({
  visitor,
  priority,
}: PriorityVisitorItemProps) {
  const config = {
    overdue: {
      label: visitor.nextContactDate
        ? `Contato atrasado desde ${formatDate(visitor.nextContactDate)}`
        : "Contato atrasado",
      badgeClassName: "bg-red-100 text-red-800",
      borderClassName: "border-red-200 hover:border-red-300",
      iconClassName: "bg-red-100 text-red-700",
    },
    today: {
      label: "Contato previsto para hoje",
      badgeClassName: "bg-amber-100 text-amber-800",
      borderClassName: "border-amber-200 hover:border-amber-300",
      iconClassName: "bg-amber-100 text-amber-700",
    },
    withoutOwner: {
      label: "Sem responsável definido",
      badgeClassName: "bg-slate-200 text-slate-700",
      borderClassName: "border-slate-200 hover:border-slate-300",
      iconClassName: "bg-slate-200 text-slate-700",
    },
  }[priority];

  return (
    <Link
      to={`/visitantes/${visitor.id}`}
      className={`group block rounded-xl border p-4 transition ${config.borderClassName}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${config.iconClassName}`}
        >
          {priority === "overdue" ? (
            <AlertTriangle size={20} />
          ) : priority === "today" ? (
            <CalendarClock size={20} />
          ) : (
            <CircleUserRound size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-bold text-slate-900">
              {visitor.name}
            </h4>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${config.badgeClassName}`}
            >
              {config.label}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
  {visitor.responsibleLeader?.fullName ?? "Responsável definido"}
</p>

          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
            <span className="font-semibold">Próxima ação: </span>
            {visitor.nextAction ?? "Nenhuma ação definida ainda."}
          </p>
        </div>

        <ArrowRight
          size={18}
          className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700"
        />
      </div>
    </Link>
  );
}