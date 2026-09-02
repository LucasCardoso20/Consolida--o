import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
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
  created_at: string;
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
  }, [
    profile?.email,
    profile?.full_name,
    user?.email,
    userMetadata.full_name,
    userMetadata.name,
  ]);

  useEffect(() => {
    async function loadPendingAccessData() {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);

      /*
       * Esta RPC retorna somente id e name das igrejas disponíveis
       * para solicitação de acesso.
       */
      const organizationsResult = await supabase.rpc(
        "list_available_organizations",
      );

      /*
       * A policy RLS permite que o usuário veja apenas a própria
       * solicitação de acesso.
       */
      const requestResult = await supabase
        .from("access_requests")
        .select("id, status, created_at, organization_id")
        .eq("requester_id", user.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (organizationsResult.error) {
        console.error(
          "Erro ao carregar igrejas disponíveis:",
          organizationsResult.error,
        );
        setOrganizations([]);
      } else {
        const availableOrganizations = (organizationsResult.data ??
          []) as unknown as Organization[];

        setOrganizations(availableOrganizations);

        /*
         * Se houver somente uma igreja — como Paz Church - Curitiba —
         * ela é selecionada automaticamente.
         */
        if (availableOrganizations.length === 1) {
          setOrganizationId(availableOrganizations[0].id);
        }
      }

      if (requestResult.error) {
        console.error(
          "Erro ao carregar solicitação de acesso:",
          requestResult.error,
        );
        setRequest(null);
      } else {
        const pendingRequest = requestResult.data
          ? ({
              id: requestResult.data.id,
              status: requestResult.data.status as AccessRequestStatus,
              organization_id: requestResult.data.organization_id,
              created_at: requestResult.data.created_at,
            } satisfies AccessRequest)
          : null;

        setRequest(pendingRequest);
      }

      setIsLoadingData(false);
    }

    void loadPendingAccessData();
  }, [user]);

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isInactive) {
      return;
    }

    setFormError(null);
    setFormSuccess(null);

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
              isInactive
                ? "bg-amber-100 text-amber-700"
                : "bg-brand-50 text-brand-700"
            }`}
          >
            {isInactive ? <UserRoundX size={24} /> : <Clock3 size={24} />}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
            Controle de acesso
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isInactive
              ? "Seu acesso está desativado"
              : request
                ? "Sua solicitação está em análise"
                : "Solicite seu acesso"}
          </h1>

          <p className="mt-3 leading-relaxed text-slate-600">
            Olá, <strong>{displayName}</strong>.{" "}
            {isInactive
              ? "O acesso desta conta foi desativado por um responsável. Procure a liderança da sua igreja para regularizar a situação."
              : request
                ? "A sua solicitação foi enviada para a igreja selecionada e aguarda análise de um Master."
                : "Preencha seus dados e selecione a igreja para solicitar acesso ao sistema."}
          </p>
        </div>

        {profileError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
            <strong>Não foi possível validar seu perfil.</strong>

            <p className="mt-1">{profileError}</p>
          </div>
        ) : null}

        {isInactive ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <h2 className="font-bold text-amber-900">
                  Acesso indisponível
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  Enquanto esta conta estiver inativa, ela não poderá
                  visualizar ou alterar visitantes, células e acompanhamentos.
                </p>
              </div>
            </div>
          </div>
        ) : isLoadingData ? (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-slate-50 px-5 py-8 text-sm font-semibold text-slate-500">
            <LoaderCircle size={20} className="animate-spin text-brand-700" />
            Carregando informações...
          </div>
        ) : request ? (
          <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={21}
                className="mt-0.5 shrink-0 text-brand-700"
              />

              <div>
                <h2 className="font-bold text-brand-900">
                  Solicitação enviada com sucesso
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-brand-800">
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
                className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"
              >
                <UserRound size={16} className="text-brand-700" />
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"
              >
                <Mail size={16} className="text-brand-700" />
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"
              >
                <Phone size={16} className="text-brand-700" />
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="organization"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"
              >
                <Building2 size={16} className="text-brand-700" />
                Igreja
              </label>

              <select
                id="organization"
                value={organizationId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setOrganizationId(event.target.value)
                }
                disabled={isLoadingData || isSubmitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Nenhuma igreja está disponível para seleção no momento.
                </p>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  A seleção da igreja envia uma solicitação. Seu acesso será
                  liberado somente após aprovação de um Master.
                </p>
              )}
            </div>

            {formError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
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