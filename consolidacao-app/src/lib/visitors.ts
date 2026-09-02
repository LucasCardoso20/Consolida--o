import { supabase } from "./supabase";
import type { Cell, Visitor, VisitorStatus } from "../types/visitor";

type DatabaseVisitor = {
  id: string;
  organization_id: string;
  cell_id: string | null;

  name: string;
  phone: string | null;
  address: string | null;
  invited_by: string | null;
  visit_date: string;
  notes: string | null;
follow_up_owner_name: string | null;
next_contact_date: string | null;
next_action: string | null;
  received_at_service: boolean;
  received_gift: boolean;
  phone_confirmed: boolean;
  first_contact_made: boolean;
  invited_to_cell: boolean;
  attended_cell: boolean;
  follow_up_completed: boolean;

  status: VisitorStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  cells?: {
    name: string;
  } | null;
};

type Profile = {
  id: string;
  organization_id: string;
};

export type NewVisitorData = {
  name: string;
  phone: string | null;
  address: string | null;
  invitedBy: string | null;
  cellId: string | null;
  visitDate: string;
  notes: string | null;

  receivedAtService: boolean;
  receivedGift: boolean;
  phoneConfirmed: boolean;
};

export type UpdateVisitorData = {
  name: string;
  phone: string | null;
  address: string | null;
  invitedBy: string | null;
  cellId: string | null;
  visitDate: string;
  notes: string | null;

  followUpOwnerName: string | null;
  nextContactDate: string | null;
  nextAction: string | null;
};

function mapVisitor(visitor: DatabaseVisitor): Visitor {
  return {
    id: visitor.id,
    organizationId: visitor.organization_id,
    cellId: visitor.cell_id,
    cellName: visitor.cells?.name ?? null,

    name: visitor.name,
    phone: visitor.phone,
    address: visitor.address,
    invitedBy: visitor.invited_by,
    visitDate: visitor.visit_date,
    notes: visitor.notes,
followUpOwnerName: visitor.follow_up_owner_name,
nextContactDate: visitor.next_contact_date,
nextAction: visitor.next_action,
    receivedAtService: visitor.received_at_service,
    receivedGift: visitor.received_gift,
    phoneConfirmed: visitor.phone_confirmed,
    firstContactMade: visitor.first_contact_made,
    invitedToCell: visitor.invited_to_cell,
    attendedCell: visitor.attended_cell,
    followUpCompleted: visitor.follow_up_completed,

    status: visitor.status,
    createdBy: visitor.created_by,
    createdAt: visitor.created_at,
    updatedAt: visitor.updated_at,
  };
}

function normalizeOptionalValue(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

export function calculateVisitorStatus(visitor: {
  phone: string | null;
  firstContactMade: boolean;
  followUpCompleted: boolean;
}): VisitorStatus {
  if (visitor.followUpCompleted) {
    return "COMPLETED";
  }

  if (visitor.firstContactMade) {
    return "IN_FOLLOW_UP";
  }

  if (visitor.phone) {
    return "CONTACT_PENDING";
  }

  return "NEW";
}

async function getCurrentProfile(): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      "Não foi possível encontrar o perfil da líder na organização.",
    );
  }

  return data as Profile;
}

export async function getCells(): Promise<Cell[]> {
  const { data, error } = await supabase
    .from("cells")
    .select("id, name, leader_name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error("Não foi possível carregar as células.");
  }

  return (data ?? []).map((cell) => ({
    id: cell.id as string,
    name: cell.name as string,
    leaderName: (cell.leader_name as string | null) ?? null,
  }));
}

