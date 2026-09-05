import { Outlet } from "react-router-dom";
import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar para desktop */}
      <SidebarNavigation />

      {/* Área principal do conteúdo - AGORA COM flex-1 */}
      <div className="flex-1 min-h-screen lg:pl-[264px]"> {/* Adicionado flex-1 aqui! */}
        {/* Header superior */}
        <AppHeader />

        {/* Conteúdo da página */}
        <main className="mx-auto w-full max-w-[1550px] p-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior para mobile */}
      <BottomNavigation />
    </div>
  );
}