import "server-only";
import type { NextRequest } from "next/server";
import { timingSafeEqualString } from "@/lib/security/timing-safe-equal";

/**
 * Autenticação dos callbacks do n8n — token de serviço dedicado, nunca a
 * chave pública do Supabase nem login de usuário.
 */
export function verifyN8nServiceToken(request: NextRequest): boolean {
  const expected = process.env.N8N_SERVICE_TOKEN;
  if (!expected) return false;

  const auth = request.headers.get("authorization");
  if (!auth) return false;
  return timingSafeEqualString(auth, `Bearer ${expected}`);
}
