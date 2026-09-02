import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit3,
  LoaderCircle,
  Plus,
  Save,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createCell,
  getCells,
  updateCell,
  type Cell,
  type CellFormData,
} from "../lib/cells";
import type { FormEventHandler } from "react";
const cellSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome da célula.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),

  leaderName: z
    .string()
    .trim()
    .max(120, "O nome da líder pode ter no máximo 120 caracteres.")
    .optional(),
    leaderPhone: z
  .string()
  .trim()
  .max(20, "O telefone pode ter no máximo 20 caracteres.")
  .optional(),
location: z
  .string()
  .trim()
  .max(250, "A localização pode ter no máximo 250 caracteres.")
  .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "As observações podem ter no máximo 1.000 caracteres.")
    .optional(),

  isActive: z.boolean(),
});

type CellFormValues = z.infer<typeof cellSchema>;

export function CellsPage() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CellFormValues>({
    resolver: zodResolver(cellSchema),
    defaultValues: {
  name: "",
  leaderName: "",
  leaderPhone: "",
  location: "",
  notes: "",
  isActive: true,
},
  });

  async function loadCells() {
    setIsLoading(true);
    setPageError(null);

    try {
      const loadedCells = await getCells(true);
      setCells(loadedCells);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as células.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCells();
  }, []);

  function openCreateForm() {
    setSelectedCell(null);
    setFormError(null);

   reset({
  name: "",
  leaderName: "",
  leaderPhone: "",
  location: "",
  notes: "",
  isActive: true,
});

    setIsFormOpen(true);
  }

  function openEditForm(cell: Cell) {
    setSelectedCell(cell);
    setFormError(null);

    reset({
  name: cell.name,
  leaderName: cell.leaderName ?? "",
  leaderPhone: cell.leaderPhone ?? "",
  location: cell.location ?? "",
  notes: cell.notes ?? "",
  isActive: cell.isActive,
});

    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSubmitting) {
      return;
    }

    setIsFormOpen(false);
    setSelectedCell(null);
    setFormError(null);
  }

  async function onSubmit(values: CellFormValues) {
    setFormError(null);

  const data: CellFormData = {
  name: values.name,
  leaderName: values.leaderName || null,
  leaderPhone: values.leaderPhone || null,
  location: values.location || null,
  notes: values.notes || null,
  isActive: values.isActive,
};

    try {
      if (selectedCell) {
        const updatedCell = await updateCell(selectedCell.id, data);

        setCells((currentCells) =>
          currentCells
            .map((cell) => (cell.id === updatedCell.id ? updatedCell : cell))
            .sort(sortCells),
        );
      } else {
        const newCell = await createCell(data);

        setCells((currentCells) => [...currentCells, newCell].sort(sortCells));
      }

      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a célula.",
      );
    }
  }

  const activeCells = cells.filter((cell) => cell.isActive);
  const inactiveCells = cells.filter((cell) => !cell.isActive);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Organização</p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Células
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Cadastre e organize as células da igreja.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={18} />
          Nova célula
        </button>
      </div>

      {pageError && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <p>{pageError}</p>

          <button
            type="button"
            onClick={() => void loadCells()}
            className="mt-3 font-bold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : cells.length === 0 ? (
        <EmptyState onCreate={openCreateForm} />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              label="Células ativas"
              value={activeCells.length}
              description="Disponíveis para vincular visitantes"
              variant="active"
            />

            <SummaryCard
              label="Células inativas"
              value={inactiveCells.length}
              description="Mantidas no histórico"
              variant="inactive"
            />

            <SummaryCard
              label="Total cadastrado"
              value={cells.length}
              description="Células da organização"
              variant="total"
            />
          </div>

          <CellList
            title="Células ativas"
            description="Estas células aparecem no cadastro de visitantes."
            cells={activeCells}
            onEdit={openEditForm}
            emptyMessage="Nenhuma célula ativa cadastrada."
          />

          {inactiveCells.length > 0 && (
            <CellList
              title="Células inativas"
              description="Elas não aparecem no cadastro de novos visitantes."
              cells={inactiveCells}
              onEdit={openEditForm}
              emptyMessage="Nenhuma célula inativa."
              inactive
            />
          )}
        </>
      )}

      {isFormOpen && (
        <CellFormModal
          selectedCell={selectedCell}
          errors={errors}
          formError={formError}
          isSubmitting={isSubmitting}
          register={register}
          onClose={closeForm}
          onSubmit={handleSubmit(onSubmit)}
        />
      )}
    </section>
  );
}

function sortCells(firstCell: Cell, secondCell: Cell) {
  if (firstCell.isActive !== secondCell.isActive) {
    return firstCell.isActive ? -1 : 1;
  }

  return firstCell.name.localeCompare(secondCell.name, "pt-BR");
}

