import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Busca o perfil (role + organization_id) do usuário autenticado.
 * Retorna null se não houver sessão ou o profile ainda não existir.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

/**
 * Garante que existe um usuário autenticado com profile válido.
 * Redireciona para /login caso contrário.
 */
export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

/**
 * Garante que o usuário autenticado tem um dos papéis permitidos.
 * Redireciona para /login (sem sessão) ou /dashboard (sessão sem permissão).
 */
export async function requireRole(allowedRoles: AppRole[]): Promise<Profile> {
  const profile = await requireAuth();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
