"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseContactsCsv } from "@/lib/contacts/parse";
import {
  buildVariables,
  buildButtons,
  validateVariablesFilled,
  type TemplateVariable,
} from "@/lib/templates/parse";
import { uploadTemplateMedia } from "@/lib/templates/media";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import type { TemplateFormState } from "@/app/(dashboard)/templates/actions";

export type CampaignFormState = { error: string | null };

export async function createCampaignDraft(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const actor = await requireRole(["admin", "cliente"]);
  if (!actor.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Informe o nome da campanha." };
  }

  const profileEnabled = formData.get("profile_enabled") === "on";
  const displayName = String(formData.get("display_name") ?? "").trim();
  const photo = formData.get("photo");

  const supabase = await createClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: actor.organization_id,
      created_by: actor.id,
      name,
      status: "rascunho",
      profile_customization: { enabled: profileEnabled },
    })
    .select("id")
    .single();

  if (error || !campaign) {
    return { error: "Não foi possível criar a campanha." };
  }

  let photoPath: string | null = null;
  if (profileEnabled && photo instanceof File && photo.size > 0) {
    photoPath = `${actor.organization_id}/${campaign.id}/perfil-${Date.now()}-${photo.name}`;
    const { error: uploadError } = await supabase.storage
      .from("campaign-profile-photos")
      .upload(photoPath, photo, { contentType: photo.type });
    if (uploadError) {
      photoPath = null;
    }
  }

  await supabase
    .from("campaigns")
    .update({
      profile_customization: {
        enabled: profileEnabled,
        display_name: profileEnabled ? displayName || null : null,
        photo_path: photoPath,
      },
    })
    .eq("id", campaign.id);

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_created",
    organization_id: actor.organization_id,
    campaign_id: campaign.id,
    metadata: { name },
  });
  await enqueueWebhook({
    event: "campaign_created",
    organizationId: actor.organization_id,
    campaignId: campaign.id,
    actor,
    data: { name },
  });

  revalidatePath("/campanhas");
  redirect(`/campanhas/${campaign.id}/mensagem`);
}

export async function createTemplateForCampaign(
  campaignId: string,
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

  const { data: template, error } = await supabase
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

  if (error || !template) {
    return { error: "Não foi possível criar o template (nome já usado na organização?)." };
  }

  await supabase.from("campaigns").update({ template_id: template.id }).eq("id", campaignId);

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "template_created",
    organization_id: actor.organization_id,
    campaign_id: campaignId,
    metadata: { template_id: template.id, name },
  });
  await enqueueWebhook({
    event: "template_created",
    organizationId: actor.organization_id,
    campaignId,
    actor,
    data: { template_id: template.id, name },
  });
  if (isDefault) {
    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_set_as_default",
      organization_id: actor.organization_id,
      campaign_id: campaignId,
      metadata: { template_id: template.id, name },
    });
    await enqueueWebhook({
      event: "template_set_as_default",
      organizationId: actor.organization_id,
      campaignId,
      actor,
      data: { template_id: template.id, name },
    });
  }

  revalidatePath(`/campanhas/${campaignId}`);
  redirect(`/campanhas/${campaignId}/contatos`);
}

export async function updateTemplateForCampaignStep(
  campaignId: string,
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
    campaign_id: campaignId,
    metadata: { template_id: templateId, name },
  });
  await enqueueWebhook({
    event: "template_updated",
    organizationId: existing.organization_id,
    campaignId,
    actor,
    data: { template_id: templateId, name },
  });
  if (isDefault && !existing.is_default) {
    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_set_as_default",
      organization_id: existing.organization_id,
      campaign_id: campaignId,
      metadata: { template_id: templateId, name },
    });
    await enqueueWebhook({
      event: "template_set_as_default",
      organizationId: existing.organization_id,
      campaignId,
      actor,
      data: { template_id: templateId, name },
    });
  }

  revalidatePath(`/campanhas/${campaignId}`);
  redirect(`/campanhas/${campaignId}/contatos`);
}

