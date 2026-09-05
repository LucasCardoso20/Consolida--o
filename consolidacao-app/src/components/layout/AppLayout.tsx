// src/components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar para desktop - oculta em telas menores que 'lg' */}
      <div className="hidden lg:block"> {/* Adicionado hidden lg:block */}
        <SidebarNavigation />
      </div>

      {/* Área principal do conteúdo */}
      <div className="flex-1 min-h-screen lg:pl-[264px]">
        {/* Header superior */}
        <AppHeader />

        {/* Conteúdo da página */}
        <main className="mx-auto w-full max-w-[1550px] p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8"> {/* Ajustado padding para mobile */}
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior para mobile - oculta em telas maiores que 'lg' */}
      <BottomNavigation />
    </div>
  );
}