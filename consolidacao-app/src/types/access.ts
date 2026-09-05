export type UserRole = "MASTER" | "LEADER" | null;

export type AccessStatus = "PENDING" | "ACTIVE" | "INACTIVE";


export type UserProfile = {
  id: string;
  organization_id: string | null; // Pode ser null se o usuário ainda não tem organização
  full_name: string | null;
  email: string | null;
  role: "MASTER" | "LEADER" | null; // Pode ser null se o usuário ainda não tem role
  access_status: "ACTIVE" | "INACTIVE" | "PENDING" | null; // Adicionado PENDING para consistência
  created_at: string;
  phone?: string | null; // Adicionado, tornando-o opcional
  access_request_id?: string | null; // Adicionado, tornando-o opcional
  access_request_status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | null; // Adicionado, tornando-o opcional
};

export function hasActiveOperationalAccess(
  profile: UserProfile | null,
) {
  return Boolean(
    profile &&
      profile.organization_id &&
      profile.access_status === "ACTIVE" &&
      (profile.role === "MASTER" || profile.role === "LEADER"),
  );
}

export function isMaster(profile: UserProfile | null) {
  return Boolean(
    profile &&
      profile.access_status === "ACTIVE" &&
      profile.role === "MASTER",
  );
}