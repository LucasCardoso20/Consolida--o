// src/pages/VisitorDetailsPage.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
  Phone,
  Save,
  UserCheck,
  UserRound,
  Users,
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
          : "Não foi possível atualizar o visitante.",
      );
    }
  }

  async function toggleProgress(key: ProgressKey) {
    if (!visitor) {
      return;
    }

    setSavingKey(key);
    setError(null);

    try {
      const updatedVisitor = await updateVisitorProgress({
        ...visitor,
        [key]: !visitor[key],
      });

      setVisitor(updatedVisitor);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o progresso.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  function openInteractionModal() {
    resetInteraction({
      interactionDate: getTodayDate(),
      interactionType: "WHATSAPP",
      notes: "",
      nextStep: "",
    });
    setInteractionError(null);
    setIsInteractionModalOpen(true);
  }

  function closeInteractionModal() {
    if (isSubmittingInteraction) {
      return;
    }
    setIsInteractionModalOpen(false);
    setInteractionError(null);
  }

  async function onSubmitInteraction(data: InteractionFormData) {
    if (!visitorId) {
      return;
    }

    setInteractionError(null);

    try {
      const newInteraction = await createVisitorInteraction({
        visitorId: visitorId,
        interactionDate: data.interactionDate,
        interactionType: data.interactionType,
        notes: data.notes,
        nextStep: data.nextStep || null,
      });

      setInteractions((prev) => [newInteraction, ...prev]);
      closeInteractionModal();
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-paz-border bg-white p-8 shadow-sm">
        <LoaderCircle className="animate-spin text-paz-primary" size={24} />
        <p className="text-sm font-medium text-paz-muted">
          Carregando detalhes do visitante...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm font-medium text-paz-error">
        <p>{error}</p>
        <Link
          to="/visitantes"
          className="mt-3 font-bold underline underline-offset-2 text-paz-primary hover:text-paz-hover"
        >
          Voltar para a lista de visitantes
        </Link>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="rounded-xl border border-paz-warning bg-paz-warning/10 p-4 text-sm font-medium text-paz-warning">
        <p>Visitante não encontrado.</p>
        <Link
          to="/visitantes"
          className="mt-3 font-bold underline underline-offset-2 text-paz-primary hover:text-paz-hover"
        >
          Voltar para a lista de visitantes
        </Link>
      </div>
    );
  }

  const nextContactStatus = getDateStatus(visitor.nextContactDate);

  return (
    <section>
      <div className="mb-6">
        <Link
          to="/visitantes"
          className="inline-flex items-center gap-2 text-sm font-medium text-paz-muted transition hover:text-paz-primary"
        >
          <ArrowLeft size={16} />
          Voltar para visitantes
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-paz-primary">
              Detalhes do visitante
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text sm:text-3xl">
              {visitor.name}
            </h2>

            <p className="mt-2 text-sm text-paz-muted sm:text-base">
              Acompanhe o progresso e o histórico de contatos.
            </p>
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
          >
            <Edit3 size={18} />
            Editar visitante
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Seção de Informações Principais */}
          <section className="rounded-xl border border-paz-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
                <UserRound size={20} />
              </div>

              <div>
                <h3 className="font-bold text-paz-text">Informações principais</h3>
                <p className="mt-1 text-sm text-paz-muted">Dados básicos do visitante.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-paz-text">
              <p className="flex items-center gap-2">
                <CalendarDays size={16} className="shrink-0 text-paz-muted" />
                Visitou em: {formatDate(visitor.visitDate)}
              </p>

              {visitor.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={16} className="shrink-0 text-paz-muted" />
                  {visitor.phone}
                  <a
                    href={getWhatsAppUrl(visitor.phone, visitor.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 transition hover:bg-green-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.486 5.236 3.486 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.89 9.884-.001 2.224.651 4.413 1.824 6.232l-.993 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.166-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-1.754-1.577-2.925-3.511-3.272-4.099-.346-.587-.036-.906.113-1.054.139-.139.313-.297.47-.445.157-.149.208-.298.313-.497.105-.198.052-.372-.026-.521-.079-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479c0 1.462 1.065 2.875 1.213 3.074.149.198 2.076 3.179 5.045 4.438 2.344.954 3.327.766 4.051.711.66-.05 1.758-.719 2.006-1.359.246-.639.246-1.186.172-1.359z" />
                    </svg>
                    WhatsApp
                  </a>
                </p>
              )}

              {visitor.address && (
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="shrink-0 text-paz-muted" />
                  {visitor.address}
                </p>
              )}

              {visitor.invitedBy && (
                <p className="flex items-center gap-2">
                  <Users size={16} className="shrink-0 text-paz-muted" />
                  Convidado por: {visitor.invitedBy}
                </p>
              )}

              {visitor.cellName && (
                <p className="flex items-center gap-2">
                  <Users size={16} className="shrink-0 text-paz-muted" />
                  Célula: {visitor.cellName}
                </p>
              )}

              {visitor.responsibleLeader?.fullName && (
                <p className="flex items-center gap-2">
                  <UserCheck size={16} className="shrink-0 text-paz-muted" />
                  Responsável: {visitor.responsibleLeader.fullName}
                </p>
              )}

              {visitor.notes && (
                <div className="rounded-xl border border-paz-border bg-paz-soft p-3 text-sm leading-relaxed text-paz-text">
                  <span className="font-bold">Observações: </span>
                  {visitor.notes}
                </div>
              )}
            </div>
          </section>

          {/* Seção de Próximo Contato */}
          <section className="mt-6 rounded-xl border border-paz-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
                <CalendarClock size={20} />
              </div>

              <div>
                <h3 className="font-bold text-paz-text">Próximo contato</h3>
                <p className="mt-1 text-sm text-paz-muted">
                  Defina quem fará o acompanhamento e qual é o próximo passo.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-paz-text">
              {visitor.nextContactDate || visitor.nextAction ? (
                <>
                  <p className="flex items-center gap-2 flex-wrap"> {/* Adicionado flex-wrap */}
                    <CalendarDays
                      size={16}
                      className="shrink-0 text-paz-muted"
                    />
                    {visitor.nextContactDate ? (
                      <>
                        {formatDate(visitor.nextContactDate)}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            nextContactStatus === "overdue"
                              ? "bg-paz-error/10 text-paz-error"
                              : nextContactStatus === "today"
                              ? "bg-paz-warning/10 text-paz-warning"
                              : "bg-paz-soft text-paz-primary"
                          }`}
                        >
                          {getNextContactStatusLabel(visitor.nextContactDate)}
                        </span>
                      </>
                    ) : (
                      "Sem data definida"
                    )}
                  </p>

                  {visitor.followUpOwnerName && (
                    <p className="flex items-center gap-2">
                      <UserCheck
                        size={16}
                        className="shrink-0 text-paz-muted"
                      />
                      Responsável: {visitor.followUpOwnerName}
                    </p>
                  )}

                  {visitor.nextAction && (
                    <div className="rounded-xl border border-paz-border bg-paz-soft p-3 text-sm leading-relaxed text-paz-text">
                      <span className="font-bold">Próxima ação: </span>
                      {visitor.nextAction}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-paz-border bg-paz-soft p-3 text-sm leading-relaxed text-paz-muted">
                  Nenhuma informação de próximo contato ou ação definida.
                </div>
              )}
            </div>
          </section>

          {/* Seção de Histórico de Acompanhamento */}
          <section className="mt-6 rounded-xl border border-paz-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
                <ClipboardPlus size={20} />
              </div>

              <div>
                <h3 className="font-bold text-paz-text">
                  Histórico de acompanhamento
                </h3>

                <p className="mt-1 text-sm text-paz-muted">
                  Todos os contatos e interações com o visitante.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={openInteractionModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
              >
                <ClipboardPlus size={18} />
                Registrar contato
              </button>
            </div>

            {interactionError && (
              <p className="mt-6 rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                {interactionError}
              </p>
            )}

            {isLoadingInteractions ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-paz-border bg-white p-8 shadow-sm">
                <LoaderCircle
                  className="animate-spin text-paz-primary"
                  size={24}
                />
                <p className="text-sm font-medium text-paz-muted">
                  Carregando histórico de contatos...
                </p>
              </div>
            ) : interactions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-paz-border bg-paz-soft p-8 text-center">
                <CalendarDays className="mx-auto text-paz-muted" size={38} />

                <p className="mt-4 font-bold text-paz-text">
                  Nenhum contato registrado
                </p>

                <p className="mt-2 text-sm text-paz-muted">
                  Registre o primeiro contato para iniciar o acompanhamento.
                </p>
              </div>
            ) : (
              <div className="mt-6 flow-root">
                <ul role="list" className="-mb-8">
                  {interactions.map((interaction, interactionIdx) => (
                    <li key={interaction.id}>
                      <div className="relative pb-8">
                        {interactionIdx !== interactions.length - 1 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-paz-border"
                            aria-hidden="true"
                          />
                        ) : null}

                        <div className="relative flex space-x-3">
                          <div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paz-primary ring-8 ring-white">
                              <MessageCircle
                                className="h-5 w-5 text-white"
                                aria-hidden="true"
                              />
                            </span>
                          </div>

                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5 flex-col sm:flex-row"> {/* Ajustado para mobile */}
                            <div className="min-w-0"> {/* Adicionado min-w-0 */}
                              <p className="text-sm text-paz-text">
                                <span className="font-bold">
                                  {interactionTypeLabels[
                                    interaction.interactionType
                                  ] || "Contato"}
                                </span>{" "}
                                — {interaction.notes}
                              </p>

                              {interaction.nextStep && (
                                <div className="mt-2 rounded-xl bg-paz-warning/10 p-2 text-xs text-paz-warning">
                                  <span className="font-bold">
                                    Próximo passo:{" "}
                                  </span>
                                  {interaction.nextStep}
                                </div>
                              )}
                            </div>

                            <div className="whitespace-nowrap text-left sm:text-right text-sm text-paz-muted mt-2 sm:mt-0"> {/* Ajustado para mobile */}
                              <time dateTime={interaction.interactionDate}>
                                {formatDate(interaction.interactionDate)}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar de Acompanhamento */}
        <aside>
          <section className="rounded-xl border border-paz-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
                <CheckCircle2 size={20} />
              </div>

              <div>
                <h3 className="font-bold text-paz-text">Acompanhamento</h3>

                <p className="mt-1 text-sm text-paz-muted">
                  Marque o progresso do visitante.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-6 rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                {error}
              </p>
            )}

            <div className="mt-5 space-y-3">
              {progressItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => void toggleProgress(item.key)}
                  disabled={savingKey === item.key}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    visitor[item.key]
                      ? "border-paz-soft bg-paz-soft"
                      : "border-paz-border hover:border-paz-primary hover:bg-paz-soft"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
                      visitor[item.key]
                        ? "border-paz-primary bg-paz-primary text-white"
                        : "border-paz-border bg-white"
                    }`}
                  >
                    {savingKey === item.key ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                  </span>

                  <span>
                    <span className="block text-sm font-bold text-paz-text">
                      {item.label}
                    </span>

                    <span className="mt-0.5 block text-xs leading-relaxed text-paz-muted">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Modal de Edição do Visitante */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-paz-primary/20 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-visitor-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-float sm:max-w-2xl sm:rounded-xl sm:p-6"
          >
            <div className="flex sticky top-0 bg-white z-10 items-start justify-between gap-4 pb-4"> {/* Adicionado sticky e pb-4 */}
              <div>
                <p className="text-sm font-semibold text-paz-primary">
                  Atualização de cadastro
                </p>

                <h3
                  id="edit-visitor-title"
                  className="mt-1 text-xl font-bold tracking-tight text-paz-text"
                >
                  Editar visitante
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-paz-muted">
                  Atualize os dados para manter o acompanhamento organizado.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSubmitting}
                aria-label="Fechar"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-paz-muted transition hover:bg-paz-soft hover:text-paz-primary disabled:cursor-not-allowed"
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
                  className={`${inputClassName(
                    Boolean(errors.notes),
                  )} resize-y`}
                />
              </FormField>

              <div className="border-t border-paz-border pt-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-paz-soft text-paz-primary">
                    <CalendarClock size={20} />
                  </div>

                  <div>
                    <h4 className="font-bold text-paz-text">
                      Próximo acompanhamento
                    </h4>

                    <p className="mt-1 text-sm text-paz-muted">
                      Defina quem fará o acompanhamento e qual é o próximo
                      passo.
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
                <p className="rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-paz-border pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                  className="rounded-xl border border-paz-border px-4 py-3 text-sm font-bold text-paz-muted transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60"
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
      {/* Modal de Registro de Interação */}
      {isInteractionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-paz-primary/20 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="interaction-form-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-float sm:max-w-xl sm:rounded-xl sm:p-6"
          >
            <div className="flex sticky top-0 bg-white z-10 items-start justify-between gap-4 pb-4"> {/* Adicionado sticky e pb-4 */}
              <div>
                <p className="text-sm font-semibold text-paz-primary">
                  Acompanhamento
                </p>

                <h3
                  id="interaction-form-title"
                  className="mt-1 text-xl font-bold tracking-tight text-paz-text"
                >
                  Registrar contato
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-paz-muted">
                  Registre como foi o contato e deixe claro qual será o próximo
                  passo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeInteractionModal}
                disabled={isSubmittingInteraction}
                aria-label="Fechar"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-paz-muted transition hover:bg-paz-soft hover:text-paz-primary disabled:cursor-not-allowed"
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
                <p className="rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                  {interactionError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-paz-border pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeInteractionModal}
                  disabled={isSubmittingInteraction}
                  className="rounded-xl border border-paz-border px-4 py-3 text-sm font-bold text-paz-muted transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingInteraction}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60"
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
      <span className="mb-2 block text-sm font-bold text-paz-text">
        {label}
        {required && <span className="ml-1 text-paz-error">*</span>}
      </span>

      {children}

      {error && (
        <span className="mt-1.5 block text-xs font-medium text-paz-error">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClassName(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-paz-text outline-none transition placeholder:text-paz-muted focus:ring-4 ${
    hasError
      ? "border-paz-error focus:border-paz-error focus:ring-paz-error/20"
      : "border-paz-border focus:border-paz-primary focus:ring-paz-soft"
  }`;
}