"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";

export type ApprovalFormState = { error: string | null };

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export async function approveCampaign(campaignId: string) {
  const actor = await requireRole(["admin", "superadmin"]);

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id, name")
    .eq("id", campaignId)
    .eq("status", "aguardando_aprovacao")
    .single();

  if (!campaign) {
    throw new Error("Campanha não encontrada ou já processada.");
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "aprovado", approved_by: actor.id, approved_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (error) {
    throw new Error("Não foi possível aprovar a campanha.");
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_approved",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: { name: campaign.name },
  });
  await enqueueWebhook({
    event: "campaign_approved",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: { name: campaign.name },
  });

  revalidatePath("/aprovacoes");
}

export async function rejectCampaign(
  campaignId: string,
  _prevState: ApprovalFormState,
  formData: FormData
): Promise<ApprovalFormState> {
  const actor = await requireRole(["admin", "superadmin"]);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { error: "Informe o motivo da rejeição." };
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id, name")
    .eq("id", campaignId)
    .eq("status", "aguardando_aprovacao")
    .single();

  if (!campaign) {
    return { error: "Campanha não encontrada ou já processada." };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "rejeitado", rejection_reason: reason })
    .eq("id", campaignId);

  if (error) {
    return { error: "Não foi possível rejeitar a campanha." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_rejected",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: { name: campaign.name, reason },
  });
  await enqueueWebhook({
    event: "campaign_rejected",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: { name: campaign.name, reason },
  });

  revalidatePath("/aprovacoes");
  revalidatePath("/campanhas");
  return { error: null };
}

export async function releaseCampaign(campaignId: string) {
  const actor = await requireRole(["admin", "superadmin"]);

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "organization_id, name, contact_list_id, template_id, scheduled_at, profile_customization, templates(name, media_type, media_path, body_text, footer_text, buttons, variables)"
    )
    .eq("id", campaignId)
    .eq("status", "aprovado")
    .single();

  if (!campaign) {
    throw new Error("Campanha não encontrada ou ainda não aprovada.");
  }

  let signedUrl: string | null = null;
  if (campaign.contact_list_id) {
    const { data: contactList } = await supabase
      .from("contact_lists")
      .select("storage_path")
      .eq("id", campaign.contact_list_id)
      .single();

    if (contactList?.storage_path) {
      const { data: signed } = await supabase.storage
        .from("contact-lists")
        .createSignedUrl(contactList.storage_path, SIGNED_URL_TTL_SECONDS);
      signedUrl = signed?.signedUrl ?? null;
    }
  }

  const profileCustomization = campaign.profile_customization as {
    enabled?: boolean;
    display_name?: string | null;
    photo_path?: string | null;
  } | null;

  let profilePhotoSignedUrl: string | null = null;
  if (profileCustomization?.enabled && profileCustomization.photo_path) {
    const { data: signed } = await supabase.storage
      .from("campaign-profile-photos")
      .createSignedUrl(profileCustomization.photo_path, SIGNED_URL_TTL_SECONDS);
    profilePhotoSignedUrl = signed?.signedUrl ?? null;
  }

  const template = campaign.templates as {
    name: string;
    media_type: "none" | "image" | "video" | "text";
    media_path: string | null;
    body_text: string;
    footer_text: string | null;
    buttons: unknown;
    variables: unknown;
  } | null;

  let templateMediaSignedUrl: string | null = null;
  if (template?.media_path) {
    const { data: signed } = await supabase.storage
      .from("template-media")
      .createSignedUrl(template.media_path, SIGNED_URL_TTL_SECONDS);
    templateMediaSignedUrl = signed?.signedUrl ?? null;
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "liberado",
      released_by: actor.id,
      released_at: new Date().toISOString(),
      contact_list_signed_url: signedUrl,
      profile_photo_signed_url: profilePhotoSignedUrl,
      template_media_signed_url: templateMediaSignedUrl,
    })
    .eq("id", campaignId);

  if (error) {
    throw new Error("Não foi possível liberar a campanha.");
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_released",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: { name: campaign.name },
  });
  await enqueueWebhook({
    event: "campaign_released",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: {
      name: campaign.name,
      scheduled_at: campaign.scheduled_at,
      profile_customization: profileCustomization
        ? { ...profileCustomization, photo_url: profilePhotoSignedUrl }
        : null,
      template: template
        ? {
            name: template.name,
            media_type: template.media_type,
            media_url: templateMediaSignedUrl,
            body_text: template.body_text,
            footer_text: template.footer_text,
            buttons: template.buttons,
            variables: template.variables,
          }
        : null,
      contact_list_signed_url: signedUrl,
    },
  });

  revalidatePath("/aprovacoes");
}
