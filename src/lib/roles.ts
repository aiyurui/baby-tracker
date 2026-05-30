export const ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export function isAdminLike(role?: string | null) {
  return role === ROLE.ADMIN || role === ROLE.SUPER_ADMIN;
}

export function isSuperAdmin(role?: string | null) {
  return role === ROLE.SUPER_ADMIN;
}