export async function getVisitors(): Promise<Visitor[]> {
  const { data, error } = await supabase
    .from("visitors")
    .select(
      `
        id,
        organization_id,
        cell_id,
        name,
        phone,
        address,
        invited_by,
        visit_date,
        notes,
        follow_up_owner_name,
next_contact_date,
next_action,
        received_at_service,
        received_gift,
        phone_confirmed,
        first_contact_made,
        invited_to_cell,
        attended_cell,
        follow_up_completed,
        status,
        created_by,
        created_at,
        updated_at,
        cells ( name )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os visitantes.");
  }

  return (data ?? []).map((visitor) =>
    mapVisitor(visitor as unknown as DatabaseVisitor),
  );
}

export async function getVisitorById(visitorId: string): Promise<Visitor> {
  const { data, error } = await supabase
    .from("visitors")
    .select(
      `
        id,
        organization_id,
        cell_id,
        name,
        phone,
        address,
        invited_by,
        visit_date,
        notes,
        follow_up_owner_name,
next_contact_date,
next_action,
        received_at_service,
        received_gift,
        phone_confirmed,
        first_contact_made,
        invited_to_cell,
        attended_cell,
        follow_up_completed,
        status,
        created_by,
        created_at,
        updated_at,
        cells ( name )
      `,
    )
    .eq("id", visitorId)
    .single();

  if (error || !data) {
    throw new Error("Visitante não encontrado.");
  }

  return mapVisitor(data as unknown as DatabaseVisitor);
}

export async function createVisitor(
  visitorData: NewVisitorData,
): Promise<Visitor> {
  const profile = await getCurrentProfile();

  const status = calculateVisitorStatus({
    phone: visitorData.phone,
    firstContactMade: false,
    followUpCompleted: false,
  });

  const { data, error } = await supabase
    .from("visitors")
    .insert({
      organization_id: profile.organization_id,
      created_by: profile.id,

      name: visitorData.name.trim(),
      phone: normalizeOptionalValue(visitorData.phone),
      address: normalizeOptionalValue(visitorData.address),
      invited_by: normalizeOptionalValue(visitorData.invitedBy),
      cell_id: visitorData.cellId,
      visit_date: visitorData.visitDate,
      notes: normalizeOptionalValue(visitorData.notes),

      received_at_service: visitorData.receivedAtService,
      received_gift: visitorData.receivedGift,
      phone_confirmed: visitorData.phoneConfirmed,
      first_contact_made: false,
      invited_to_cell: false,
      attended_cell: false,
      follow_up_completed: false,

      status,
    })
    .select(
      `
        id,
        organization_id,
        cell_id,
        name,
        phone,
        address,
        invited_by,
        visit_date,
        notes,
        follow_up_owner_name,
next_contact_date,
next_action,
        received_at_service,
        received_gift,
        phone_confirmed,
        first_contact_made,
        invited_to_cell,
        attended_cell,
        follow_up_completed,
        status,
        created_by,
        created_at,
        updated_at,
        cells ( name )
      `,
    )
    .single();

  if (error || !data) {
    throw new Error("Não foi possível salvar o visitante.");
  }

  return mapVisitor(data as unknown as DatabaseVisitor);
}

export async function updateVisitor(
  visitorId: string,
  visitorData: UpdateVisitorData,
): Promise<Visitor> {
  const { data, error } = await supabase
    .from("visitors")
    .update({
      name: visitorData.name.trim(),
      phone: normalizeOptionalValue(visitorData.phone),
      address: normalizeOptionalValue(visitorData.address),
      invited_by: normalizeOptionalValue(visitorData.invitedBy),
      cell_id: visitorData.cellId,
      visit_date: visitorData.visitDate,
      notes: normalizeOptionalValue(visitorData.notes),
      follow_up_owner_name: normalizeOptionalValue(
        visitorData.followUpOwnerName,
        ),
    next_contact_date: visitorData.nextContactDate,
    next_action: normalizeOptionalValue(visitorData.nextAction),
    })
    .eq("id", visitorId)
    .select(
      `
        id,
        organization_id,
        cell_id,
        name,
        phone,
        address,
        invited_by,
        visit_date,
        notes,
        follow_up_owner_name,
next_contact_date,
next_action,
        received_at_service,
        received_gift,
        phone_confirmed,
        first_contact_made,
        invited_to_cell,
        attended_cell,
        follow_up_completed,
        status,
        created_by,
        created_at,
        updated_at,
        cells ( name )
      `,
    )
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar os dados do visitante.");
  }

  return mapVisitor(data as unknown as DatabaseVisitor);
}

export async function updateVisitorProgress(visitor: Visitor): Promise<Visitor> {
  const status = calculateVisitorStatus(visitor);

  const { data, error } = await supabase
    .from("visitors")
    .update({
      received_at_service: visitor.receivedAtService,
      received_gift: visitor.receivedGift,
      phone_confirmed: visitor.phoneConfirmed,
      first_contact_made: visitor.firstContactMade,
      invited_to_cell: visitor.invitedToCell,
      attended_cell: visitor.attendedCell,
      follow_up_completed: visitor.followUpCompleted,
      status,
    })
    .eq("id", visitor.id)
    .select(
      `
        id,
        organization_id,
        cell_id,
        name,
        phone,
        address,
        invited_by,
        visit_date,
        notes,
        follow_up_owner_name,
next_contact_date,
next_action,
        received_at_service,
        received_gift,
        phone_confirmed,
        first_contact_made,
        invited_to_cell,
        attended_cell,
        follow_up_completed,
        status,
        created_by,
        created_at,
        updated_at,
        cells ( name )
      `,
    )
    .single();

  if (error || !data) {
    throw new Error("Não foi possível atualizar o acompanhamento.");
  }

  return mapVisitor(data as unknown as DatabaseVisitor);
}