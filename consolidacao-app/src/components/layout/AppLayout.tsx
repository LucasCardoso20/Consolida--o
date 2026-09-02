import { Outlet } from "react-router-dom";
import { SidebarNavigation } from "./SidebarNavigation";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarNavigation />

      <div className="min-h-screen lg:pl-72">
        <AppHeader />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
}