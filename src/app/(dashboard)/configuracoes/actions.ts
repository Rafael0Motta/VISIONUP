"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";

export type SettingsFormState = { error: string | null };

/**
 * Nome "de fachada" que só existe no front — a organização real (usada
 * pelas foreign keys, RLS etc.) não muda. Só o admin da própria organização
 * pode alterar, e só esse campo (a action nunca aceita outros dados de
 * organizations vindos do form).
 */
export async function updateOrganizationDisplayName(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const actor = await requireRole(["admin"]);

  if (!(await isFeatureEnabled("configuracoes.admin_pode_editar_nome_exibicao"))) {
    return { error: "Edição do nome de exibição está desativada." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ display_name: displayName || null })
    .eq("id", actor.organization_id as string);

  if (error) {
    return { error: "Não foi possível salvar o nome de exibição." };
  }

  revalidatePath("/configuracoes");
  return { error: null };
}
