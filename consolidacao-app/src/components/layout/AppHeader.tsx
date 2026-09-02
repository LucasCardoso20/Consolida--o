import { Bell, HeartHandshake } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur lg:bg-white/95">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <HeartHandshake size={22} strokeWidth={2.2} />
          </div>

          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">
              Consolidação
            </p>
            <p className="text-xs text-slate-500">Acompanhamento de visitantes</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <p className="text-sm text-slate-500">Bem-vinda de volta,</p>
          <h1 className="text-lg font-bold text-slate-900">Equipe de Consolidação</h1>
        </div>

        <button
          type="button"
          aria-label="Notificações"
          className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Bell size={21} />
        </button>
      </div>
    </header>
  );
}