"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STATUS_VALUES, type CampaignPipelineStatus } from "@/lib/campaigns/pipeline-status";

export type StatusUpdateFormState = { error: string | null };

function isPipelineStatus(value: string): value is CampaignPipelineStatus {
  return (PIPELINE_STATUS_VALUES as string[]).includes(value);
}

export async function addCampaignStatusUpdate(
  campaignId: string,
  _prevState: StatusUpdateFormState,
  formData: FormData
): Promise<StatusUpdateFormState> {
  const actor = await requireRole(["superadmin"]);

  const statusRaw = String(formData.get("status") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  const status = isPipelineStatus(statusRaw) ? statusRaw : null;

  if (!status && !comment) {
    return { error: "Escolha um status ou escreva um comentário." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("campaign_status_updates").insert({
    campaign_id: campaignId,
    status,
    comment: comment || null,
    created_by: actor.id,
  });

  if (error) {
    return { error: "Não foi possível registrar a atualização." };
  }

  revalidatePath(`/campanhas/${campaignId}`);
  return { error: null };
}
