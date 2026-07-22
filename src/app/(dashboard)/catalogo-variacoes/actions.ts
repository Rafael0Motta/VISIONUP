"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type VariationFormState = { error: string | null };

export async function createVariation(
  _prevState: VariationFormState,
  formData: FormData
): Promise<VariationFormState> {
  const actor = await requireRole(["superadmin"]);
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Informe o texto da variação." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("message_variations").insert({
    content,
    created_by: actor.id,
  });

  if (error) {
    return { error: "Não foi possível criar a variação." };
  }

  revalidatePath("/catalogo-variacoes");
  return { error: null };
}

export async function toggleVariationActive(variationId: string) {
  await requireRole(["superadmin"]);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("message_variations")
    .select("is_active")
    .eq("id", variationId)
    .single();

  if (!current) return;

  await supabase
    .from("message_variations")
    .update({ is_active: !current.is_active })
    .eq("id", variationId);

  revalidatePath("/catalogo-variacoes");
}

export async function deleteVariation(variationId: string) {
  await requireRole(["superadmin"]);

  const supabase = await createClient();
  await supabase.from("message_variations").delete().eq("id", variationId);

  revalidatePath("/catalogo-variacoes");
}
