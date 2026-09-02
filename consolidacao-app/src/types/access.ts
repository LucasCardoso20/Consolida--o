export type UserRole = "MASTER" | "LEADER" | null;

export type AccessStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export type UserProfile = {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  access_status: AccessStatus;
  created_at?: string;
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