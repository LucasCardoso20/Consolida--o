// src/components/layout/AppHeader.tsx
import { Bell, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import logoImage from "../../img/logo.jpg";
import { LogoutButton } from "./LogoutButton";

export function AppHeader() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSearch = search.trim();

    navigate({
      pathname: "/visitantes",
      search: normalizedSearch
        ? `?busca=${encodeURIComponent(normalizedSearch)}`
        : "",
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-paz-border bg-white/95 px-4 backdrop-blur lg:px-8">
      {/* Logo e título para mobile */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paz-primary text-lg font-extrabold text-white shadow-sm">
          <img src={logoImage} alt="Paz Church Logo" />
        </div>

        <div className="leading-tight">
          <p className="text-sm font-bold text-paz-text">Consolidação</p>
          <p className="text-xs text-paz-muted">
            Acompanhamento de visitantes
          </p>
        </div>
      </div>

      {/* Título da página no desktop */}
      <div className="hidden lg:block">
        <p className="text-[11px] font-medium text-paz-muted">
          Paz Church - Consolidação
        </p>

        <h1
          id="page-title"
          className="mt-1 text-[22px] font-bold tracking-[-0.04em] text-paz-text"
        >
          Dashboard
        </h1>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Busca: desktop */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative hidden lg:block"
          role="search"
        >
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paz-muted"
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-60 rounded-lg border border-paz-border bg-white py-2.5 pl-10 pr-4 text-[12px] text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft"
            placeholder="Buscar pessoas..."
            aria-label="Buscar pessoas"
          />
        </form>

        {/* Notificações */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-paz-border bg-white text-paz-muted transition hover:border-paz-primary hover:text-paz-primary"
        >
          <Bell size={17} strokeWidth={1.8} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-paz-error" />
        </button>

        {/* Ajuda */}
        <button
          type="button"
          aria-label="Ajuda"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-paz-border bg-white text-paz-muted transition hover:border-paz-primary hover:text-paz-primary"
        >
          <svg
            className="h-[17px] w-[17px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.3 9a2.8 2.8 0 1 1 4.8 2c-.9.9-2.1 1.4-2.1 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        {/* Sair da conta: apenas mobile, pois no desktop já existe na sidebar */}
        <div className="lg:hidden">
          <LogoutButton compact />
        </div>
      </div>
    </header>
  );
}