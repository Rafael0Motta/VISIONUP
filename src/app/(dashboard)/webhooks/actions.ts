"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWebhookSecret } from "@/lib/webhooks/hmac";
import { processPendingDeliveries, attemptDelivery, type PendingDelivery } from "@/lib/webhooks/process";
import type { WebhookEvent } from "@/lib/webhooks/catalog";

export type WebhookConfigFormState = { error: string | null };

export async function upsertWebhookConfig(
  event: WebhookEvent,
  _prevState: WebhookConfigFormState,
  formData: FormData
): Promise<WebhookConfigFormState> {
  const actor = await requireRole(["superadmin"]);
  const targetUrl = String(formData.get("target_url") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (isActive && !targetUrl) {
    return { error: "Informe a URL de destino antes de ativar o evento." };
  }
  if (targetUrl) {
    try {
      new URL(targetUrl);
    } catch {
      return { error: "URL inválida." };
    }
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("webhook_configs")
    .select("id")
    .eq("event", event)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("webhook_configs")
      .update({ target_url: targetUrl, is_active: isActive })
      .eq("id", existing.id);
    if (error) return { error: "Não foi possível salvar." };
  } else {
    const { error } = await supabase.from("webhook_configs").insert({
      event,
      target_url: targetUrl,
      is_active: isActive,
      hmac_secret: generateWebhookSecret(),
      created_by: actor.id,
    });
    if (error) return { error: "Não foi possível salvar." };
  }

  revalidatePath("/webhooks");
  return { error: null };
}

export async function regenerateWebhookSecret(event: WebhookEvent) {
  await requireRole(["superadmin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("webhook_configs")
    .update({ hmac_secret: generateWebhookSecret() })
    .eq("event", event);

  if (error) {
    throw new Error("Não foi possível gerar um novo segredo.");
  }

  revalidatePath("/webhooks");
}

export async function triggerWebhookSweep() {
  await requireRole(["superadmin"]);
  const result = await processPendingDeliveries();
  revalidatePath("/webhooks");
  return result;
}

/**
 * Reenvio manual de uma entrega específica — independe do status atual
 * (funciona pra "falhou", "entregue", etc.), diferente do sweep do cron que
 * só pega "pendente"/"retentando". webhook_deliveries só aceita escrita via
 * service role, por isso o client admin aqui em vez do supabase da sessão.
 */
export async function retryWebhookDelivery(deliveryId: string) {
  await requireRole(["superadmin"]);
  const admin = createAdminClient();

  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .select("id, event, payload, target_url, attempts, campaign_id, webhook_configs(target_url, hmac_secret)")
    .eq("id", deliveryId)
    .single();

  if (!delivery) {
    throw new Error("Entrega não encontrada.");
  }

  await attemptDelivery(admin, delivery as unknown as PendingDelivery);

  const { data: updated } = await admin
    .from("webhook_deliveries")
    .select("status")
    .eq("id", deliveryId)
    .single();

  revalidatePath("/webhooks");
  return { status: updated?.status ?? "desconhecido" };
}
