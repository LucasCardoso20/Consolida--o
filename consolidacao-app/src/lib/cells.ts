import { supabase } from "./supabase";

export type Cell = {
  id: string;
  name: string;
  leaderName: string | null;
  leaderPhone: string | null;
  location: string | null;
  notes: string | null;
  isActive: boolean;
};

type DatabaseCell = {
  id: string;
  name: string;
  leader_name: string | null;
  leader_phone: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
};
type Profile = {
  organization_id: string;
};

export type CellFormData = {
  name: string;
  leaderName: string | null;
  leaderPhone: string | null;
  location: string | null;
  notes: string | null;
  isActive: boolean;
};

function mapCell(cell: DatabaseCell): Cell {
  return {
    id: cell.id,
    name: cell.name,
    leaderName: cell.leader_name,
    leaderPhone: cell.leader_phone,
    location: cell.location,
    notes: cell.notes,
    isActive: cell.is_active,
  };
}

function normalizeOptionalValue(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

async function getCurrentOrganizationId(): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      "Não foi possível encontrar a organização da líder logada.",
    );
  }

  return (data as Profile).organization_id;
}

export async function getCells(
  includeInactive = true,
): Promise<Cell[]> {
  let query = supabase
    .from("cells")
    .select(
  "id, name, leader_name, leader_phone, location, notes, is_active",)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar as células.");
  }

  return (data ?? []).map((cell) => mapCell(cell as DatabaseCell));
}

export async function createCell(
  cellData: CellFormData,
): Promise<Cell> {
  const organizationId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("cells")
    .insert({
      organization_id: organizationId,
      name: cellData.name.trim(),
      leader_name: normalizeOptionalValue(cellData.leaderName),
      leader_phone: normalizeOptionalValue(cellData.leaderPhone),
      notes: normalizeOptionalValue(cellData.notes),
      location: normalizeOptionalValue(cellData.location),
      is_active: cellData.isActive,
    })
    .select("id, name, leader_name, leader_phone, location, notes, is_active")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("Já existe uma célula com este nome.");
    }

    throw new Error("Não foi possível cadastrar a célula.");
  }

  return mapCell(data as DatabaseCell);
}

export async function updateCell(
  cellId: string,
  cellData: CellFormData,
): Promise<Cell> {
  const { data, error } = await supabase
    .from("cells")
    .update({
      name: cellData.name.trim(),
      leader_name: normalizeOptionalValue(cellData.leaderName),
      leader_phone: normalizeOptionalValue(cellData.leaderPhone),
      location: normalizeOptionalValue(cellData.location),
      notes: normalizeOptionalValue(cellData.notes),
      is_active: cellData.isActive,
    })
    .eq("id", cellId)
    .select("id, name, leader_name, leader_phone, location, notes, is_active")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("Já existe uma célula com este nome.");
    }

    throw new Error("Não foi possível atualizar a célula.");
  }

  return mapCell(data as DatabaseCell);
}