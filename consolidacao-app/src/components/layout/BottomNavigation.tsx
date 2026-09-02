import {
  ClipboardList,
  Home,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    label: "Início",
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
    label: "Adicionar",
    to: "/visitantes/novo",
    icon: PlusCircle,
  },
  {
    label: "Células",
    to: "/celulas",
    icon: ClipboardList,
  },
  {
    label: "Ajustes",
    to: "/configuracoes",
    icon: Settings,
  },
];

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {navigationItems.map(({ label, to, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`
              }
            >
              <Icon size={21} strokeWidth={2.2} />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}