"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseContactsCsv, MAX_CONTACTS_CSV_SIZE_BYTES } from "@/lib/contacts/parse";
import {
  buildVariables,
  buildButtons,
  validateVariablesFilled,
  MAX_IMAGE_SIZE_BYTES,
  type TemplateVariable,
} from "@/lib/templates/parse";
import { uploadTemplateMedia, copyCatalogMediaToCampaign } from "@/lib/templates/media";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { isFeatureEnabled } from "@/lib/feature-flags";

export type CampaignFormState = { error: string | null };
export type TemplateFormState = { error: string | null };

export type ContactsPreviewRow = { phone: string; name: string | null; isValid: boolean };
export type ContactsPreview = {
  fileName: string;
  total: number;
  validCount: number;
  invalidCount: number;
  sampleRows: ContactsPreviewRow[];
};
export type ContactsUploadState = { error: string | null; preview?: ContactsPreview };

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

  // Bloqueio real (não só a UI escondendo o checkbox) — se a Central do
  // Sistema desativou essa funcionalidade, ignora o que veio do form.
  const profileEnabled =
    formData.get("profile_enabled") === "on" &&
    (await isFeatureEnabled("campanhas.personalizacao_perfil"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const photo = formData.get("photo");

  if (profileEnabled && photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_IMAGE_SIZE_BYTES) {
      return { error: `Foto muito grande. Limite: ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB.` };
    }
    if (!photo.type.startsWith("image/")) {
      return { error: "O arquivo enviado não parece ser uma imagem válida." };
    }
  }

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
    const safePhotoName = photo.name.replace(/[^\w.-]+/g, "_").slice(-100);
    photoPath = `${actor.organization_id}/${campaign.id}/perfil-${Date.now()}-${safePhotoName}`;
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

/**
 * Etapa "Mensagem" do wizard, unificada pra admin e cliente: ninguém digita
 * o corpo da mensagem — ele vem sempre de uma variação ativa do catálogo
 * (`message_variations`, gerenciado só pelo superadmin em
 * /catalogo-variacoes). O form manda um `variation_id` (nunca o texto em
 * si) e o servidor busca o conteúdo real, pra ninguém conseguir adulterar o
 * corpo via devtools. Cada campanha grava sua própria linha em `templates`
 * (mídia/rodapé/botões/variáveis são por campanha) porque `variables` fica
 * embutido na linha e duas campanhas não podem compartilhar uma só.
 */
export async function saveTemplateForCampaign(
  campaignId: string,
  existingTemplateId: string | null,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const actor = await requireRole(["admin", "cliente"]);
  if (!actor.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const supabase = await createClient();

  const variationId = formData.get("variation_id");
  let bodyText: string;
  let existingMediaPath: string | null = null;
  let variationMediaType: "none" | "image" | "video" | "text" | null = null;
  let variationMediaPath: string | null = null;

  if (existingTemplateId) {
    const { data: existing } = await supabase
      .from("templates")
      .select("body_text, media_path")
      .eq("id", existingTemplateId)
      .maybeSingle();
    if (!existing) {
      return { error: "Template não encontrado." };
    }
    bodyText = existing.body_text;
    existingMediaPath = existing.media_path;
  } else {
    bodyText = "";
  }

  if (typeof variationId === "string" && variationId) {
    const { data: variation } = await supabase
      .from("message_variations")
      .select("content, media_type, media_path")
      .eq("id", variationId)
      .eq("is_active", true)
      .maybeSingle();
    if (!variation) {
      return { error: "Selecione uma variação válida do catálogo." };
    }
    bodyText = variation.content;
    variationMediaType = variation.media_type;
    variationMediaPath = variation.media_path;
  } else if (!existingTemplateId) {
    return { error: "Selecione uma variação do catálogo." };
  }

  // Escape hatch: em vez do texto travado do catálogo, o usuário escreveu a
  // própria mensagem. Continua exigindo uma variação/linha de base (nunca dá
  // pra começar 100% do zero) e só funciona se a Central do Sistema permitir.
  const textOverridden = formData.get("text_override") === "on";
  if (textOverridden) {
    if (!(await isFeatureEnabled("campanhas.editar_texto_livre"))) {
      return { error: "Edição livre do texto está desativada." };
    }
    const customBodyText = String(formData.get("custom_body_text") ?? "").trim();
    if (!customBodyText) {
      return { error: "Informe o texto da mensagem." };
    }
    if (customBodyText.length > 1024) {
      return { error: "O texto não pode passar de 1024 caracteres." };
    }
    bodyText = customBodyText;
  }

  const variables = buildVariables(bodyText, formData);
  const variablesError = validateVariablesFilled(variables);
  if (variablesError) {
    return { error: variablesError };
  }

  const mediaType = String(formData.get("media_type") ?? "none");
  const footerText = String(formData.get("footer_text") ?? "").trim();
  const mediaFile = formData.get("media_file");
  const { path: uploadedMediaPath, error: mediaError } = await uploadTemplateMedia(
    supabase,
    actor.organization_id,
    mediaType,
    mediaFile instanceof File ? mediaFile : null
  );
  if (mediaError) {
    return { error: mediaError };
  }
  let mediaPath = uploadedMediaPath ?? (mediaType === "none" ? null : existingMediaPath);

  // Primeira vez que a campanha usa essa variação (sem arquivo próprio
  // enviado, sem mídia já salva): herda a mídia padrão do catálogo, copiando
  // pro storage da campanha.
  if (!mediaPath && mediaType !== "none" && variationMediaPath && variationMediaType === mediaType) {
    mediaPath = await copyCatalogMediaToCampaign(supabase, actor.organization_id, campaignId, variationMediaPath);
  }

  const admin = createAdminClient();
  const auditMetadata = {
    variation_id: typeof variationId === "string" ? variationId : null,
    origem: textOverridden ? "texto_editado" : "catalogo_variacoes",
  };

  if (existingTemplateId) {
    const { error } = await supabase
      .from("templates")
      .update({
        media_type: mediaType as "none" | "image" | "video" | "text",
        media_path: mediaPath,
        body_text: bodyText,
        footer_text: footerText || null,
        variables,
        buttons: buildButtons(formData),
        text_overridden: textOverridden,
      })
      .eq("id", existingTemplateId);

    if (error) {
      return { error: "Não foi possível atualizar a mensagem da campanha." };
    }

    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_updated",
      organization_id: actor.organization_id,
      campaign_id: campaignId,
      metadata: { template_id: existingTemplateId, ...auditMetadata },
    });
    await enqueueWebhook({
      event: "template_updated",
      organizationId: actor.organization_id,
      campaignId,
      actor,
      data: { template_id: existingTemplateId, ...auditMetadata },
    });
  } else {
    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        organization_id: actor.organization_id,
        name: `Campanha ${campaignId}`,
        media_type: mediaType as "none" | "image" | "video" | "text",
        media_path: mediaPath,
        body_text: bodyText,
        footer_text: footerText || null,
        variables,
        buttons: buildButtons(formData),
        use_variations: false,
        is_default: false,
        text_overridden: textOverridden,
        created_by: actor.id,
      })
      .select("id")
      .single();

    if (error || !template) {
      return { error: "Não foi possível salvar a mensagem da campanha." };
    }

    await supabase.from("campaigns").update({ template_id: template.id }).eq("id", campaignId);

    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "template_created",
      organization_id: actor.organization_id,
      campaign_id: campaignId,
      metadata: { template_id: template.id, ...auditMetadata },
    });
    await enqueueWebhook({
      event: "template_created",
      organizationId: actor.organization_id,
      campaignId,
      actor,
      data: { template_id: template.id, ...auditMetadata },
    });
  }

  revalidatePath(`/campanhas/${campaignId}`);
  redirect(`/campanhas/${campaignId}/contatos`);
}

