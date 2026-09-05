// src/pages/VisitorsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  UserRound,
  Users,
  Phone, // Importado para o VisitorCard
  UserRoundPlus, // Importado para o VisitorCard
} from "lucide-react";
import { Link } from "react-router-dom";

import { getVisitors } from "../lib/visitors";
import type { Visitor } from "../types/visitor";
import { useVisitorsRealtime } from "../hooks/useVisitorsRealtime";

// --- Funções Auxiliares (mantidas como fornecido) ---
function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getVisitorStatus(visitor: Visitor) {
  if (visitor.followUpCompleted) {
    return {
      label: "Concluído",
      className: "bg-paz-success/10 text-paz-success",
      icon: CheckCircle2,
    };
  }

  if (visitor.firstContactMade) {
    return {
      label: "Em acompanhamento",
      className: "bg-paz-info/10 text-paz-info",
      icon: CheckCircle2,
    };
  }

  if (visitor.phone) {
    return {
      label: "Contato pendente",
      className: "bg-paz-warning/10 text-paz-warning",
      icon: Clock3,
    };
  }

  return {
    label: "Novo visitante",
    className: "bg-paz-soft text-paz-muted",
    icon: UserRound,
  };
}

// --- Componente VisitorsPage ---
export function VisitorsPage() {
  const [search, setSearch] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVisitors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedVisitors = await getVisitors();
      setVisitors(fetchedVisitors);
    } catch (err) {
      console.error("Failed to load visitors:", err);
      setError("Não foi possível carregar os visitantes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  useVisitorsRealtime({
    onChange: () => {
      void loadVisitors();
    },
  });

  const filteredVisitors = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return visitors;
    }

    return visitors.filter((visitor) => {
      const searchableContent = [
        visitor.name,
        visitor.phone,
        visitor.invitedBy,
        visitor.cellName,
        visitor.responsibleLeader?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return searchableContent.includes(normalizedSearch);
    });
  }, [search, visitors]);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"> {/* Ajustado para mobile */}
        <div>
          <p className="text-sm font-semibold text-paz-primary">Pessoas</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text">
            Visitantes
          </h2>
          <p className="mt-2 text-sm text-paz-muted">
            {visitors.length === 1
              ? "1 visitante cadastrado"
              : `${visitors.length} visitantes cadastrados`}
          </p>
        </div>

        <Link
          to="/visitantes/novo"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Novo visitante</span>
          <span className="sm:hidden">Novo</span>
        </Link>
      </div>

      <div className="relative mt-6">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-paz-muted"
          size={20}
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, telefone ou célula..."
          className="w-full rounded-xl border border-paz-border bg-white py-3 pr-4 pl-11 text-sm outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
        />
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-paz-error/20 bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-paz-border bg-white px-4 py-14 text-center">
          <p className="text-sm font-semibold text-paz-muted">
            Carregando visitantes...
          </p>
        </div>
      ) : (
        <>
          {visitors.length === 0 ? (
            <EmptyVisitorList />
          ) : filteredVisitors.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-paz-border bg-white px-4 py-14 text-center">
              <Search className="mx-auto text-paz-muted" size={38} />
              <h3 className="mt-4 font-bold text-paz-text">
                Nenhum resultado encontrado
              </h3>
              <p className="mt-2 text-sm text-paz-muted">
                Tente buscar usando outro nome, telefone ou célula.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredVisitors.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// --- Componente EmptyVisitorList ---
function EmptyVisitorList() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-paz-border bg-white px-4 py-14 text-center">
      <Users className="mx-auto text-paz-muted" size={38} />
      <h3 className="mt-4 font-bold text-paz-text">A lista está vazia</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-muted">
        Os visitantes cadastrados aparecerão aqui para facilitar o acompanhamento.
      </p>

      <Link
        to="/visitantes/novo"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-paz-hover"
      >
        <Plus size={18} />
        Cadastrar primeiro visitante
      </Link>
    </div>
  );
}

// --- Componente VisitorCard ---
type VisitorCardProps = {
  visitor: Visitor;
};

function VisitorCard({ visitor }: VisitorCardProps) {
  const status = getVisitorStatus(visitor);
  const StatusIcon = status.icon;

  return (
    <Link
      to={`/visitantes/${visitor.id}`}
      className="block rounded-2xl border border-paz-border bg-white p-4 shadow-sm transition hover:border-paz-primary hover:shadow-md sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paz-soft text-paz-primary">
          <UserRound size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-paz-text">{visitor.name}</h3>

              <p className="mt-1 text-xs text-paz-muted">
                Visitou em {formatDate(visitor.visitDate)}
                {visitor.cellName ? ` • ${visitor.cellName}` : ""}
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
            >
              <StatusIcon size={14} />
              {status.label}
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-2 text-xs font-medium text-paz-muted"> {/* Ajustado para mobile */}
            {visitor.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} />
                {visitor.phone}
              </span>
            )}

            {visitor.invitedBy && (
              <span className="inline-flex items-center gap-1.5">
                <UserRoundPlus size={14} />
                Convidado por: {visitor.invitedBy}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              Responsável: {visitor.responsibleLeader?.fullName || "Não informado"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}