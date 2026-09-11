// Certifique-se de que o useAccess está disponível no contexto onde LeaderSelect é usado
// Ex: src/components/LeaderSelect.tsx (ou onde quer que este componente esteja)

import { ChevronDown, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase"; // Supabase client for database interaction
import { useAccess } from "../../contexts/AccessContext";

type LeaderRole = "MASTER" | "LEADER";

type LeaderOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: LeaderRole;
};

type LeaderSelectProps = {
  value: string;
  onChange: (leaderId: string) => void;
  disabled?: boolean;
  error?: string | null;
  // Nova prop para indicar se o LeaderSelect está sendo usado em um formulário de adição
  // onde o responsável deve ser preenchido automaticamente para não-Masters.
  // Isso é útil para diferenciar do disabled geral.
  isAddingVisitor?: boolean;
};

function getRoleLabel(role: LeaderRole) {
  return role === "MASTER" ? "Master" : "Líder";
}

export function LeaderSelect({
  value,
  onChange,
  disabled = false,
  error = null,
  isAddingVisitor = false, // Valor padrão para a nova prop
}: LeaderSelectProps) {
  const { profile } = useAccess(); // Obter o perfil do usuário logado
  const isMaster = profile?.role === "MASTER";

  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Determina se o campo deve ser desabilitado
  const shouldBeDisabled =
    disabled || isLoading || leaders.length === 0 || (!isMaster && isAddingVisitor);

  // Efeito para carregar os líderes
  useEffect(() => {
    let isMounted = true;

    async function loadLeaders() {
      setIsLoading(true);
      setLoadError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "get_available_responsible_leaders",
      );

      if (!isMounted) {
        return;
      }

      if (rpcError) {
        console.error("Erro ao carregar líderes responsáveis:", rpcError);

        setLeaders([]);
        setLoadError(
          "Não foi possível carregar os líderes disponíveis para este visitante.",
        );
      } else {
        setLeaders((data ?? []) as LeaderOption[]);
      }

      setIsLoading(false);
    }

    void loadLeaders();

    return () => {
      isMounted = false;
    };
  }, []);

  // Efeito para preencher automaticamente o ID do líder se não for Master e estiver adicionando visitante
  useEffect(() => {
    if (!isMaster && isAddingVisitor && profile?.id && value !== profile.id) {
      onChange(profile.id);
    }
  }, [isMaster, isAddingVisitor, profile?.id, value, onChange]);

  const message = error ?? loadError;

  return (
    <div>
      <label
        htmlFor="responsible_leader_id"
        className="mb-2 block text-sm font-bold text-paz-text"
      >
        Responsável
      </label>

      <div className="relative">
        <ShieldCheck
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paz-primary"
        />

        <select
          id="responsible_leader_id"
          name="responsible_leader_id"
          value={value}
          required
          disabled={shouldBeDisabled} // Usar a variável shouldBeDisabled
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-paz-border bg-white py-3 pl-10 pr-10 text-sm font-medium text-paz-text outline-none transition focus:border-paz-primary focus:ring-4 focus:ring-paz-soft disabled:cursor-not-allowed disabled:bg-paz-soft disabled:text-paz-muted"
        >
          <option value="">
            {isLoading
              ? "Carregando líderes..."
              : leaders.length === 0
                ? "Nenhum responsável ativo encontrado"
                : "Selecione o responsável"}
          </option>

          {leaders.map((leader) => (
            <option key={leader.id} value={leader.id}>
              {leader.full_name || "Nome não informado"} —{" "}
              {getRoleLabel(leader.role)}
            </option>
          ))}
        </select>

        {isLoading ? (
          <LoaderCircle
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-paz-muted"
          />
        ) : (
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paz-muted"
          />
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-paz-muted">
        A pessoa selecionada será responsável pelo acompanhamento deste
        visitante.
      </p>

      {message ? (
        <p className="mt-2 text-sm font-medium text-paz-error">{message}</p>
      ) : null}
    </div>
  );
}