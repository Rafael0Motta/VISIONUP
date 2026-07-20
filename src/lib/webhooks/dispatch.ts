import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { attemptDelivery } from "./process";
import type { WebhookEvent } from "./catalog";
import type { Json } from "@/types/supabase";

/**
 * Registra a intenção de entrega e dispara a primeira tentativa de envio na
 * hora, sem o caller esperar a resposta do n8n (a promise não é aguardada —
 * o processo do Node segue vivo depois da server action retornar, então a
 * entrega acontece em paralelo). Se essa tentativa falhar ou o processo
 * cair antes dela terminar, o sweep do cron (src/lib/webhooks/process.ts,
 * a cada 2 min) pega a entrega pelo status "pendente"/"retentando" — por
 * isso o insert sempre acontece antes do disparo, nunca só em memória.
 */
export async function enqueueWebhook(params: {
  event: WebhookEvent;
  organizationId: string | null;
  campaignId?: string | null;
  actor: { id: string; role: string };
  data: Record<string, unknown>;
}) {
  const admin = createAdminClient();

  const { data: config } = await admin
    .from("webhook_configs")
    .select("id, target_url, hmac_secret")
    .eq("event", params.event)
    .eq("is_active", true)
    .maybeSingle();

  // Sem endpoint configurado/ativo para esse evento: no-op silencioso.
  if (!config) return;

  const payload = {
    event: params.event,
    campaign_id: params.campaignId ?? null,
    organization_id: params.organizationId,
    actor: { id: params.actor.id, role: params.actor.role },
    timestamp: new Date().toISOString(),
    data: params.data,
  };

  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .insert({
      webhook_config_id: config.id,
      event: params.event,
      campaign_id: params.campaignId ?? null,
      payload: payload as unknown as Json,
      target_url: config.target_url,
      status: "pendente",
    })
    .select("id, attempts")
    .single();

  if (!delivery) return;

  void attemptDelivery(admin, {
    id: delivery.id,
    event: params.event,
    payload,
    target_url: config.target_url,
    attempts: delivery.attempts,
    campaign_id: params.campaignId ?? null,
    webhook_configs: { target_url: config.target_url, hmac_secret: config.hmac_secret },
  }).catch((err) => {
    console.error(`[webhooks] falha na tentativa imediata de "${params.event}":`, err);
  });
}
