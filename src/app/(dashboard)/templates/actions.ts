"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVariables, buildButtons, validateVariablesFilled } from "@/lib/templates/parse";
import { uploadTemplateMedia } from "@/lib/templates/media";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";

export type TemplateFormState = { error: string | null };

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const actor = await requireRole(["admin", "cliente"]);
  if (!actor.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const bodyText = String(formData.get("body_text") ?? "").trim();
  const mediaType = String(formData.get("media_type") ?? "none");
  const footerText = String(formData.get("footer_text") ?? "").trim();
  const useVariations = formData.get("use_variations") === "on";
  const isDefault = actor.role === "admin" && formData.get("is_default") === "on";

  if (!name || !bodyText) {
    return { error: "Informe nome e texto do template." };
  }
  if (bodyText.length > 1024) {
    return { error: "O texto não pode passar de 1024 caracteres." };
  }

  const variables = buildVariables(bodyText, formData);
  const variablesError = validateVariablesFilled(variables);
  if (variablesError) {
    return { error: variablesError };
  }

  const supabase = await createClient();

  const mediaFile = formData.get("media_file");
  const { path: mediaPath, error: mediaError } = await uploadTemplateMedia(
    supabase,
    actor.organization_id,
    mediaType,
    mediaFile instanceof File ? mediaFile : null
  );
  if (mediaError) {
    return { error: mediaError };
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      organization_id: actor.organization_id,
      name,
      media_type: mediaType as "none" | "image" | "video" | "text",
      media_path: mediaPath,
      body_text: bodyText,
      footer_text: footerText || null,
      variables,
      buttons: buildButtons(formData),
      use_variations: useVariations,
      is_default: isDefault,
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível criar o template (nome já usado na organização?)." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "template_created",
    organization_id: actor.organization_id,
    metadata: { template_id: data.id, name },
  });
  await enqueueWebhook({
    event: "template_created",
    organizationId: actor.organization_id,
    actor,
    data: { template_id: data.id, name },
  });
  if (isDefault) {
    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_set_as_default",
      organization_id: actor.organization_id,
      metadata: { template_id: data.id, name },
    });
    await enqueueWebhook({
      event: "template_set_as_default",
      organizationId: actor.organization_id,
      actor,
      data: { template_id: data.id, name },
    });
  }

  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplate(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const actor = await requireRole(["admin", "cliente"]);

  const name = String(formData.get("name") ?? "").trim();
  const bodyText = String(formData.get("body_text") ?? "").trim();
  const mediaType = String(formData.get("media_type") ?? "none");
  const footerText = String(formData.get("footer_text") ?? "").trim();
  const useVariations = formData.get("use_variations") === "on";

  if (!name || !bodyText) {
    return { error: "Informe nome e texto do template." };
  }
  if (bodyText.length > 1024) {
    return { error: "O texto não pode passar de 1024 caracteres." };
  }

  const variables = buildVariables(bodyText, formData);
  const variablesError = validateVariablesFilled(variables);
  if (variablesError) {
    return { error: variablesError };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("templates")
    .select("is_default, organization_id, media_path")
    .eq("id", templateId)
    .single();

  if (!existing) {
    return { error: "Template não encontrado." };
  }

  const isDefault =
    actor.role === "admin" ? formData.get("is_default") === "on" : existing.is_default;

  const mediaFile = formData.get("media_file");
  const { path: uploadedMediaPath, error: mediaError } = await uploadTemplateMedia(
    supabase,
    existing.organization_id,
    mediaType,
    mediaFile instanceof File ? mediaFile : null
  );
  if (mediaError) {
    return { error: mediaError };
  }
  // Sem arquivo novo: mantém a mídia já salva (a menos que o tipo tenha
  // virado "texto", aí não faz sentido guardar o path antigo).
  const mediaPath =
    uploadedMediaPath ?? (mediaType === "none" ? null : existing.media_path);

  const { error } = await supabase
    .from("templates")
    .update({
      name,
      media_type: mediaType as "none" | "image" | "video" | "text",
      media_path: mediaPath,
      body_text: bodyText,
      footer_text: footerText || null,
      variables,
      buttons: buildButtons(formData),
      use_variations: useVariations,
      is_default: isDefault,
    })
    .eq("id", templateId);

  if (error) {
    return { error: "Não foi possível atualizar o template." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "template_updated",
    organization_id: existing.organization_id,
    metadata: { template_id: templateId, name },
  });
  await enqueueWebhook({
    event: "template_updated",
    organizationId: existing.organization_id,
    actor,
    data: { template_id: templateId, name },
  });
  if (isDefault && !existing.is_default) {
    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_set_as_default",
      organization_id: existing.organization_id,
      metadata: { template_id: templateId, name },
    });
    await enqueueWebhook({
      event: "template_set_as_default",
      organizationId: existing.organization_id,
      actor,
      data: { template_id: templateId, name },
    });
  }

  revalidatePath("/templates");
  return { error: null };
}

export async function deleteTemplate(templateId: string) {
  const actor = await requireRole(["admin", "cliente"]);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("templates")
    .select("organization_id, name")
    .eq("id", templateId)
    .single();

  const { error } = await supabase.from("templates").delete().eq("id", templateId);

  if (error) {
    throw new Error("Não foi possível excluir o template.");
  }

  if (existing) {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_deleted",
      organization_id: existing.organization_id,
      metadata: { template_id: templateId, name: existing.name },
    });
  }

  revalidatePath("/templates");
}
