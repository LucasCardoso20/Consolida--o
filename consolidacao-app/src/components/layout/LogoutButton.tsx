import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type LogoutButtonProps = {
  compact?: boolean;
};

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair da conta:", error);
      setIsLoggingOut(false);
      return;
    }

    navigate("/login", { replace: true });
  }

  if (compact) {
    return (
      <button
      type="button"
       onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Menu do usuário" // Alterado para corresponder ao design system
        title="Sair da conta"
        className="ml-auto rounded-md p-1.5 text-paz-muted transition hover:bg-paz-soft hover:text-paz-primary"
        >
            <LogOut size={16} strokeWidth={2} />
          </button>        
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="ml-auto rounded-md p-1.5 text-paz-muted transition hover:bg-paz-soft hover:text-paz-primary"
    >
      <LogOut size={19} />
    </button>
  );
}