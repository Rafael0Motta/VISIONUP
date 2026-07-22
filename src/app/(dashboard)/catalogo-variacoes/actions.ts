"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buildButtons } from "@/lib/templates/parse";
import { uploadCatalogMedia } from "@/lib/templates/media";

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
  if (content.length > 1024) {
    return { error: "O texto não pode passar de 1024 caracteres." };
  }

  const mediaType = String(formData.get("media_type") ?? "none");
  const footerText = String(formData.get("footer_text") ?? "").trim();

  const supabase = await createClient();

  const mediaFile = formData.get("media_file");
  const { path: mediaPath, error: mediaError } = await uploadCatalogMedia(
    supabase,
    mediaType,
    mediaFile instanceof File ? mediaFile : null
  );
  if (mediaError) {
    return { error: mediaError };
  }

  const { error } = await supabase.from("message_variations").insert({
    content,
    media_type: mediaType as "none" | "image" | "video" | "text",
    media_path: mediaPath,
    footer_text: footerText || null,
    buttons: buildButtons(formData),
    created_by: actor.id,
  });

  if (error) {
    return { error: "Não foi possível criar a variação." };
  }

  revalidatePath("/catalogo-variacoes");
  return { error: null };
}

export async function updateVariation(
  variationId: string,
  _prevState: VariationFormState,
  formData: FormData
): Promise<VariationFormState> {
  await requireRole(["superadmin"]);
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Informe o texto da variação." };
  }
  if (content.length > 1024) {
    return { error: "O texto não pode passar de 1024 caracteres." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("message_variations")
    .select("media_path")
    .eq("id", variationId)
    .maybeSingle();

  if (!existing) {
    return { error: "Variação não encontrada." };
  }

  const mediaType = String(formData.get("media_type") ?? "none");
  const footerText = String(formData.get("footer_text") ?? "").trim();

  const mediaFile = formData.get("media_file");
  const { path: uploadedMediaPath, error: mediaError } = await uploadCatalogMedia(
    supabase,
    mediaType,
    mediaFile instanceof File ? mediaFile : null
  );
  if (mediaError) {
    return { error: mediaError };
  }
  const mediaPath = uploadedMediaPath ?? (mediaType === "none" ? null : existing.media_path);

  const { error } = await supabase
    .from("message_variations")
    .update({
      content,
      media_type: mediaType as "none" | "image" | "video" | "text",
      media_path: mediaPath,
      footer_text: footerText || null,
      buttons: buildButtons(formData),
    })
    .eq("id", variationId);

  if (error) {
    return { error: "Não foi possível atualizar a variação." };
  }

  revalidatePath("/catalogo-variacoes");
  revalidatePath(`/catalogo-variacoes/${variationId}`);
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
