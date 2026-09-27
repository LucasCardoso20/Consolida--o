import {
  ClipboardList,
  Home,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ElementType,
} from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAccess } from "../../contexts/AccessContext";
import { getVisitorsCount } from "../../lib/visitors";
import logoImage from "../../img/logo.jpg";
import { LogoutButton } from "./LogoutButton";

interface NavItem {
  label: string;
  to: string;
  icon: ElementType;
  end?: boolean;
  badge?: number;
}

export function SidebarNavigation() {
  const { profile } = useAccess();
  const navigate = useNavigate();

  const [visitorsCount, setVisitorsCount] = useState<number | null>(null);

  const loadVisitorsCount = useCallback(async () => {
    try {
      const count = await getVisitorsCount(profile);
      setVisitorsCount(count);
    } catch (error) {
      console.error("Não foi possível carregar o total de visitantes:", error);
      setVisitorsCount(null);
    }
  }, [profile]);

  useEffect(() => {
    void loadVisitorsCount();
  }, [loadVisitorsCount]);

  const navigationItems: NavItem[] = [
    {
      label: "Dashboard",
      to: "/",
      icon: Home,
      end: true,
    },
    {
      label: "Pessoas",
      to: "/visitantes",
      icon: Users,
      badge: visitorsCount ?? undefined,
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

  const getInitials = (fullName: string | null) => {
    if (!fullName) {
      return "??";
    }

    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const handleAddVisitorClick = () => {
    navigate("/visitantes/novo");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-paz-border bg-white shadow-lg">
      {/* Marca */}
      <div className="flex h-[88px] items-center gap-3 px-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paz-primary text-lg font-extrabold text-white shadow-sm">
          <img src={logoImage} alt="Paz Church Logo" />
        </div>

        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-paz-primary">
            PAZ CHURCH
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-paz-muted">
            Consolidação
          </p>
        </div>
      </div>

      {/* Ação principal */}
      <div className="px-5 pb-6">
        <button
          type="button"
          onClick={handleAddVisitorClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-[13px] font-semibold text-white shadow-md transition hover:bg-paz-hover focus:outline-none focus:ring-4 focus:ring-paz-soft"
        >
          <Plus width="18" height="18" strokeWidth="2" />
          Novo visitante
        </button>
      </div>

      {/* Navegação */}
      <nav className="space-y-1 overflow-y-auto px-3 thin-scrollbar">
        <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-paz-muted/60">
          Visão geral
        </p>

        <ul className="space-y-1">
          {navigationItems.map(({ label, to, icon: Icon, end, badge }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `nav-item relative flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[13px] transition ${
                    isActive
                      ? "active"
                      : "text-paz-muted hover:bg-paz-soft hover:text-paz-primary"
                  }`
                }
              >
                <Icon
                  size={17}
                  strokeWidth={1.8}
                  className="text-current"
                />

                {label}

                {badge !== undefined && (
                  <span className="ml-auto rounded-full bg-paz-soft px-2 py-0.5 text-[10px] font-bold text-paz-primary">
                    {badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="mt-auto border-t border-paz-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paz-soft text-[11px] font-bold text-paz-primary">
            {getInitials(profile?.full_name || null)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-paz-text">
              {profile?.full_name || "Usuário"}
            </p>

            <p className="truncate text-[11px] text-paz-muted">
              {profile?.role === "MASTER" ? "Master" : "Líder"}
            </p>
          </div>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}