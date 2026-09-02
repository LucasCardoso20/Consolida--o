import {
  ClipboardList,
  HeartHandshake,
  Home,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { LogoutButton } from "./LogoutButton";
const navigationItems = [
  {
    label: "Visão geral",
    to: "/",
    icon: Home,
    end: true,
  },
  {
    label: "Visitantes",
    to: "/visitantes",
    icon: Users,
  },
  {
    label: "Células",
    to: "/celulas",
    icon: ClipboardList,
  },
  {
    label: "Configurações",
    to: "/configuracoes",
    icon: Settings,
  },
];

export function SidebarNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <HeartHandshake size={24} strokeWidth={2.2} />
        </div>

        <div>
          <p className="font-bold text-slate-900">Consolidação</p>
          <p className="text-xs text-slate-500">Cuidando de pessoas</p>
        </div>
      </div>

      <NavLink
        to="/visitantes/novo"
        className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
      >
        <Plus size={19} strokeWidth={2.5} />
        Novo visitante
      </NavLink>

      <nav className="mt-6">
        <p className="mb-3 px-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
          Menu
        </p>

        <ul className="space-y-1">
          {navigationItems.map(({ label, to, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto rounded-xl border border-brand-100 bg-brand-50 p-4">
        <p className="text-sm font-bold text-brand-900">Cada pessoa importa.</p>
        <p className="mt-1 text-xs leading-relaxed text-brand-800">
          Registre e acompanhe cada visitante com carinho.
        </p>
      </div>
      <div className="mt-auto border-t border-slate-200 pt-4">
  <LogoutButton />
</div>
    </aside>
  );
}