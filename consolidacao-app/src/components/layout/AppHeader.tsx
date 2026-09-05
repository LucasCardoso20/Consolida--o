import { Bell, HeartHandshake } from "lucide-react";

export function AppHeader() {

  return (
    <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-paz-border bg-white/95 px-8 backdrop-blur">
      {/* Logo e título para mobile (oculto no desktop) */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex size-10 items-center justify-center rounded-xl bg-paz-primary text-white shadow-sm">
          <HeartHandshake size={22} strokeWidth={2.2} />
        </div>

        <div className="leading-tight">
          <p className="text-sm font-bold text-paz-text">Consolidação</p>
          <p className="text-xs text-paz-muted">Acompanhamento de visitantes</p>
        </div>
      </div>

      {/* Título da página para desktop */}
      <div className="hidden lg:block">
        <p className="text-[11px] font-medium text-paz-muted">
          Paz Church - Consolidação {/* Temporário: nome da igreja */}
        </p>
        <h1 id="page-title" className="mt-1 text-[22px] font-bold tracking-[-0.04em] text-paz-text">
          Dashboard {/* Será atualizado via JS/React */}
        </h1>
      </div>

      {/* Botões de ação (busca, notificações, ajuda) */}
      <div className="flex items-center gap-3">
        {/* Campo de busca (oculto no mobile) */}
        <label className="relative hidden lg:block">
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paz-muted" // Ajustado para text-paz-muted
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            className="w-60 rounded-lg border border-paz-border bg-white py-2.5 pl-10 pr-4 text-[12px] text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft" // Ajustado para placeholder:text-paz-muted
            placeholder="Buscar pessoas..."
          />
        </label>

        {/* Botão de Notificações */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-paz-border bg-white text-paz-muted transition hover:border-paz-primary hover:text-paz-primary" // Ajustado para text-paz-muted
        >
          <Bell size={17} strokeWidth={1.8} /> {/* Ícone do design system */}
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-paz-error"></span>
        </button>

        {/* Botão de Ajuda */}
        <button
          type="button"
          aria-label="Ajuda"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-paz-border bg-white text-paz-muted transition hover:border-paz-primary hover:text-paz-primary" // Ajustado para text-paz-muted
        >
          {/* Ícone de ajuda do design system */}
          <svg
            className="h-[17px] w-[17px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.3 9a2.8 2.8 0 1 1 4.8 2c-.9.9-2.1 1.4-2.1 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>
    </header>
  );
}