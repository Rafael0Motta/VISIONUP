"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { parseReportFile } from "@/lib/reports/parse";

export type ReportFormState = { error: string | null };

export async function uploadManualReport(
  campaignId: string,
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const actor = await requireRole(["superadmin"]);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV ou XLSX." };
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, organization_id, name, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { error: "Campanha não encontrada ou sem permissão." };
  }

  const parsed = await parseReportFile(file);
  if (parsed.error) {
    return { error: parsed.error };
  }

  const { data: existing } = await supabase
    .from("campaign_reports")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("origem", "manual")
    .maybeSingle();

  const reportRow = {
    enviados: parsed.enviados,
    entregues: parsed.entregues,
    lidos: parsed.lidos,
    falhados: parsed.falhados,
    expirados: parsed.expirados,
    custo: parsed.custo,
    importado_por: actor.id,
    importado_em: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("campaign_reports").update(reportRow).eq("id", existing.id);
    if (error) return { error: "Não foi possível salvar o relatório." };
  } else {
    const { error } = await supabase.from("campaign_reports").insert({
      campaign_id: campaignId,
      origem: "manual",
      raw_file_path: file.name,
      ...reportRow,
    });
    if (error) return { error: "Não foi possível salvar o relatório." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_report_added",
    organization_id: campaign.organization_id,
    campaign_id: campaignId,
    metadata: {
      origem: "manual",
      file_name: file.name,
      enviados: parsed.enviados,
      entregues: parsed.entregues,
      lidos: parsed.lidos,
      falhados: parsed.falhados,
      expirados: parsed.expirados,
    },
  });

  await enqueueWebhook({
    event: "campaign_report_added",
    organizationId: campaign.organization_id,
    campaignId,
    actor,
    data: {
      origem: "manual",
      enviados: parsed.enviados,
      entregues: parsed.entregues,
      lidos: parsed.lidos,
      falhados: parsed.falhados,
      expirados: parsed.expirados,
      custo: parsed.custo,
    },
  });

  // Importar o relatório final significa que o disparo terminou — conclui a
  // campanha automaticamente (idempotente: só mexe se ainda não estava lá).
  if (campaign.status !== "concluido") {
    const { error: statusError } = await supabase
      .from("campaigns")
      .update({ status: "concluido" })
      .eq("id", campaignId);

    if (!statusError) {
      await admin.from("audit_log").insert({
        actor_id: actor.id,
        actor_role: actor.role,
        action: "campaign_completed",
        organization_id: campaign.organization_id,
        campaign_id: campaignId,
        metadata: { source: "relatorio_manual", previous_status: campaign.status },
      });

      await enqueueWebhook({
        event: "campaign_completed",
        organizationId: campaign.organization_id,
        campaignId,
        actor,
        data: { name: campaign.name, status: "concluido", source: "relatorio_manual" },
      });
    }
  }

  revalidatePath("/relatorios");
  revalidatePath("/campanhas");
  revalidatePath("/aprovacoes");
  revalidatePath("/dashboard");
  return { error: null };
}
