import type { AppRole } from "@/lib/auth/session";

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  cliente: "Cliente",
};
