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
import { useAccess } from "../contexts/AccessContext"; // Importar useAccess

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
  const { profile } = useAccess(); // Obter o perfil do usuário logado
  const isMaster = profile?.role === "MASTER"; // Determinar se o usuário é Master

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
      // Modificação aqui: Chamar getCells sem argumento para carregar todas as células
      // Ou com um argumento que indique para não filtrar por ativo, dependendo da sua implementação de getCells
      const fetchedCells = await getCells(); // Assumindo que getCells() sem argumento retorna todas
      setCells(fetchedCells);
    } catch (err) {
      console.error("Failed to load cells:", err);
      setPageError("Não foi possível carregar as células.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCells();
  }, []);

  const onCreateNewCell = () => {
    if (!isMaster) return; // Impedir que não-Masters abram o formulário de criação
    setSelectedCell(null);
    reset({
      name: "",
      leaderName: "",
      leaderPhone: "",
      location: "",
      notes: "",
      isActive: true,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (cell: Cell) => {
    if (!isMaster) return; // Impedir que não-Masters abram o formulário de edição
    setSelectedCell(cell);
    reset({
      name: cell.name,
      leaderName: cell.leaderName || "",
      leaderPhone: cell.leaderPhone || "",
      location: cell.location || "",
      notes: cell.notes || "",
      isActive: cell.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedCell(null);
    setFormError(null);
  };

  async function onSubmit(data: CellFormValues) {
    if (!isMaster) {
      setFormError("Você não tem permissão para criar ou editar células.");
      return;
    }

    setFormError(null);
    try {
      const cellDataToSubmit: CellFormData = {
        name: data.name,
        leaderName: data.leaderName || null, // Mapear undefined para null
        leaderPhone: data.leaderPhone || null, // Mapear undefined para null
        location: data.location || null, // Mapear undefined para null
        notes: data.notes || null, // Mapear undefined para null
        isActive: data.isActive,
      };

      if (selectedCell) {
        await updateCell(selectedCell.id, cellDataToSubmit);
      } else {
        await createCell(cellDataToSubmit);
      }
      await loadCells();
      closeForm();
    } catch (err) {
      console.error("Failed to save cell:", err);
      setFormError("Não foi possível salvar a célula. Tente novamente.");
    }
  }

  const filteredCells = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return cells.sort(sortCells);
    }

    return cells
      .filter((cell) => {
        const searchableContent = [
          cell.name,
          cell.leaderName,
          cell.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");

        return searchableContent.includes(normalizedSearch);
      })
      .sort(sortCells);
  }, [searchTerm, cells]);

  const activeCells = useMemo(() => filteredCells.filter((cell) => cell.isActive), [filteredCells]);
  const inactiveCells = useMemo(() => filteredCells.filter((cell) => !cell.isActive), [filteredCells]);

  return (
    <section className="p-4 pb-24 lg:p-8 lg:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-paz-primary">Organização</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text">
            Células
          </h2>
          <p className="mt-2 text-sm text-paz-muted">
            Gerencie as células da sua organização.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-paz-muted"
            />
            <input
              type="text"
              placeholder="Buscar célula..."
              className="w-full rounded-xl border border-paz-border bg-white py-2 pl-10 pr-4 text-sm text-paz-text outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isMaster && ( // Botão "Nova célula" visível apenas para Masters
            <button
              type="button"
              onClick={onCreateNewCell}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
            >
              <Plus size={18} />
              Nova célula
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center p-10">
          <LoaderCircle className="animate-spin text-paz-primary" size={32} />
        </div>
      ) : pageError ? (
        <div className="mt-6 rounded-xl border border-paz-error bg-paz-error/10 p-4 text-center text-sm font-medium text-paz-error">
          {pageError}
        </div>
      ) : (
        <>
          {/* Seção de Células Ativas */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-paz-text">Células Ativas</h3>
            {activeCells.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4">
                {activeCells.map((cell) => (
                  <CellListItem key={cell.id} cell={cell} onEdit={openEditForm} isMaster={isMaster} />
                ))}
              </div>
            ) : (
              <div className="mt-4">
                {/* Usar EmptyCellList para células ativas se não houver nenhuma */}
                <EmptyCellList onCreateNewCell={onCreateNewCell} isMaster={isMaster} />
              </div>
            )}
          </div>

          {/* Seção de Células Inativas */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-paz-text">Células Inativas</h3>
            {inactiveCells.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4">
                {inactiveCells.map((cell) => (
                  <CellListItem key={cell.id} cell={cell} onEdit={openEditForm} isMaster={isMaster} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-paz-muted">Nenhuma célula inativa.</p>
            )}
          </div>
        </>
      )}

      {/* Modal de Criação/Edição de Célula */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-paz-text">
                {selectedCell ? "Editar célula" : "Nova célula"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-paz-muted transition hover:text-paz-text"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormField label="Nome da célula" required error={errors.name?.message}>
                <input
                  type="text"
                  {...register("name")}
                  className={`${inputClassName(Boolean(errors.name))} ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar campo se não for Master
                />
              </FormField>

              <FormField label="Nome do líder" error={errors.leaderName?.message}>
                <input
                  type="text"
                  {...register("leaderName")}
                  className={`${inputClassName(Boolean(errors.leaderName))} ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar campo se não for Master
                />
              </FormField>

              <FormField label="Telefone do líder" error={errors.leaderPhone?.message}>
                <input
                  type="text"
                  {...register("leaderPhone")}
                  className={`${inputClassName(Boolean(errors.leaderPhone))} ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar campo se não for Master
                />
              </FormField>

              <FormField label="Localização" error={errors.location?.message}>
                <input
                  type="text"
                  {...register("location")}
                  className={`${inputClassName(Boolean(errors.location))} ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar campo se não for Master
                />
              </FormField>

              <FormField label="Observações" error={errors.notes?.message}>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className={`${inputClassName(Boolean(errors.notes))} resize-y ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar campo se não for Master
                />
              </FormField>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  id="isActive"
                  className={`h-4 w-4 rounded border-paz-border text-paz-primary focus:ring-paz-primary ${!isMaster ? "cursor-not-allowed" : ""}`}
                  disabled={!isMaster} // Desabilitar checkbox se não for Master
                />
                <label htmlFor="isActive" className="text-sm text-paz-text">
                  Célula ativa
                </label>
              </div>

              {formError && (
                <p className="rounded-xl border border-paz-error bg-paz-error/10 p-3 text-sm font-medium text-paz-error">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-paz-border pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="rounded-xl border border-paz-border px-4 py-3 text-sm font-bold text-paz-muted transition hover:bg-paz-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !isMaster} // Desabilita o botão de salvar se não for Master
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
  isMaster: boolean; // Adicionado para controle de permissão
};

function EmptyCellList({ onCreateNewCell, isMaster }: EmptyCellListProps) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-paz-border bg-white p-10 text-center">
      <UsersRound className="text-paz-muted" size={38} />
      <h3 className="mt-4 font-bold text-paz-text">Nenhuma célula cadastrada</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-muted">
        {isMaster
          ? "As células da sua organização aparecerão aqui. Cadastre a primeira!"
          : "As células da sua organização aparecerão aqui."}
      </p>

      {isMaster && ( // Botão "Cadastrar primeira célula" visível apenas para Masters
        <button
          type="button"
          onClick={onCreateNewCell}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-paz-hover"
        >
          <Plus size={18} />
          Cadastrar primeira célula
        </button>
      )}
    </div>
  );
}

// --- Componente CellListItem ---
type CellListItemProps = {
  cell: Cell;
  onEdit: (cell: Cell) => void;
  isMaster: boolean; // Adicionado para controle de permissão
};

function CellListItem({ cell, onEdit, isMaster }: CellListItemProps) {
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
      {isMaster && ( // Botão "Editar" visível apenas para Masters
        <button
          type="button"
          onClick={() => onEdit(cell)}
          className="w-full sm:w-auto rounded-lg bg-paz-soft px-4 py-2.5 text-[13px] font-semibold text-paz-primary transition hover:bg-paz-primary hover:text-white shadow-sm"
        >
          <Edit3 size={16} className="inline-block mr-2" />
          Editar
        </button>
      )}
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