export async function uploadCampaignContacts(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const actor = await requireRole(["admin", "cliente"]);
  if (!actor.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV." };
  }

  const csvText = await file.text();
  const parsed = parseContactsCsv(csvText);

  if (parsed.error) {
    return { error: parsed.error };
  }
  if (parsed.total === 0) {
    return { error: "O arquivo não tem nenhuma linha de contato." };
  }

  const supabase = await createClient();

  const storagePath = `${actor.organization_id}/${campaignId}/contatos-${Date.now()}-${file.name}`;
  await supabase.storage.from("contact-lists").upload(storagePath, file, { contentType: "text/csv" });

  const { data: contactList, error: listError } = await supabase
    .from("contact_lists")
    .insert({
      organization_id: actor.organization_id,
      campaign_id: campaignId,
      file_name: file.name,
      storage_path: storagePath,
      total_contacts: parsed.total,
      valid_contacts: parsed.validCount,
      invalid_contacts: parsed.invalidCount,
      status: "validated",
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (listError || !contactList) {
    return { error: "Não foi possível salvar a lista de contatos." };
  }

  // Os contatos NÃO são persistidos linha a linha no Postgres — os
  // contadores acima já vêm do parse em memória, e o arquivo original fica
  // no Storage (entregue ao n8n via URL assinada na liberação). Gravar
  // cada contato no banco encheria a tabela à toa em listas de 50k+ linhas.

  await supabase.from("campaigns").update({ contact_list_id: contactList.id }).eq("id", campaignId);

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "contact_list_uploaded",
    organization_id: actor.organization_id,
    campaign_id: campaignId,
    metadata: { total: parsed.total, validos: parsed.validCount, invalidos: parsed.invalidCount },
  });
  await enqueueWebhook({
    event: "contact_list_uploaded",
    organizationId: actor.organization_id,
    campaignId,
    actor,
    data: { contact_list_id: contactList.id, total: parsed.total },
  });
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "contact_list_validated",
    organization_id: actor.organization_id,
    campaign_id: campaignId,
    metadata: { total: parsed.total, validos: parsed.validCount, invalidos: parsed.invalidCount },
  });
  await enqueueWebhook({
    event: "contact_list_validated",
    organizationId: actor.organization_id,
    campaignId,
    actor,
    data: {
      contact_list_id: contactList.id,
      total: parsed.total,
      validos: parsed.validCount,
      invalidos: parsed.invalidCount,
    },
  });

  revalidatePath(`/campanhas/${campaignId}`);
  redirect(`/campanhas/${campaignId}/agendamento`);
}

export async function submitCampaignForApproval(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const actor = await requireRole(["admin", "cliente"]);
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id, template_id, contact_list_id, name")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { error: "Campanha não encontrada." };
  }
  if (!campaign.template_id) {
    return { error: "Selecione um template antes de enviar para aprovação." };
  }
  if (!campaign.contact_list_id) {
    return { error: "Envie a lista de contatos antes de enviar para aprovação." };
  }

  const { data: template } = await supabase
    .from("templates")
    .select("variables")
    .eq("id", campaign.template_id)
    .single();
  const variablesError = validateVariablesFilled(
    (template?.variables as unknown as TemplateVariable[]) ?? []
  );
  if (variablesError) {
    return { error: variablesError };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: "aguardando_aprovacao",
    })
    .eq("id", campaignId);

  if (error) {
    return { error: "Não foi possível enviar a campanha para aprovação." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_submitted_for_approval",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: { name: campaign.name },
  });
  await enqueueWebhook({
    event: "campaign_submitted_for_approval",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: { name: campaign.name },
  });

  revalidatePath("/campanhas");
  revalidatePath(`/campanhas/${campaignId}`);
  redirect("/campanhas");
}
