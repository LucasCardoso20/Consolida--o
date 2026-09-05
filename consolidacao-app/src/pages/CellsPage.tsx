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
  Search, // Importar o ícone de busca
} from "lucide-react";
import { useEffect, useState, useMemo } from "react"; // Importar useMemo
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createCell,
  getCells,
  updateCell,
  type Cell,
  type CellFormData,
} from "../lib/cells";

// Esquema de validação para o formulário de célula
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

// Função auxiliar para ordenar células
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
  const [searchTerm, setSearchTerm] = useState(""); // Novo estado para o termo de pesquisa

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

  // Lógica de filtro para o campo de pesquisa
  const filteredCells = useMemo(() => {
    if (!searchTerm) {
      return cells;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return cells.filter(
      (cell) =>
        cell.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (cell.leaderName && cell.leaderName.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cell.location && cell.location.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [cells, searchTerm]);

  const activeCells = filteredCells.filter((cell) => cell.isActive);
  const inactiveCells = filteredCells.filter((cell) => !cell.isActive);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-paz-primary">Organização</p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-paz-text sm:text-3xl">
            Células
          </h2>

          <p className="mt-2 text-sm text-paz-muted">
            Cadastre e organize as células da igreja.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nova célula</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* Campo de pesquisa */}
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paz-muted" size={20} />
        <input
          type="search"
          placeholder="Buscar por nome, líder ou localização..."
          className="w-full rounded-xl border border-paz-border bg-white py-3 pr-4 pl-11 text-sm outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-4 focus:ring-paz-soft"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-paz-border bg-white p-10 text-center">
          <LoaderCircle className="animate-spin text-paz-muted" size={38} />
          <h3 className="mt-4 font-bold text-paz-text">Carregando células...</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-muted">
            Aguarde enquanto buscamos as informações das suas células.
          </p>
        </div>
      ) : pageError ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-paz-error/50 bg-paz-error/5 p-10 text-center">
          <X className="text-paz-error" size={38} />
          <h3 className="mt-4 font-bold text-paz-error">Erro ao carregar células</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-error">
            {pageError}
          </p>
          <button
            type="button"
            onClick={loadCells}
            className="mt-6 rounded-lg bg-paz-error px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-paz-error/90"
          >
            Tentar novamente
          </button>
        </div>
      ) : cells.length === 0 && !searchTerm ? ( // Se não há células e não está pesquisando
        <EmptyCellList onCreateNewCell={openCreateForm} />
      ) : filteredCells.length === 0 && searchTerm ? ( // Se está pesquisando e não encontrou resultados
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-paz-border bg-white p-10 text-center">
          <Search className="text-paz-muted" size={38} />
          <h3 className="mt-4 font-bold text-paz-text">Nenhuma célula encontrada</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-paz-muted">
            Verifique o termo de pesquisa ou tente novamente.
          </p>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-float">
            <div className="flex items-center justify-between border-b border-paz-border px-6 py-4">
              <h3 className="text-lg font-semibold text-paz-text">
                {selectedCell ? "Editar célula" : "Nova célula"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-1.5 text-paz-muted transition hover:bg-paz-soft hover:text-paz-text"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
              {formError && (
                <div className="rounded-lg bg-paz-error/10 p-3 text-[12px] text-paz-error">
                  {formError}
                </div>
              )}

              {/* Campo Nome da Célula */}
              <label>
                <span className="mb-1.5 block text-[12px] font-medium text-paz-text">
                  Nome da célula <b className="text-paz-primary">*</b>
                </span>
                <input
                  {...register("name")}
                  required
                  placeholder="Ex.: Célula Esperança"
                  className={`w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft shadow-sm ${
                    errors.name ? "border-paz-error" : "border-paz-border"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-paz-error">
                    {errors.name.message}
                  </p>
                )}
              </label>

              {/* Campo Nome do Líder */}
              <label>
                <span className="mb-1.5 block text-[12px] font-medium text-paz-text">
                  Nome do líder
                </span>
                <input
                  {...register("leaderName")}
                  placeholder="Ex.: Ana Silva"
                  className={`w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft shadow-sm ${
                    errors.leaderName ? "border-paz-error" : "border-paz-border"
                  }`}
                />
                {errors.leaderName && (
                  <p className="mt-1 text-[11px] text-paz-error">
                    {errors.leaderName.message}
                  </p>
                )}
              </label>

              {/* Campo Telefone do Líder */}
              <label>
                <span className="mb-1.5 block text-[12px] font-medium text-paz-text">
                  Telefone do líder
                </span>
                <input
                  {...register("leaderPhone")}
                  placeholder="(00) 00000-0000"
                  className={`w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft shadow-sm ${
                    errors.leaderPhone ? "border-paz-error" : "border-paz-border"
                  }`}
                />
                {errors.leaderPhone && (
                  <p className="mt-1 text-[11px] text-paz-error">
                    {errors.leaderPhone.message}
                  </p>
                )}
              </label>

              {/* Campo Localização */}
              <label>
                <span className="mb-1.5 block text-[12px] font-medium text-paz-text">
                  Localização
                </span>
                <input
                  {...register("location")}
                  placeholder="Ex.: Rua da Paz, 123 - Centro"
                  className={`w-full rounded-lg border px-3 py-2.5 text-[12px] outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft shadow-sm ${
                    errors.location ? "border-paz-error" : "border-paz-border"
                  }`}
                />
                {errors.location && (
                  <p className="mt-1 text-[11px] text-paz-error">
                    {errors.location.message}
                  </p>
                )}
              </label>

              {/* Campo Observações */}
              <label>
                <span className="mb-1.5 block text-[12px] font-medium text-paz-text">
                  Observações
                </span>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Informações adicionais sobre a célula..."
                  className={`w-full resize-none rounded-lg border px-3 py-2.5 text-[12px] outline-none transition placeholder:text-paz-muted focus:border-paz-primary focus:ring-3 focus:ring-paz-soft shadow-sm ${
                    errors.notes ? "border-paz-error" : "border-paz-border"
                  }`}
                ></textarea>
                {errors.notes && (
                  <p className="mt-1 text-[11px] text-paz-error">
                    {errors.notes.message}
                  </p>
                )}
              </label>

              {/* Checkbox Ativa/Inativa */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  id="isActive"
                  className="h-4 w-4 rounded border-paz-border text-paz-primary focus:ring-paz-primary"
                />
                <label htmlFor="isActive" className="text-[12px] font-medium text-paz-text">
                  Célula ativa
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-paz-border pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg px-4 py-2.5 text-[12px] font-semibold text-paz-muted transition hover:bg-paz-soft"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-paz-primary px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-paz-hover"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {selectedCell ? "Salvar alterações" : "Cadastrar célula"}
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
    <div className="rounded-2xl border border-paz-border bg-white p-5 shadow-card flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
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
        <div className="flex flex-col gap-y-1 mt-2 text-[12px] text-paz-muted">
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
          {/* Supondo que você tenha um campo para dia/horário na sua Cell, ou que possa ser derivado de notes */}
          {/* Exemplo hardcoded, ajuste conforme sua lógica de dados */}
          <span className="flex items-center gap-1">
            <CalendarDays size={14} strokeWidth={1.5} className="text-paz-muted" />
            Dia: Quinta-feira | Horário: 20h {/* Placeholder */}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onEdit(cell)}
        className="rounded-lg bg-paz-soft px-4 py-2.5 text-[13px] font-semibold text-paz-primary transition hover:bg-paz-primary hover:text-white shadow-sm"
      >
        <Edit3 size={16} className="inline-block mr-2" />
        Editar
      </button>
    </div>
  );
}

