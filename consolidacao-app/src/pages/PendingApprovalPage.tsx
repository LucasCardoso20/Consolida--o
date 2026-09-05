import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type FormEvent, // <--- Adicionado: Importação do useCallback
} from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Send,
  UserRound,
  UserRoundX,
} from "lucide-react";

import { useAccess } from "../contexts/AccessContext";
import { supabase } from "../lib/supabase";

type Organization = {
  id: string;
  name: string;
};

type AccessRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

type AccessRequest = {
  id: string;
  status: AccessRequestStatus;
  organization_id: string;
  created_at: string; // Garantir que seja string
};

type UserMetadata = {
  full_name?: string;
  name?: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function PendingApprovalPage() {
  const { profile, user, refreshProfile, profileError } = useAccess();

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [request, setRequest] = useState<AccessRequest | null>(null);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isInactive = profile?.access_status === "INACTIVE";

  const userMetadata = (user?.user_metadata ?? {}) as UserMetadata;

  const displayName = useMemo(() => {
    return (
      profile?.full_name?.trim() ||
      userMetadata.full_name?.trim() ||
      userMetadata.name?.trim() ||
      "usuário"
    );
  }, [
    profile?.full_name,
    userMetadata.full_name,
    userMetadata.name,
  ]);

  useEffect(() => {
    setFullName(
      profile?.full_name ||
        userMetadata.full_name ||
        userMetadata.name ||
        "",
    );
    setEmail(profile?.email || user?.email || "");
    setPhone(profile?.phone || ""); // <--- Corrigido: 'phone' agora existe em UserProfile
    setOrganizationId(profile?.organization_id || "");

    // <--- Corrigido: Garantir que created_at seja string e propriedades existam
    setRequest(
      profile?.access_request_id && profile?.access_request_status && profile?.created_at
        ? {
            id: profile.access_request_id,
            status: profile.access_request_status,
            organization_id: profile.organization_id || "",
            created_at: profile.created_at, // 'created_at' agora é garantido como string
          }
        : null,
    );
  }, [
    profile?.access_request_id,
    profile?.access_request_status,
    profile?.created_at,
    profile?.email,
    profile?.full_name,
    profile?.organization_id,
    profile?.phone, // <--- Adicionado à lista de dependências
    user?.email,
    userMetadata.full_name,
    userMetadata.name,
  ]);

  const handlePhoneChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(event.target.value);
    setPhone(formatted);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setIsLoadingData(true);

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });

      if (isMounted) {
        if (error) {
          console.error("Erro ao carregar organizações:", error);
          setOrganizations([]);
        } else {
          setOrganizations(data || []);
        }
        setIsLoadingData(false);
      }
    }

    void loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);
    setFormSuccess(null);

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.replace(/\D/g, "").trim();

    if (!normalizedName) {
      setFormError("Informe seu nome completo.");
      return;
    }

    if (!normalizedEmail) {
      setFormError("Informe seu e-mail.");
      return;
    }

    if (!normalizedPhone) {
      setFormError("Informe seu telefone.");
      return;
    }

    if (!organizationId) {
      setFormError("Selecione a igreja da qual você faz parte.");
      return;
    }

    setIsSubmitting(true);

    /*
     * Esta RPC precisa existir no Supabase com estes parâmetros:
     *
     * submit_access_request_by_organization(
     *   p_organization_id uuid,
     *   p_full_name text,
     *   p_email text,
     *   p_phone text
     * )
     */
    const { data, error } = await supabase.rpc(
      "submit_access_request_by_organization",
      {
        p_organization_id: organizationId,
        p_full_name: normalizedName,
        p_email: normalizedEmail,
        p_phone: normalizedPhone,
      },
    );

    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao solicitar acesso:", error);

      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("solicitação pendente") ||
        errorMessage.includes("solicitacao pendente") ||
        errorMessage.includes("duplicate key")
      ) {
        setFormError(
          "Já existe uma solicitação de acesso pendente para esta conta.",
        );
        return;
      }

      if (
        errorMessage.includes("igreja selecionada") ||
        errorMessage.includes("organização") ||
        errorMessage.includes("organizacao")
      ) {
        setFormError(
          "A igreja selecionada não está disponível no momento.",
        );
        return;
      }

      setFormError(
        "Não foi possível enviar sua solicitação agora. Tente novamente em instantes.",
      );
      return;
    }

    setRequest({
      id: String(data),
      status: "PENDING",
      organization_id: organizationId,
      created_at: new Date().toISOString(),
    });

    setFormSuccess(
      "Solicitação enviada com sucesso. Aguarde a aprovação de um Master.",
    );

    await refreshProfile();
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair da conta:", error);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paz-background px-4 py-8 sm:px-6">
      <section className="w-full max-w-xl rounded-xl border border-paz-border bg-white p-6 shadow-xl shadow-paz-primary/5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
              isInactive
                ? "bg-paz-warning/10 text-paz-warning"
                : "bg-paz-soft text-paz-primary"
            }`}
          >
            {isInactive ? <UserRoundX size={24} /> : <Clock3 size={24} />}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-paz-muted transition hover:bg-paz-error/10 hover:text-paz-error"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-paz-primary">
            Controle de acesso
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-paz-text sm:text-3xl">
            {isInactive
              ? "Seu acesso está desativado"
              : request
                ? "Sua solicitação está em análise"
                : "Solicite seu acesso"}
          </h1>

          <p className="mt-3 leading-relaxed text-paz-muted">
            Olá, {displayName}! Para acessar o sistema, precisamos que você
            preencha alguns dados e solicite o acesso à sua igreja.
          </p>
        </div>

        {profileError && (
          <div className="mt-6 rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm font-medium text-paz-error">
            <p>{profileError}</p>
          </div>
        )}

        {isInactive && (
          <div className="mt-6 rounded-xl border border-paz-warning bg-paz-warning/10 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole size={21} className="mt-0.5 shrink-0 text-paz-warning" />

              <div>
                <h2 className="font-bold text-paz-text">Acesso desativado</h2>

                <p className="mt-1 text-sm leading-relaxed text-paz-muted">
                  Sua conta foi desativada por um Master. Entre em contato com
                  a liderança da sua igreja para mais informações.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoadingData ? (
          <div className="mt-6 flex min-h-32 items-center justify-center gap-3 rounded-xl bg-paz-soft px-5 py-8 text-sm font-semibold text-paz-muted">
            <LoaderCircle size={20} className="animate-spin text-paz-primary" />
            Carregando informações...
          </div>
        ) : request ? (
          <div className="mt-6 rounded-xl border border-paz-success bg-paz-success/10 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={21}
                className="mt-0.5 shrink-0 text-paz-success"
              />

              <div>
                <h2 className="font-bold text-paz-text">
                  Solicitação enviada com sucesso
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-paz-muted">
                  Um Master analisará seus dados, definirá seu perfil e
                  liberará o acesso quando apropriado.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-paz-text"
              >
                <UserRound size={16} className="text-paz-primary" />
                Nome completo
              </label>

              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFullName(event.target.value)
                }
                placeholder="Ex.: Juliana Vicente"
                autoComplete="name"
                className="w-full rounded-xl border border-paz-border bg-white px-4 py-3 text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-paz-text"
              >
                <Mail size={16} className="text-paz-primary" />
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEmail(event.target.value)
                }
                placeholder="voce@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-paz-border bg-white px-4 py-3 text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-paz-text"
              >
                <Phone size={16} className="text-paz-primary" />
                Telefone
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(41) 99999-9999"
                autoComplete="tel"
                inputMode="numeric"
                className="w-full rounded-xl border border-paz-border bg-white px-4 py-3 text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
              />
            </div>

            <div>
              <label
                htmlFor="organization"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-paz-text"
              >
                <Building2 size={16} className="text-paz-primary" />
                Igreja
              </label>

              <select
                id="organization"
                value={organizationId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setOrganizationId(event.target.value)
                }
                disabled={isLoadingData || isSubmitting}
                className="w-full rounded-xl border border-paz-border bg-white px-4 py-3 text-paz-text outline-none transition focus:border-paz-primary focus:ring-4 focus:ring-paz-soft disabled:cursor-not-allowed disabled:bg-paz-soft disabled:text-paz-muted"
              >
                <option value="">
                  {isLoadingData
                    ? "Carregando igrejas..."
                    : "Selecione a sua igreja"}
                </option>

                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>

              {organizations.length === 0 ? (
                <p className="mt-2 text-xs font-medium text-paz-warning">
                  Nenhuma igreja está disponível para seleção no momento.
                </p>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-paz-muted">
                  A seleção da igreja envia uma solicitação. Seu acesso será
                  liberado somente após aprovação de um Master.
                </p>
              )}
            </div>

            {formError ? (
              <div
                role="alert"
                className="rounded-xl border border-paz-error bg-paz-error/10 px-4 py-3 text-sm font-medium text-paz-error"
              >
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="rounded-xl border border-paz-success bg-paz-success/10 px-4 py-3 text-sm font-medium text-paz-success">
                {formSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingData ||
                organizations.length === 0
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 font-bold text-white transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Enviando solicitação...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Solicitar acesso
                </>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}