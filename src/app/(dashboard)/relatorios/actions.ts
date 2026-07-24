"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { parseReportFile, MAX_REPORT_FILE_SIZE_BYTES } from "@/lib/reports/parse";

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
  if (file.size > MAX_REPORT_FILE_SIZE_BYTES) {
    return { error: `Arquivo muito grande. Limite: ${Math.round(MAX_REPORT_FILE_SIZE_BYTES / 1024 / 1024)}MB.` };
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
    .select("id, raw_file_path")
    .eq("campaign_id", campaignId)
    .eq("origem", "manual")
    .maybeSingle();

  // Salva o arquivo original no Storage — sem isso não tem como o cliente
  // baixar essa planilha depois (antes só os números extraídos ficavam
  // salvos, o arquivo em si era descartado).
  const safeFileName = file.name.replace(/[^\w.-]+/g, "_").slice(-100);
  const storagePath = `${campaign.organization_id}/${campaignId}/relatorio-${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage
    .from("campaign-reports")
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo. Tente novamente." };
  }

  const reportRow = {
    enviados: parsed.enviados,
    entregues: parsed.entregues,
    lidos: parsed.lidos,
    falhados: parsed.falhados,
    expirados: parsed.expirados,
    custo: parsed.custo,
    raw_file_path: storagePath,
    importado_por: actor.id,
    importado_em: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("campaign_reports").update(reportRow).eq("id", existing.id);
    if (error) {
      await supabase.storage.from("campaign-reports").remove([storagePath]);
      return { error: "Não foi possível salvar o relatório." };
    }
    // Reenvio substituindo um relatório manual anterior — remove o arquivo
    // velho do Storage pra não acumular órfão a cada reimportação.
    if (existing.raw_file_path && existing.raw_file_path !== storagePath) {
      await supabase.storage.from("campaign-reports").remove([existing.raw_file_path]);
    }
  } else {
    const { error } = await supabase.from("campaign_reports").insert({
      campaign_id: campaignId,
      origem: "manual",
      ...reportRow,
    });
    if (error) {
      await supabase.storage.from("campaign-reports").remove([storagePath]);
      return { error: "Não foi possível salvar o relatório." };
    }
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

export async function deleteReport(reportId: string) {
  const actor = await requireRole(["superadmin"]);

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("campaign_reports")
    .select("raw_file_path, campaign_id, origem")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) {
    throw new Error("Relatório não encontrado.");
  }

  if (report.raw_file_path && report.raw_file_path.includes("/")) {
    await supabase.storage.from("campaign-reports").remove([report.raw_file_path]);
  }

  const { error } = await supabase.from("campaign_reports").delete().eq("id", reportId);
  if (error) {
    throw new Error("Não foi possível excluir o relatório.");
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id")
    .eq("id", report.campaign_id)
    .maybeSingle();

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "campaign_report_deleted",
    organization_id: campaign?.organization_id ?? null,
    campaign_id: report.campaign_id,
    metadata: { report_id: reportId, origem: report.origem },
  });

  revalidatePath("/relatorios");
}

function displayFileNameFromPath(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? storagePath;
  return base.replace(/^relatorio-\d+-/, "") || base;
}

/**
 * Só relatórios manuais têm arquivo — os automáticos (callback do n8n) são
 * só números, sem planilha nenhuma por trás. Cliente baixa a própria (RLS
 * do bucket já restringe isso); admin não tem acesso, mesma decisão que já
 * restringiu /relatorios a superadmin.
 */
export async function getReportDownloadUrl(
  campaignId: string
): Promise<{ url: string; fileName: string }> {
  await requireRole(["cliente", "superadmin"]);

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("campaign_reports")
    .select("raw_file_path")
    .eq("campaign_id", campaignId)
    .eq("origem", "manual")
    .not("raw_file_path", "is", null)
    .maybeSingle();

  if (!report?.raw_file_path) {
    throw new Error("Essa campanha não tem relatório com planilha disponível.");
  }
  if (!report.raw_file_path.includes("/")) {
    // Relatório importado antes do suporte a download — só o nome do
    // arquivo foi guardado, o arquivo em si nunca chegou a ser salvo.
    throw new Error("Esse relatório foi importado antes do suporte a download. Reimporte o arquivo em /relatorios pra habilitar.");
  }

  const fileName = displayFileNameFromPath(report.raw_file_path);
  const { data: signed, error } = await supabase.storage
    .from("campaign-reports")
    .createSignedUrl(report.raw_file_path, 60, { download: fileName });

  if (error || !signed) {
    throw new Error("Não foi possível gerar o link de download.");
  }

  return { url: signed.signedUrl, fileName };
}
