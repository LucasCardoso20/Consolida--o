// src/pages/CellsPage.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit3,
  LoaderCircle,
  Plus,
  Save,
  UsersRound,
  X,
  Phone,
  MapPin,
  CalendarDays,
  Search,
} from "lucide-react";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createCell,
  getCells,
  updateCell,
  type Cell,
  type CellFormData,
} from "../lib/cells";

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

function sortCells(a: Cell, b: Cell) {
  return a.name.localeCompare(b.name);
}

export function CellsPage() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
      setCells(loadedCells.sort(sortCells));
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

  function onCreateNewCell() {
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
    setIsFormOpen(false);
    setSelectedCell(null);
  }

  async function onSubmit(data: CellFormValues) {
    setFormError(null);

    try {
      const cellData: CellFormData = {
        name: data.name,
        leaderName: data.leaderName || null,
        leaderPhone: data.leaderPhone || null,
        location: data.location || null,
        notes: data.notes || null,
        isActive: data.isActive,
      };

      if (selectedCell) {
        await updateCell(selectedCell.id, cellData);
      } else {
        await createCell(cellData);
      }

      await loadCells();
      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a célula. Tente novamente.",
      );
    }
  }

  const filteredCells = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) {
      return cells;
    }
    return cells.filter(
      (cell) =>
        cell.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        cell.leaderName?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
    );
  }, [cells, searchTerm]);

  const activeCells = useMemo(
    () => filteredCells.filter((cell) => cell.isActive),
    [filteredCells],
  );
  const inactiveCells = useMemo(
    () => filteredCells.filter((cell) => !cell.isActive),
    [filteredCells],
  );

  return (
    <section className="p-4 pb-24 lg:p-8 lg:pb-8"> {/* Adicionado padding aqui */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-paz-primary">Organização</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-paz-text">
            Células
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paz-muted">
            Gerencie e acompanhe todas as células da sua organização.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNewCell}
          className="inline-flex items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
        >
          <Plus size={18} />
          Nova célula
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-paz-muted" size={18} />
        <input
          type="text"
          placeholder="Buscar células por nome ou líder..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-paz-border bg-white py-3 pl-10 pr-4 text-sm text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
        />
      </div>

      {pageError && (
        <div className="mt-6 rounded-xl border border-paz-error bg-paz-error/10 p-4 text-sm font-medium text-paz-error">
          {pageError}
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl border border-paz-border bg-white p-6 text-center shadow-sm">
          <LoaderCircle className="animate-spin text-paz-primary" size={30} />
          <p className="ml-3 text-sm font-semibold text-paz-muted">
            Carregando células...
          </p>
        </div>
      ) : cells.length === 0 ? (
        <EmptyCellList onCreateNewCell={onCreateNewCell} />
      ) : (
        <>
          {activeCells.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-paz-text">Células Ativas ({activeCells.length})</h3>
              <div className="space-y-3">
                {activeCells.map((cell) => (
                  <CellListItem key={cell.id} cell={cell} onEdit={openEditForm} />
                ))}
              </div>
            </section>
          )}

          {inactiveCells.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-paz-text">Células Inativas ({inactiveCells.length})</h3>
              <div className="space-y-3">
                {inactiveCells.map((cell) => (
                  <CellListItem key={cell.id} cell={cell} onEdit={openEditForm} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal de Formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-paz-primary/20 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4" role="presentation">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-float sm:max-w-md sm:rounded-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cell-form-title">
            <div className="flex sticky top-0 bg-white z-10 items-start justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-semibold text-paz-primary">Gerenciamento</p>
                <h3 id="cell-form-title" className="mt-1 text-xl font-bold tracking-tight text-paz-text">
                  {selectedCell ? "Editar célula" : "Nova célula"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-paz-muted">
                  Preencha os dados da célula para cadastrar ou atualizar.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSubmitting}
                aria-label="Fechar"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-paz-muted transition hover:bg-paz-soft hover:text-paz-primary disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
              {formError && (
                <p className="rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                  {formError}
                </p>
              )}

              <FormField label="Nome da célula" required error={errors.name?.message}>
                <input
                  {...register("name")}
                  placeholder="Ex.: Célula Esperança"
                  className={inputClassName(Boolean(errors.name))}
                />
              </FormField>

              <FormField label="Nome do líder" error={errors.leaderName?.message}>
                <input
                  {...register("leaderName")}
                  placeholder="Ex.: Ana Silva"
                  className={inputClassName(Boolean(errors.leaderName))}
                />
              </FormField>

              <FormField label="Telefone do líder" error={errors.leaderPhone?.message}>
                <input
                  {...register("leaderPhone")}
                  placeholder="(00) 00000-0000"
                  className={inputClassName(Boolean(errors.leaderPhone))}
                />
              </FormField>

              <FormField label="Localização" error={errors.location?.message}>
                <input
                  {...register("location")}
                  placeholder="Ex.: Rua da Paz, 123 - Centro"
                  className={inputClassName(Boolean(errors.location))}
                />
              </FormField>

              <FormField label="Observações" error={errors.notes?.message}>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Informações adicionais sobre a célula..."
                  className={`${inputClassName(Boolean(errors.notes))} resize-y`}
                ></textarea>
              </FormField>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  id="isActive"
                  className="h-4 w-4 rounded border-paz-border text-paz-primary focus:ring-paz-primary"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-paz-text">
                  Célula ativa
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-paz-border pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-paz-border px-4 py-3 text-sm font-bold text-paz-muted transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-paz-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="animate-spin" size={18} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {selectedCell ? "Salvar alterações" : "Cadastrar célula"}
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

// --- Componente EmptyCellList ---
type EmptyCellListProps = {
  onCreateNewCell: () => void;
};

function EmptyCellList({ onCreateNewCell }: EmptyCellListProps) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-paz-border bg-white p-10 text-center">
      <UsersRound className="text-paz-muted" size={38} />
      <h3 className="mt-4 font-bold text-paz-text">Nenhuma célula cadastrada</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-muted">
        As células da sua organização aparecerão aqui.
      </p>

      <button
        type="button"
        onClick={onCreateNewCell}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-paz-hover"
      >
        <Plus size={18} />
        Cadastrar primeira célula
      </button>
    </div>
  );
}

// --- Componente CellListItem ---
type CellListItemProps = {
  cell: Cell;
  onEdit: (cell: Cell) => void;
};

function CellListItem({ cell, onEdit }: CellListItemProps) {
  return (
    <div className="rounded-2xl border border-paz-border bg-white p-4 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="text-[16px] font-semibold text-paz-text">{cell.name}</p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              cell.isActive
                ? "bg-paz-success/10 text-paz-success"
                : "bg-paz-error/10 text-paz-error"
            }`}
          >
            {cell.isActive ? "Ativa" : "Inativa"}
          </span>
        </div>
        {cell.leaderName && (
          <p className="text-[13px] text-paz-muted">Líder: {cell.leaderName}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-1 mt-2 text-[12px] text-paz-muted">
          {cell.leaderPhone && (
            <span className="flex items-center gap-1">
              <Phone size={14} strokeWidth={1.5} className="text-paz-muted" />
              {cell.leaderPhone}
            </span>
          )}
          {cell.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} strokeWidth={1.5} className="text-paz-muted" />
              {cell.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays size={14} strokeWidth={1.5} className="text-paz-muted" />
            Dia: Quinta-feira | Horário: 20h {/* Placeholder */}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onEdit(cell)}
        className="w-full sm:w-auto rounded-lg bg-paz-soft px-4 py-2.5 text-[13px] font-semibold text-paz-primary transition hover:bg-paz-primary hover:text-white shadow-sm"
      >
        <Edit3 size={16} className="inline-block mr-2" />
        Editar
      </button>
    </div>
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