export async function uploadCampaignContacts(
  campaignId: string,
  _prevState: ContactsUploadState,
  formData: FormData
): Promise<ContactsUploadState> {
  const actor = await requireRole(["admin", "cliente"]);
  if (!actor.organization_id) {
    return { error: "Organização não encontrada." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV." };
  }
  if (file.size > MAX_CONTACTS_CSV_SIZE_BYTES) {
    return { error: `Arquivo muito grande. Limite: ${Math.round(MAX_CONTACTS_CSV_SIZE_BYTES / 1024 / 1024)}MB.` };
  }

  const csvText = await file.text();
  const parsed = parseContactsCsv(csvText);

  if (parsed.error) {
    return { error: parsed.error };
  }
  if (parsed.total === 0) {
    return { error: "O arquivo não tem nenhuma linha de contato." };
  }
  if (parsed.validCount === 0) {
    return { error: "Nenhum contato com telefone válido foi encontrado no arquivo." };
  }

  const supabase = await createClient();

  const { data: existingCampaign } = await supabase
    .from("campaigns")
    .select("contact_list_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!existingCampaign) {
    return { error: "Campanha não encontrada ou sem permissão." };
  }
  const previousContactListId = existingCampaign.contact_list_id;

  // Sanitiza o nome original antes de compor a chave do storage — sem isso,
  // um arquivo com espaços, acentos ou caracteres especiais podia gerar uma
  // chave inválida/confusa (e quebrar o header Content-Disposition do
  // download, que usa esse mesmo nome).
  const safeFileName = file.name.replace(/[^\w.-]+/g, "_").slice(-100);
  const storagePath = `${actor.organization_id}/${campaignId}/contatos-${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage
    .from("contact-lists")
    .upload(storagePath, file, { contentType: "text/csv" });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo. Tente novamente." };
  }

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
    await supabase.storage.from("contact-lists").remove([storagePath]);
    return { error: "Não foi possível salvar a lista de contatos." };
  }

  // Os contatos NÃO são persistidos linha a linha no Postgres — os
  // contadores acima já vêm do parse em memória, e o arquivo original fica
  // no Storage (entregue ao n8n via URL assinada na liberação). Gravar
  // cada contato no banco encheria a tabela à toa em listas de 50k+ linhas.

  await supabase.from("campaigns").update({ contact_list_id: contactList.id }).eq("id", campaignId);

  // Se já existia uma lista anterior (usuário voltou no wizard e reenviou
  // outro arquivo), remove a antiga — senão cada reenvio deixa uma linha em
  // contact_lists e um arquivo no Storage órfãos pra sempre.
  if (previousContactListId && previousContactListId !== contactList.id) {
    const { data: oldList } = await supabase
      .from("contact_lists")
      .select("storage_path")
      .eq("id", previousContactListId)
      .maybeSingle();
    if (oldList?.storage_path) {
      await supabase.storage.from("contact-lists").remove([oldList.storage_path]);
    }
    await supabase.from("contact_lists").delete().eq("id", previousContactListId);
  }

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
  return {
    error: null,
    preview: {
      fileName: file.name,
      total: parsed.total,
      validCount: parsed.validCount,
      invalidCount: parsed.invalidCount,
      sampleRows: parsed.rows.slice(0, 8).map((r) => ({ phone: r.phone, name: r.name, isValid: r.isValid })),
    },
  };
}

/**
 * Etapa opcional do wizard — só informativa: grava a data desejada e avisa
 * o n8n (que notifica o ClickUp). O app nunca libera a campanha sozinho por
 * causa disso — a liberação de verdade continua manual em `releaseCampaign`.
 * Data em branco = pular agendamento, não grava nem emite nada.
 */
export async function scheduleCampaign(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const actor = await requireRole(["admin", "cliente"]);

  const scheduledAtRaw = String(formData.get("scheduled_at") ?? "").trim();
  if (!scheduledAtRaw) {
    redirect(`/campanhas/${campaignId}/confirmacao`);
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "Data inválida." };
  }
  if (scheduledAt.getTime() < Date.now()) {
    return { error: "A data de agendamento precisa ser no futuro." };
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    return { error: "Campanha não encontrada." };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ scheduled_at: scheduledAt.toISOString() })
    .eq("id", campaignId);

  if (error) {
    return { error: "Não foi possível salvar o agendamento." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_scheduled",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: { scheduled_at: scheduledAt.toISOString() },
  });
  await enqueueWebhook({
    event: "campaign_scheduled",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: { name: campaign.name, scheduled_at: scheduledAt.toISOString() },
  });

  revalidatePath(`/campanhas/${campaignId}`);
  redirect(`/campanhas/${campaignId}/confirmacao`);
}

export async function submitCampaignForApproval(
  campaignId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _prevState: CampaignFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _formData: FormData
): Promise<CampaignFormState> {
  const actor = await requireRole(["admin", "cliente"]);

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
    .update({ status: "aguardando_aprovacao" })
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

export async function deleteCampaign(campaignId: string) {
  const actor = await requireRole(["admin", "cliente"]);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id, name, status, organization_id")
    .eq("id", campaignId)
    // defesa extra: essa action nunca apaga campanha que já avançou além de
    // rascunho/rejeitada (a que já foi aprovada/liberada guarda histórico real).
    .in("status", ["rascunho", "rejeitado"])
    .maybeSingle();

  if (!existing) {
    throw new Error("Campanha não encontrada ou não está mais em rascunho/rejeitada.");
  }

  if (actor.role === "cliente" && !(await isFeatureEnabled("campanhas.exclusao_rascunho_cliente"))) {
    throw new Error("Exclusão de campanha está desativada para clientes.");
  }

  // Grava o audit_log ANTES de apagar: audit_log.campaign_id referencia
  // campaigns(id) on delete set null — inserir depois exigiria já apagar a
  // referência, perdendo o vínculo com o id da campanha no registro.
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_deleted",
    organization_id: existing.organization_id,
    campaign_id: existing.id,
    metadata: { name: existing.name, status: existing.status },
  });

  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) {
    throw new Error("Não foi possível excluir a campanha.");
  }

  revalidatePath("/campanhas");
}

/**
 * Gerado sob demanda (não na listagem) pra não desperdiçar uma URL assinada
 * por campanha a cada carregamento da página — só quando o usuário
 * realmente clica em baixar. RLS (via client da sessão) garante que só
 * baixa quem já pode enxergar a campanha e a lista de contatos dela.
 */
export async function getContactListDownloadUrl(
  campaignId: string
): Promise<{ url: string; fileName: string }> {
  await requireRole(["admin", "cliente", "superadmin"]);

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("contact_list_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign?.contact_list_id) {
    throw new Error("Essa campanha não tem planilha de contatos.");
  }

  const { data: contactList } = await supabase
    .from("contact_lists")
    .select("storage_path, file_name")
    .eq("id", campaign.contact_list_id)
    .maybeSingle();

  if (!contactList?.storage_path) {
    throw new Error("Planilha não encontrada.");
  }

  const fileName = contactList.file_name ?? "contatos.csv";
  const { data: signed, error } = await supabase.storage
    .from("contact-lists")
    .createSignedUrl(contactList.storage_path, 60, { download: fileName });

  if (error || !signed) {
    throw new Error("Não foi possível gerar o link de download.");
  }

  return { url: signed.signedUrl, fileName };
}
