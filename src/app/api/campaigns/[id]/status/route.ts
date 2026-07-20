import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { verifyN8nServiceToken } from "@/lib/webhooks/verify-service-token";
import type { WebhookEvent } from "@/lib/webhooks/catalog";

const VALID_STATUSES = ["enviando", "concluido", "falha"] as const;
type IncomingStatus = (typeof VALID_STATUSES)[number];

const EVENT_BY_STATUS: Record<IncomingStatus, WebhookEvent> = {
  enviando: "campaign_sending_started",
  concluido: "campaign_completed",
  falha: "campaign_failed",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyN8nServiceToken(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as string | undefined;

  if (!status || !VALID_STATUSES.includes(status as IncomingStatus)) {
    return NextResponse.json(
      { error: `status inválido. Use um de: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, status, organization_id, name")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });
  }

  // Idempotente: se já está nesse status (reenvio do n8n), não repete efeitos colaterais.
  if (campaign.status === status) {
    return NextResponse.json({ ok: true, status, idempotent: true });
  }

  const { error } = await admin
    .from("campaigns")
    .update({ status: status as IncomingStatus })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "não foi possível atualizar o status" }, { status: 500 });
  }

  const event = EVENT_BY_STATUS[status as IncomingStatus];
  const errorMessage = typeof body?.error_message === "string" ? body.error_message : null;

  await admin.from("audit_log").insert({
    actor_id: null,
    actor_role: null,
    action: event,
    organization_id: campaign.organization_id,
    campaign_id: id,
    metadata: {
      source: "n8n_callback",
      previous_status: campaign.status,
      new_status: status,
      error_message: errorMessage,
    },
  });

  await enqueueWebhook({
    event,
    organizationId: campaign.organization_id,
    campaignId: id,
    actor: { id: "n8n", role: "system" },
    data: { name: campaign.name, status, error_message: errorMessage },
  });

  return NextResponse.json({ ok: true, status });
}
