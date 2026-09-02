import { supabase } from "./supabase";

export type InteractionType =
  | "WHATSAPP"
  | "PHONE_CALL"
  | "IN_PERSON"
  | "CELL_VISIT"
  | "OTHER";

export type VisitorInteraction = {
  id: string;
  organizationId: string;
  visitorId: string;
  createdBy: string | null;
  interactionDate: string;
  interactionType: InteractionType;
  notes: string;
  nextStep: string | null;
  createdAt: string;
};

type DatabaseVisitorInteraction = {
  id: string;
  organization_id: string;
  visitor_id: string;
  created_by: string | null;
  interaction_date: string;
  interaction_type: InteractionType;
  notes: string;
  next_step: string | null;
  created_at: string;
};

type Profile = {
  organization_id: string;
};

export type CreateVisitorInteractionData = {
  visitorId: string;
  interactionDate: string;
  interactionType: InteractionType;
  notes: string;
  nextStep: string | null;
};

function mapVisitorInteraction(
  interaction: DatabaseVisitorInteraction,
): VisitorInteraction {
  return {
    id: interaction.id,
    organizationId: interaction.organization_id,
    visitorId: interaction.visitor_id,
    createdBy: interaction.created_by,
    interactionDate: interaction.interaction_date,
    interactionType: interaction.interaction_type,
    notes: interaction.notes,
    nextStep: interaction.next_step,
    createdAt: interaction.created_at,
  };
}

function normalizeOptionalValue(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

async function getCurrentUserAndOrganization() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sua sessão expirou. Entre novamente no sistema.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      "Não foi possível encontrar a organização da líder logada.",
    );
  }

  return {
    userId: user.id,
    organizationId: (profile as Profile).organization_id,
  };
}

export async function getVisitorInteractions(
  visitorId: string,
): Promise<VisitorInteraction[]> {
  const { data, error } = await supabase
    .from("visitor_interactions")
    .select(
      `
        id,
        organization_id,
        visitor_id,
        created_by,
        interaction_date,
        interaction_type,
        notes,
        next_step,
        created_at
      `,
    )
    .eq("visitor_id", visitorId)
    .order("interaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar o histórico de contatos.");
  }

  return (data ?? []).map((interaction) =>
    mapVisitorInteraction(interaction as DatabaseVisitorInteraction),
  );
}

export async function createVisitorInteraction(
  interactionData: CreateVisitorInteractionData,
): Promise<VisitorInteraction> {
  const { userId, organizationId } = await getCurrentUserAndOrganization();

  const { data, error } = await supabase
    .from("visitor_interactions")
    .insert({
      organization_id: organizationId,
      visitor_id: interactionData.visitorId,
      created_by: userId,
      interaction_date: interactionData.interactionDate,
      interaction_type: interactionData.interactionType,
      notes: interactionData.notes.trim(),
      next_step: normalizeOptionalValue(interactionData.nextStep),
    })
    .select(
      `
        id,
        organization_id,
        visitor_id,
        created_by,
        interaction_date,
        interaction_type,
        notes,
        next_step,
        created_at
      `,
    )
    .single();

  if (error || !data) {
    throw new Error("Não foi possível registrar o contato.");
  }

  return mapVisitorInteraction(data as DatabaseVisitorInteraction);
}