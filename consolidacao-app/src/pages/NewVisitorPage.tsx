import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { createVisitor, getCells } from "../lib/visitors";
import type { Cell } from "../types/visitor";
import type { ReactNode } from "react";
import { LeaderSelect } from "../components/visitors/LeaderSelect";
const visitorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome completo do visitante.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),

  phone: z.string().trim().max(20, "Telefone inválido.").optional(),
address: z
  .string()
  .trim()
  .max(250, "O endereço pode ter no máximo 250 caracteres.")
  .optional(),
  invitedBy: z
    .string()
    .trim()
    .max(120, "O nome pode ter no máximo 120 caracteres.")
    .optional(),

  cellId: z.string().optional(),

  visitDate: z.string().min(1, "Informe a data da visita."),

  notes: z
    .string()
    .trim()
    .max(1000, "As observações podem ter no máximo 1000 caracteres.")
    .optional(),

  receivedAtService: z.boolean(),
  receivedGift: z.boolean(),
  phoneConfirmed: z.boolean(),
});

type VisitorFormData = z.infer<typeof visitorSchema>;

function getTodayDate() {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function NewVisitorPage() {
  const navigate = useNavigate();
  const [cells, setCells] = useState<Cell[]>([]);
  const [loadingCells, setLoadingCells] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [responsibleLeaderId, setResponsibleLeaderId] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VisitorFormData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      invitedBy: "",
      cellId: "",
      visitDate: getTodayDate(),
      notes: "",
      receivedAtService: true,
      receivedGift: false,
      phoneConfirmed: false,
    },
  });

  useEffect(() => {
    async function loadCells() {
      try {
        const loadedCells = await getCells();
        setCells(loadedCells);
      } catch {
        setServerError("Não foi possível carregar as células cadastradas.");
      } finally {
        setLoadingCells(false);
      }
    }

    void loadCells();
  }, []);

  async function onSubmit(data: VisitorFormData) {
  setServerError(null);

  // O LeaderSelect usa o state responsibleLeaderId.
  // Portanto, validamos esse valor antes de salvar.
  if (!responsibleLeaderId) {
    setServerError("Selecione o líder responsável pelo visitante.");
    return;
  }

  try {
    await createVisitor({
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      invitedBy: data.invitedBy || null,
      cellId: data.cellId || null,
      visitDate: data.visitDate,
      notes: data.notes || null,
      receivedAtService: data.receivedAtService,
      receivedGift: data.receivedGift,
      phoneConfirmed: data.phoneConfirmed,

      // NOVO CAMPO:
      responsibleLeaderId: responsibleLeaderId,
    });

    // Limpa o líder selecionado antes de sair da página.
    setResponsibleLeaderId("");

    navigate("/visitantes");
  } catch (error) {
    setServerError(
      error instanceof Error
        ? error.message
        : "Não foi possível salvar o visitante.",
    );
  }
}

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to="/visitantes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft size={18} />
          Voltar para visitantes
        </Link>

        <p className="mt-5 text-sm font-semibold text-brand-700">
          Novo cadastro
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Cadastrar visitante
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Registre os dados principais para que ninguém fique sem acompanhamento.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="space-y-5">
          <FormField label="Nome completo" required error={errors.name?.message}>
            <input
              {...register("name")}
              autoFocus
              autoComplete="name"
              placeholder="Ex.: Ana Beatriz Silva"
              className={inputClassName(Boolean(errors.name))}
            />
          </FormField>

         <div className="grid gap-5 sm:grid-cols-2">
  <FormField label="Telefone / WhatsApp" error={errors.phone?.message}>
    <input
      {...register("phone")}
      inputMode="tel"
      autoComplete="tel"
      placeholder="(11) 99999-9999"
      className={inputClassName(Boolean(errors.phone))}
    />
  </FormField>

  <FormField label="Data da visita" required error={errors.visitDate?.message}>
    <input
      {...register("visitDate")}
      type="date"
      className={inputClassName(Boolean(errors.visitDate))}
    />
  </FormField>

  <FormField label="Endereço" error={errors.address?.message}>
    <input
      {...register("address")}
      autoComplete="street-address"
      placeholder="Ex.: Rua das Flores, 123 — Bairro Centro"
      className={inputClassName(Boolean(errors.address))}
    />
  </FormField>
</div>

<LeaderSelect
  value={responsibleLeaderId}
  onChange={setResponsibleLeaderId}
  disabled={isSubmitting}
/>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Convidado por" error={errors.invitedBy?.message}>
              <input
                {...register("invitedBy")}
                placeholder="Ex.: Maria Silva"
                className={inputClassName(Boolean(errors.invitedBy))}
              />
            </FormField>

            <FormField label="Célula">
              <select
                {...register("cellId")}
                disabled={loadingCells}
                className={inputClassName(false)}
              >
                <option value="">
                  {loadingCells
                    ? "Carregando células..."
                    : "Não vincular a uma célula agora"}
                </option>

                {cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}
                    {cell.leaderName ? ` — ${cell.leaderName}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Observações" error={errors.notes?.message}>
            <textarea
              {...register("notes")}
              rows={4}
              placeholder="Ex.: Veio pela primeira vez, mora próximo à igreja..."
              className={`${inputClassName(Boolean(errors.notes))} resize-y`}
            />
          </FormField>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">Recepção no culto</h3>
              <p className="mt-1 text-sm text-slate-500">
                Marque as etapas que já foram realizadas.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <CheckboxField
              id="receivedAtService"
              label="Foi recebido no culto"
              description="A pessoa foi acolhida pela equipe."
              registration={register("receivedAtService")}
            />

            <CheckboxField
              id="receivedGift"
              label="Recebeu lembrancinha"
              description="A lembrança de boas-vindas foi entregue."
              registration={register("receivedGift")}
            />

            <CheckboxField
              id="phoneConfirmed"
              label="Telefone confirmado"
              description="O número informado foi confirmado com o visitante."
              registration={register("phoneConfirmed")}
            />
          </div>
        </div>

        {serverError && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {serverError}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <Link
            to="/visitantes"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar visitante
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
};

function FormField({ label, children, required = false, error }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}

      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

type CheckboxFieldProps = {
  id: string;
  label: string;
  description: string;
  registration: UseFormRegisterReturn;
};

function CheckboxField({
  id,
  label,
  description,
  registration,
}: CheckboxFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <input
        id={id}
        type="checkbox"
        {...registration}
        className="mt-0.5 size-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />

      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function inputClassName(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
  }`;
}