function LoadingState() {
  return (
    <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <LoaderCircle className="animate-spin text-brand-600" size={30} />

      <p className="mt-4 text-sm font-semibold text-slate-600">
        Carregando células...
      </p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center">
      <UsersRound className="mx-auto text-slate-300" size={40} />

      <h3 className="mt-4 font-bold text-slate-800">
        Nenhuma célula cadastrada
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Cadastre as células da igreja para vinculá-las aos visitantes durante o
        acompanhamento.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
      >
        <Plus size={18} />
        Cadastrar primeira célula
      </button>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  description: string;
  variant: "active" | "inactive" | "total";
};

function SummaryCard({
  label,
  value,
  description,
  variant,
}: SummaryCardProps) {
  const styles = {
    active: "border-brand-100 bg-brand-50 text-brand-700",
    inactive: "border-slate-200 bg-slate-50 text-slate-600",
    total: "border-blue-100 bg-blue-50 text-blue-700",
  };

  return (
    <article className={`rounded-2xl border p-5 ${styles[variant]}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-80">{description}</p>
    </article>
  );
}

type CellListProps = {
  title: string;
  description: string;
  cells: Cell[];
  emptyMessage: string;
  inactive?: boolean;
  onEdit: (cell: Cell) => void;
};

function CellList({
  title,
  description,
  cells,
  emptyMessage,
  inactive = false,
  onEdit,
}: CellListProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {cells.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {cells.map((cell) => (
            <article
              key={cell.id}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                inactive
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-brand-100 bg-brand-50/30"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate font-bold text-slate-900">
                    {cell.name}
                  </h4>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      cell.isActive
                        ? "bg-brand-100 text-brand-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {cell.isActive ? "Ativa" : "Inativa"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
  {cell.leaderName
    ? `Líder: ${cell.leaderName}`
    : "Sem líder responsável definido"}
</p>
{cell.leaderPhone && (
  <p className="mt-1 text-sm text-slate-500">
    📱 {cell.leaderPhone}
  </p>
)}

{cell.location && (
  <p className="mt-2 text-sm font-medium text-slate-600">
    📍 {cell.location}
  </p>
)}

{cell.notes && (
  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
    {cell.notes}
  </p>
)}
              </div>

              <button
                type="button"
                onClick={() => onEdit(cell)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">Editar</span>
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type CellFormModalProps = {
  selectedCell: Cell | null;
  errors: {
    name?: { message?: string };
    leaderName?: { message?: string };
    leaderPhone?: { message?: string };
    location?: { message?: string };
    notes?: { message?: string };
    };
  formError: string | null;
  isSubmitting: boolean;
  register: ReturnType<typeof useForm<CellFormValues>>["register"];
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function CellFormModal({
  selectedCell,
  errors,
  formError,
  isSubmitting,
  register,
  onClose,
  onSubmit,
}: CellFormModalProps) {
  const isEditing = Boolean(selectedCell);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:justify-center sm:p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-form-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">
              {isEditing ? "Editar cadastro" : "Novo cadastro"}
            </p>

            <h3
              id="cell-form-title"
              className="mt-1 text-xl font-bold tracking-tight text-slate-900"
            >
              {isEditing ? "Editar célula" : "Cadastrar célula"}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {isEditing
                ? "Atualize os dados ou altere o status da célula."
                : "Ela ficará disponível no cadastro de visitantes."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Nome da célula
              <span className="ml-1 text-red-500">*</span>
            </span>

            <input
              {...register("name")}
              autoFocus
              autoComplete="off"
              placeholder="Ex.: Célula Esperança"
              className={inputClassName(Boolean(errors.name))}
            />

            {errors.name?.message && (
              <span className="mt-1.5 block text-xs font-medium text-red-600">
                {errors.name.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Líder responsável
            </span>

            <input
              {...register("leaderName")}
              autoComplete="name"
              placeholder="Ex.: Maria Silva"
              className={inputClassName(Boolean(errors.leaderName))}
            />

            {errors.leaderName?.message && (
              <span className="mt-1.5 block text-xs font-medium text-red-600">
                {errors.leaderName.message}
              </span>
            )}
          </label>
          <label className="block">
  <span className="mb-2 block text-sm font-bold text-slate-700">
    Telefone / WhatsApp da líder
  </span>

  <input
    {...register("leaderPhone")}
    type="tel"
    inputMode="tel"
    autoComplete="tel"
    placeholder="Ex.: (11) 99999-9999"
    className={inputClassName(Boolean(errors.leaderPhone))}
  />

  <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
    Campo opcional para facilitar o contato com a liderança da célula.
  </span>

  {errors.leaderPhone?.message && (
    <span className="mt-1.5 block text-xs font-medium text-red-600">
      {errors.leaderPhone.message}
    </span>
  )}
</label>
          <label className="block">
  <span className="mb-2 block text-sm font-bold text-slate-700">
    Localização / endereço
  </span>

  <input
    {...register("location")}
    autoComplete="street-address"
    placeholder="Ex.: Rua das Flores, 123 — Bairro Centro"
    className={inputClassName(Boolean(errors.location))}
  />

  <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
    Informe o endereço ou um ponto de referência para a célula.
  </span>

  {errors.location?.message && (
    <span className="mt-1.5 block text-xs font-medium text-red-600">
      {errors.location.message}
    </span>
  )}
</label>
<label className="block">
  <span className="mb-2 block text-sm font-bold text-slate-700">
    Observações
  </span>

  <textarea
    {...register("notes")}
    rows={4}
    placeholder="Ex.: Encontros às quartas, 20h; bairro Centro; público de jovens..."
    className={`${inputClassName(Boolean(errors.notes))} resize-y`}
  />

  {errors.notes?.message && (
    <span className="mt-1.5 block text-xs font-medium text-red-600">
      {errors.notes.message}
    </span>
  )}
</label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
            <input
              type="checkbox"
              {...register("isActive")}
              className="mt-0.5 size-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />

            <span>
              <span className="block text-sm font-bold text-slate-800">
                Célula ativa
              </span>

              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Células inativas são mantidas no histórico, mas não aparecem
                para vínculo em novos visitantes.
              </span>
            </span>
          </label>

          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
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
                  {isEditing ? "Salvar alterações" : "Salvar célula"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClassName(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
  }`;
}