import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardPlus,
  Edit3,
  LoaderCircle,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Save,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";

import {
  getCells,
  getVisitorById,
  updateVisitor,
  updateVisitorProgress,
} from "../lib/visitors";
import {
  createVisitorInteraction,
  getVisitorInteractions,
  type InteractionType,
  type VisitorInteraction,
} from "../lib/visitorInteractions";
import type { Cell, Visitor } from "../types/visitor";
import { LeaderSelect } from "../components/visitors/LeaderSelect";

const visitorEditSchema = z.object({
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
    .max(1000, "As observações podem ter no máximo 1.000 caracteres.")
    .optional(),
    followUpOwnerName: z
  .string()
  .trim()
  .max(120, "O nome do responsável pode ter no máximo 120 caracteres.")
  .optional(),

nextContactDate: z.string().optional(),

nextAction: z
  .string()
  .trim()
  .max(500, "A próxima ação pode ter no máximo 500 caracteres.")
  .optional(),
});

type VisitorEditFormData = z.infer<typeof visitorEditSchema>;
const interactionSchema = z.object({
  interactionDate: z.string().min(1, "Informe a data do contato."),

  interactionType: z.enum([
    "WHATSAPP",
    "PHONE_CALL",
    "IN_PERSON",
    "CELL_VISIT",
    "OTHER",
  ]),

  notes: z
    .string()
    .trim()
    .min(3, "Descreva o resultado ou a observação do contato.")
    .max(1000, "O registro pode ter no máximo 1.000 caracteres."),

  nextStep: z
    .string()
    .trim()
    .max(500, "O próximo passo pode ter no máximo 500 caracteres.")
    .optional(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

const interactionTypeLabels: Record<InteractionType, string> = {
  WHATSAPP: "WhatsApp",
  PHONE_CALL: "Ligação",
  IN_PERSON: "Conversa presencial",
  CELL_VISIT: "Visita à célula",
  OTHER: "Outro",
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
function getDateStatus(date: string | null) {
  if (!date) {
    return "none" as const;
  }

  const today = getTodayDate();

  if (date < today) {
    return "overdue" as const;
  }

  if (date === today) {
    return "today" as const;
  }

  return "upcoming" as const;
}

function getNextContactStatusLabel(date: string | null) {
  const status = getDateStatus(date);

  if (status === "overdue") {
    return "Contato atrasado";
  }

  if (status === "today") {
    return "Contato previsto para hoje";
  }

  if (status === "upcoming") {
    return "Contato agendado";
  }

  return "Sem data definida";
}
type ProgressKey =
  | "receivedAtService"
  | "receivedGift"
  | "phoneConfirmed"
  | "firstContactMade"
  | "invitedToCell"
  | "attendedCell"
  | "followUpCompleted";

const progressItems: {
  key: ProgressKey;
  label: string;
  description: string;
}[] = [
  {
    key: "receivedAtService",
    label: "Foi recebido no culto",
    description: "A pessoa foi acolhida pela equipe.",
  },
  {
    key: "receivedGift",
    label: "Recebeu lembrancinha",
    description: "A lembrança de boas-vindas foi entregue.",
  },
  {
    key: "phoneConfirmed",
    label: "Telefone confirmado",
    description: "O número informado foi confirmado.",
  },
  {
    key: "firstContactMade",
    label: "Primeiro contato realizado",
    description: "A equipe entrou em contato após a visita.",
  },
  {
    key: "invitedToCell",
    label: "Convidado para célula",
    description: "Recebeu um convite para participar de uma célula.",
  },
  {
    key: "attendedCell",
    label: "Compareceu à célula",
    description: "A visita à célula foi registrada.",
  },
  {
    key: "followUpCompleted",
    label: "Acompanhamento concluído",
    description: "O processo inicial de consolidação foi finalizado.",
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getWhatsAppUrl(phone: string, name: string) {
  const normalizedPhone = phone.replace(/\D/g, "");

  const phoneWithCountryCode = normalizedPhone.startsWith("55")
    ? normalizedPhone
    : `55${normalizedPhone}`;

  const message = encodeURIComponent(
    `Olá, ${name}! Foi muito bom receber você em nosso culto. Estamos felizes por ter você conosco!`,
  );

  return `https://wa.me/${phoneWithCountryCode}?text=${message}`;
}

export function VisitorDetailsPage() {
  const { visitorId } = useParams();

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCells, setIsLoadingCells] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<ProgressKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
const [interactions, setInteractions] = useState<VisitorInteraction[]>([]);
const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
const [interactionError, setInteractionError] = useState<string | null>(null);
const [responsibleLeaderId, setResponsibleLeaderId] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VisitorEditFormData>({
    resolver: zodResolver(visitorEditSchema),
   defaultValues: {
  name: "",
  phone: "",
  address: "",
  invitedBy: "",
  cellId: "",
  visitDate: "",
  notes: "",
  followUpOwnerName: "",
  nextContactDate: "",
  nextAction: "",
},
  });

  const {
  register: registerInteraction,
  handleSubmit: handleSubmitInteraction,
  reset: resetInteraction,
  formState: {
    errors: interactionErrors,
    isSubmitting: isSubmittingInteraction,
  },
} = useForm<InteractionFormData>({
  resolver: zodResolver(interactionSchema),
  defaultValues: {
    interactionDate: getTodayDate(),
    interactionType: "WHATSAPP",
    notes: "",
    nextStep: "",
  },
});

  useEffect(() => {
    async function loadVisitor() {
      if (!visitorId) {
        setError("Identificador do visitante inválido.");
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        const loadedVisitor = await getVisitorById(visitorId);
        setVisitor(loadedVisitor);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar o visitante.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadVisitor();
  }, [visitorId]);
useEffect(() => {
  async function loadInteractions() {
    if (!visitorId) {
      setIsLoadingInteractions(false);
      return;
    }

    try {
      setInteractionError(null);

      const loadedInteractions = await getVisitorInteractions(visitorId);
      setInteractions(loadedInteractions);
    } catch (loadError) {
      setInteractionError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o histórico de contatos.",
      );
    } finally {
      setIsLoadingInteractions(false);
    }
  }

  void loadInteractions();
}, [visitorId]);
  async function openEditModal() {
    if (!visitor) {
      return;
    }

    setFormError(null);
    
    setIsLoadingCells(true);
setResponsibleLeaderId(visitor.responsibleLeaderId);
    reset({
  name: visitor.name,
  phone: visitor.phone ?? "",
  address: visitor.address ?? "",
  invitedBy: visitor.invitedBy ?? "",
  cellId: visitor.cellId ?? "",
  visitDate: visitor.visitDate,
  notes: visitor.notes ?? "",

  followUpOwnerName: visitor.followUpOwnerName ?? "",
  nextContactDate: visitor.nextContactDate ?? "",
  nextAction: visitor.nextAction ?? "",
});

    setIsEditModalOpen(true);

    try {
      const loadedCells = await getCells();
      setCells(loadedCells);
    } catch (loadError) {
      setFormError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as células.",
      );
    } finally {
      setIsLoadingCells(false);
    }
  }

  function closeEditModal() {
    if (isSubmitting) {
      return;
    }

    setIsEditModalOpen(false);
    setFormError(null);
  }

  async function onSubmitEdit(data: VisitorEditFormData) {
    if (!visitor) {
      return;
    }

    setFormError(null);
if (!responsibleLeaderId) {
  setFormError("Selecione o responsável pelo visitante.");
  return;
}
    try {
      const updatedVisitor = await updateVisitor(visitor.id, {
  name: data.name,
  phone: data.phone || null,
  address: data.address || null,
  invitedBy: data.invitedBy || null,
  cellId: data.cellId || null,
  visitDate: data.visitDate,
  notes: data.notes || null,
responsibleLeaderId,
  followUpOwnerName: visitor.followUpOwnerName,
  nextContactDate: visitor.nextContactDate,
  nextAction: visitor.nextAction,
});

      setVisitor(updatedVisitor);
      setIsEditModalOpen(false);
    } catch (updateError) {
      setFormError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar os dados do visitante.",
      );
    }
  }

  async function toggleProgress(key: ProgressKey) {
    if (!visitor || savingKey) {
      return;
    }

    setSavingKey(key);
    setError(null);

    const nextVisitor = {
      ...visitor,
      [key]: !visitor[key],
    };

    try {
      const updatedVisitor = await updateVisitorProgress(nextVisitor);
      setVisitor(updatedVisitor);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o acompanhamento.",
      );
    } finally {
      setSavingKey(null);
    }
  }
function openInteractionModal() {
  setInteractionError(null);

  resetInteraction({
    interactionDate: getTodayDate(),
    interactionType: "WHATSAPP",
    notes: "",
    nextStep: "",
  });

  setIsInteractionModalOpen(true);
}

function closeInteractionModal() {
  if (isSubmittingInteraction) {
    return;
  }

  setIsInteractionModalOpen(false);
}

async function onSubmitInteraction(data: InteractionFormData) {
  if (!visitor) {
    return;
  }

  setInteractionError(null);

  try {
    const createdInteraction = await createVisitorInteraction({
      visitorId: visitor.id,
      interactionDate: data.interactionDate,
      interactionType: data.interactionType,
      notes: data.notes,
      nextStep: data.nextStep || null,
    });

    setInteractions((currentInteractions) => [
      createdInteraction,
      ...currentInteractions,
    ]);

    setIsInteractionModalOpen(false);
  } catch (createError) {
    setInteractionError(
      createError instanceof Error
        ? createError.message
        : "Não foi possível registrar o contato.",
    );
  }
}
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle className="animate-spin text-brand-600" size={30} />
      </div>
    );
  }

  if (!visitor) {
    return (
      <section className="mx-auto max-w-2xl">
        <Link
          to="/visitantes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft size={18} />
          Voltar para visitantes
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error ?? "Visitante não encontrado."}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <Link
        to="/visitantes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={18} />
        Voltar para visitantes
      </Link>

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <UserRound size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-700">Visitante</p>

            <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
              {visitor.name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Visitou em {formatDate(visitor.visitDate)}
              {visitor.cellName ? ` • ${visitor.cellName}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void openEditModal()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Edit3 size={15} />
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>

        <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
          {visitor.phone && (
            <a
              href={`tel:${visitor.phone}`}
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Phone size={18} className="text-brand-700" />
              {visitor.phone}
            </a>
          )}

          {visitor.phone && (
            <a
              href={getWhatsAppUrl(visitor.phone, visitor.name)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
            >
              <MessageCircle size={18} />
              Conversar no WhatsApp
            </a>
          )}

          {visitor.address && (
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-700" />

              <div>
                <p className="font-semibold">Endereço</p>
                <p className="mt-0.5 whitespace-pre-line text-slate-600">
                  {visitor.address}
                </p>
              </div>
            </div>
          )}
        </div>

        {(visitor.invitedBy || visitor.notes) && (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            {visitor.invitedBy && (
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                  Convidado por
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {visitor.invitedBy}
                </p>
              </div>
            )}

            {visitor.notes && (
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                  Observações
                </p>

                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {visitor.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </article>
      {(() => {
  const nextContactStatus = getDateStatus(visitor.nextContactDate);

  const containerClassName = {
    overdue: "border-red-200 bg-red-50",
    today: "border-amber-200 bg-amber-50",
    upcoming: "border-brand-200 bg-brand-50",
    none: "border-slate-200 bg-white",
  }[nextContactStatus];

  const iconClassName = {
    overdue: "bg-red-100 text-red-700",
    today: "bg-amber-100 text-amber-700",
    upcoming: "bg-brand-100 text-brand-700",
    none: "bg-slate-100 text-slate-600",
  }[nextContactStatus];

  const badgeClassName = {
    overdue: "bg-red-100 text-red-800",
    today: "bg-amber-100 text-amber-800",
    upcoming: "bg-brand-100 text-brand-800",
    none: "bg-slate-100 text-slate-600",
  }[nextContactStatus];

  return (
    <section
      className={`mt-6 rounded-2xl border p-5 shadow-sm sm:p-6 ${containerClassName}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            {nextContactStatus === "overdue" ? (
              <AlertTriangle size={21} />
            ) : (
              <CalendarClock size={21} />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Próximo acompanhamento
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {visitor.nextAction ?? "Nenhuma próxima ação definida"}
            </h3>
          </div>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${badgeClassName}`}
        >
          {getNextContactStatusLabel(visitor.nextContactDate)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-200/70 pt-5 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700">
          <UserCheck size={18} className="mt-0.5 shrink-0 text-brand-700" />

          <div>
  <p className="font-semibold">Responsável pelo acompanhamento</p>
  <p className="mt-0.5 text-slate-600">
    {visitor.responsibleLeader?.fullName ?? "Ainda não definido"}
  </p>
</div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-white/70 p-3 text-sm text-slate-700">
          <CalendarDays
            size={18}
            className="mt-0.5 shrink-0 text-brand-700"
          />

          <div>
            <p className="font-semibold">Data do próximo contato</p>
            <p className="mt-0.5 text-slate-600">
              {visitor.nextContactDate
                ? formatDate(visitor.nextContactDate)
                : "Ainda não definida"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
})()}
<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <MessageSquareText size={20} />
      </div>

      <div>
        <h3 className="font-bold text-slate-900">
          Histórico de acompanhamento
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registre contatos, retornos e os próximos passos do visitante.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={openInteractionModal}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
    >
      <ClipboardPlus size={18} />
      Registrar contato
    </button>
  </div>

  {interactionError && !isInteractionModalOpen && (
    <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
      {interactionError}
    </p>
  )}

  {isLoadingInteractions ? (
    <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-slate-500">
      <LoaderCircle className="animate-spin text-brand-600" size={20} />
      Carregando histórico...
    </div>
  ) : interactions.length === 0 ? (
    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <CalendarDays className="mx-auto text-slate-300" size={32} />

      <p className="mt-3 font-semibold text-slate-700">
        Nenhum contato registrado ainda
      </p>

      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
        Registre o primeiro contato para que toda a equipe acompanhe o cuidado
        com este visitante.
      </p>
    </div>
  ) : (
    <div className="mt-6 space-y-4 border-l-2 border-brand-100 pl-5">
      {interactions.map((interaction) => (
        <article
          key={interaction.id}
          className="relative rounded-xl border border-slate-200 bg-white p-4"
        >
          <span className="absolute -left-[31px] top-5 size-3 rounded-full border-2 border-white bg-brand-500" />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
                {interactionTypeLabels[interaction.interactionType]}
              </span>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {interaction.notes}
              </p>
            </div>

            <time className="shrink-0 text-xs font-semibold text-slate-400">
              {formatDate(interaction.interactionDate)}
            </time>
          </div>

          {interaction.nextStep && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-bold">Próximo passo: </span>
              {interaction.nextStep}
            </div>
          )}
        </article>
      ))}
    </div>
  )}
</section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Acompanhamento</h3>

            <p className="mt-1 text-sm text-slate-500">
              Toque em uma etapa para marcar ou desmarcar.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {progressItems.map((item) => {
            const isCompleted = visitor[item.key];
            const isSaving = savingKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                disabled={Boolean(savingKey)}
                onClick={() => void toggleProgress(item.key)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCompleted
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    isCompleted
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSaving ? (
                    <LoaderCircle className="animate-spin" size={13} />
                  ) : (
                    isCompleted && <Check size={14} strokeWidth={3} />
                  )}
                </span>

                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    {item.label}
                  </span>

                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:justify-center sm:p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-visitor-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-700">
                  Atualização de cadastro
                </p>

                <h3
                  id="edit-visitor-title"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-900"
                >
                  Editar visitante
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Atualize os dados para manter o acompanhamento organizado.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSubmitting}
                aria-label="Fechar"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmitEdit)}
              className="mt-7 space-y-5"
            >
              <FormField
                label="Nome completo"
                required
                error={errors.name?.message}
              >
                <input
                  {...register("name")}
                  autoFocus
                  autoComplete="name"
                  placeholder="Ex.: Ana Beatriz Silva"
                  className={inputClassName(Boolean(errors.name))}
                />
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Telefone / WhatsApp"
                  error={errors.phone?.message}
                >
                  <input
                    {...register("phone")}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    className={inputClassName(Boolean(errors.phone))}
                  />
                </FormField>

                <FormField
                  label="Data da visita"
                  required
                  error={errors.visitDate?.message}
                >
                  <input
                    {...register("visitDate")}
                    type="date"
                    className={inputClassName(Boolean(errors.visitDate))}
                  />
                </FormField>
              </div>

              <FormField label="Endereço" error={errors.address?.message}>
                <input
                  {...register("address")}
                  autoComplete="street-address"
                  placeholder="Ex.: Rua das Flores, 123 — Bairro Centro"
                  className={inputClassName(Boolean(errors.address))}
                />
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <LeaderSelect
                    value={responsibleLeaderId}
                    onChange={setResponsibleLeaderId}
                    disabled={isSubmitting}
                    />
                <FormField label="Célula">
                  <select
                    {...register("cellId")}
                    disabled={isLoadingCells}
                    className={inputClassName(false)}
                  >
                    <option value="">
                      {isLoadingCells
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
            
                <div className="border-t border-slate-100 pt-5">
  <div className="flex items-start gap-3">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
      <CalendarClock size={20} />
    </div>

    <div>
      <h4 className="font-bold text-slate-900">
        Próximo acompanhamento
      </h4>

      <p className="mt-1 text-sm text-slate-500">
        Defina quem fará o acompanhamento e qual é o próximo passo.
      </p>
    </div>
  </div>

  <div className="mt-5 grid gap-5 sm:grid-cols-2">
    <FormField
      label="Responsável"
      error={errors.followUpOwnerName?.message}
    >
      <input
        {...register("followUpOwnerName")}
        autoComplete="name"
        placeholder="Ex.: Maria Silva"
        className={inputClassName(
          Boolean(errors.followUpOwnerName),
        )}
      />
    </FormField>

    <FormField
      label="Data do próximo contato"
      error={errors.nextContactDate?.message}
    >
      <input
        {...register("nextContactDate")}
        type="date"
        className={inputClassName(
          Boolean(errors.nextContactDate),
        )}
      />
    </FormField>
  </div>

  <div className="mt-5">
    <FormField
      label="Próxima ação"
      error={errors.nextAction?.message}
    >
      <textarea
        {...register("nextAction")}
        rows={3}
        placeholder="Ex.: Enviar endereço da célula e confirmar presença na quarta-feira."
        className={`${inputClassName(
          Boolean(errors.nextAction),
        )} resize-y`}
      />
    </FormField>
  </div>
</div>

              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

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
                      Salvar alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isInteractionModalOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:justify-center sm:p-4"
    role="presentation"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interaction-form-title"
      className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">
            Acompanhamento
          </p>

          <h3
            id="interaction-form-title"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900"
          >
            Registrar contato
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Registre como foi o contato e deixe claro qual será o próximo
            passo.
          </p>
        </div>

        <button
          type="button"
          onClick={closeInteractionModal}
          disabled={isSubmittingInteraction}
          aria-label="Fechar"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={handleSubmitInteraction(onSubmitInteraction)}
        className="mt-7 space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Data do contato"
            required
            error={interactionErrors.interactionDate?.message}
          >
            <input
              {...registerInteraction("interactionDate")}
              type="date"
              className={inputClassName(
                Boolean(interactionErrors.interactionDate),
              )}
            />
          </FormField>

          <FormField
            label="Tipo de contato"
            required
            error={interactionErrors.interactionType?.message}
          >
            <select
              {...registerInteraction("interactionType")}
              className={inputClassName(
                Boolean(interactionErrors.interactionType),
              )}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE_CALL">Ligação</option>
              <option value="IN_PERSON">Conversa presencial</option>
              <option value="CELL_VISIT">Visita à célula</option>
              <option value="OTHER">Outro</option>
            </select>
          </FormField>
        </div>

        <FormField
          label="Resultado ou observação"
          required
          error={interactionErrors.notes?.message}
        >
          <textarea
            {...registerInteraction("notes")}
            rows={5}
            autoFocus
            placeholder="Ex.: Enviada mensagem de boas-vindas. A pessoa respondeu agradecendo e demonstrou interesse em conhecer a célula."
            className={`${inputClassName(
              Boolean(interactionErrors.notes),
            )} resize-y`}
          />
        </FormField>

        <FormField
          label="Próximo passo"
          error={interactionErrors.nextStep?.message}
        >
          <textarea
            {...registerInteraction("nextStep")}
            rows={3}
            placeholder="Ex.: Enviar o endereço da célula e confirmar presença na quarta-feira."
            className={`${inputClassName(
              Boolean(interactionErrors.nextStep),
            )} resize-y`}
          />
        </FormField>

        {interactionError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {interactionError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeInteractionModal}
            disabled={isSubmittingInteraction}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmittingInteraction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingInteraction ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar contato
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </section>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
};

function FormField({
  label,
  children,
  required = false,
  error,
}: FormFieldProps) {
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

function inputClassName(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
  }`;
}