// src/components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar para desktop - oculta em telas menores que 'lg' */}
      {/* Adicionado 'hidden' para ocultar por padrão e 'lg:flex' para exibir em telas grandes */}
      <div className="hidden lg:flex flex-col flex-shrink-0 w-[264px] border-r border-paz-border bg-paz-primary text-white">
        <SidebarNavigation />
      </div>

      <div className="flex flex-1 flex-col overflow-x-hidden">
        <AppHeader />

        {/* Conteúdo principal da página */}
        {/* Removido o p-4 daqui para que cada página gerencie seu próprio padding */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Navegação inferior para mobile - oculta em telas maiores que 'lg' */}
        {/* Adicionado 'lg:hidden' para ocultar em telas grandes e 'block' para exibir em mobile */}
        <div className="block lg:hidden">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
}