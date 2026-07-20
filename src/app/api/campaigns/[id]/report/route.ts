import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { verifyN8nServiceToken } from "@/lib/webhooks/verify-service-token";

function toNonNegativeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyN8nServiceToken(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "corpo da requisição inválido" }, { status: 400 });
  }

  const enviados = toNonNegativeInt(body.enviados);
  const entregues = toNonNegativeInt(body.entregues);
  const lidos = toNonNegativeInt(body.lidos);
  const falhados = toNonNegativeInt(body.falhados);
  const expirados = toNonNegativeInt(body.expirados);
  const custo = body.custo === undefined || body.custo === null ? null : Number(body.custo);

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, organization_id, name")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });
  }

  // Idempotente: reenvio do n8n atualiza o relatório automático existente
  // em vez de duplicar a linha.
  const { data: existing } = await admin
    .from("campaign_reports")
    .select("id")
    .eq("campaign_id", id)
    .eq("origem", "automatico")
    .maybeSingle();

  if (existing) {
    await admin
      .from("campaign_reports")
      .update({ enviados, entregues, lidos, falhados, expirados, custo, importado_em: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin.from("campaign_reports").insert({
      campaign_id: id,
      origem: "automatico",
      enviados,
      entregues,
      lidos,
      falhados,
      expirados,
      custo,
    });
  }

  await admin.from("audit_log").insert({
    actor_id: null,
    actor_role: null,
    action: "campaign_report_added",
    organization_id: campaign.organization_id,
    campaign_id: id,
    metadata: { source: "n8n_callback", origem: "automatico", enviados, entregues, lidos, falhados, expirados },
  });

  await enqueueWebhook({
    event: "campaign_report_added",
    organizationId: campaign.organization_id,
    campaignId: id,
    actor: { id: "n8n", role: "system" },
    data: { origem: "automatico", enviados, entregues, lidos, falhados, expirados, custo },
  });

  return NextResponse.json({ ok: true });
}
