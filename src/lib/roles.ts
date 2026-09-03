export const ROLES = {
  AGENCY_ADMIN: "AGENCY_ADMIN",
  AGENCY_MEMBER: "AGENCY_MEMBER",
  CLIENT: "CLIENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isAgency(role?: string | null) {
  return role === ROLES.AGENCY_ADMIN || role === ROLES.AGENCY_MEMBER;
}

export function isAgencyAdmin(role?: string | null) {
  return role === ROLES.AGENCY_ADMIN;
}

export function roleLabel(role?: string | null) {
  if (role === ROLES.AGENCY_ADMIN) return "Agency Admin";
  if (role === ROLES.AGENCY_MEMBER) return "Agency Team";
  return "Client";
}
