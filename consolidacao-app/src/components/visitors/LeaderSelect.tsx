import { ChevronDown, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

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
};

function getRoleLabel(role: LeaderRole) {
  return role === "MASTER" ? "Master" : "Líder";
}

export function LeaderSelect({
  value,
  onChange,
  disabled = false,
  error = null,
}: LeaderSelectProps) {
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const message = error ?? loadError;

  return (
    <div>
      <label
        htmlFor="responsible_leader_id"
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        Líder responsável
      </label>

      <div className="relative">
        <ShieldCheck
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-700"
        />

        <select
          id="responsible_leader_id"
          name="responsible_leader_id"
          value={value}
          required
          disabled={disabled || isLoading || leaders.length === 0}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">
            {isLoading
              ? "Carregando líderes..."
              : leaders.length === 0
                ? "Nenhum líder ativo encontrado"
                : "Selecione o líder responsável"}
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
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        ) : (
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        O líder selecionado será responsável pelo acompanhamento deste
        visitante.
      </p>

      {message ? (
        <p className="mt-2 text-sm font-medium text-red-700">{message}</p>
      ) : null}
    </div>
  );
}