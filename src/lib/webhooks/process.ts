import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signPayload } from "./hmac";
import type { Json } from "@/types/supabase";

const BACKOFF_MINUTES = [2, 10, 30, 120, 360];
const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1; // 1 tentativa inicial + 5 retries
const REQUEST_TIMEOUT_MS = 10_000;
const BATCH_LIMIT = 25;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export type PendingDelivery = {
  id: string;
  event: string;
  payload: unknown;
  target_url: string;
  attempts: number;
  campaign_id: string | null;
  webhook_configs: { target_url: string; hmac_secret: string } | null;
};

export async function processPendingDeliveries(): Promise<{ processed: number }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: deliveries } = await admin
    .from("webhook_deliveries")
    .select("id, event, payload, target_url, attempts, campaign_id, webhook_configs(target_url, hmac_secret)")
    .in("status", ["pendente", "retentando"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  for (const delivery of (deliveries ?? []) as unknown as PendingDelivery[]) {
    await attemptDelivery(admin, delivery);
  }

  return { processed: deliveries?.length ?? 0 };
}

/**
 * O payload gravado na entrega é uma foto do momento em que o evento foi
 * enfileirado — mas URLs assinadas do Storage expiram e podem ter sido
 * geradas antes de existir link (ex: entregas antigas, de antes desse
 * campo existir). Por isso toda tentativa de envio (automática ou manual)
 * regenera essas URLs a partir do estado atual da campanha antes de
 * montar o corpo da requisição, em vez de reenviar o valor congelado.
 */
async function refreshSignedUrls(
  admin: ReturnType<typeof createAdminClient>,
  campaignId: string | null,
  payload: unknown
): Promise<unknown> {
  if (!campaignId || typeof payload !== "object" || payload === null) return payload;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return payload;

  const dataObj = data as Record<string, unknown>;
  const needsContactList = "contact_list_signed_url" in dataObj;
  const needsProfilePhoto =
    "profile_customization" in dataObj &&
    typeof dataObj.profile_customization === "object" &&
    dataObj.profile_customization !== null;
  // Não exige que a chave media_url já exista — entregas antigas (de antes
  // desse campo passar a ser enviado) têm o objeto "template" sem ela, e
  // ainda assim precisam ganhar o link ao serem reenviadas.
  const needsTemplateMedia =
    "template" in dataObj &&
    typeof dataObj.template === "object" &&
    dataObj.template !== null &&
    "media_type" in (dataObj.template as Record<string, unknown>);

  if (!needsContactList && !needsProfilePhoto && !needsTemplateMedia) return payload;

  const { data: campaign } = await admin
    .from("campaigns")
    .select("contact_list_id, profile_customization, template_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return payload;

  if (needsContactList) {
    let contactListUrl: string | null = null;
    if (campaign.contact_list_id) {
      const { data: contactList } = await admin
        .from("contact_lists")
        .select("storage_path")
        .eq("id", campaign.contact_list_id)
        .maybeSingle();
      if (contactList?.storage_path) {
        const { data: signed } = await admin.storage
          .from("contact-lists")
          .createSignedUrl(contactList.storage_path, SIGNED_URL_TTL_SECONDS);
        contactListUrl = signed?.signedUrl ?? null;
      }
    }
    dataObj.contact_list_signed_url = contactListUrl;
  }

  if (needsProfilePhoto) {
    const profileCustomization = campaign.profile_customization as {
      enabled?: boolean;
      photo_path?: string | null;
    } | null;
    let photoUrl: string | null = null;
    if (profileCustomization?.enabled && profileCustomization.photo_path) {
      const { data: signed } = await admin.storage
        .from("campaign-profile-photos")
        .createSignedUrl(profileCustomization.photo_path, SIGNED_URL_TTL_SECONDS);
      photoUrl = signed?.signedUrl ?? null;
    }
    dataObj.profile_customization = {
      ...(dataObj.profile_customization as Record<string, unknown>),
      photo_url: photoUrl,
    };
  }

  if (needsTemplateMedia) {
    let mediaUrl: string | null = null;
    if (campaign.template_id) {
      const { data: template } = await admin
        .from("templates")
        .select("media_path")
        .eq("id", campaign.template_id)
        .maybeSingle();
      if (template?.media_path) {
        const { data: signed } = await admin.storage
          .from("template-media")
          .createSignedUrl(template.media_path, SIGNED_URL_TTL_SECONDS);
        mediaUrl = signed?.signedUrl ?? null;
      }
    }
    dataObj.template = {
      ...(dataObj.template as Record<string, unknown>),
      media_url: mediaUrl,
    };
  }

  return payload;
}

export async function attemptDelivery(
  admin: ReturnType<typeof createAdminClient>,
  delivery: PendingDelivery
) {
  const secret = delivery.webhook_configs?.hmac_secret;
  // A URL gravada na entrega é só um retrato de quando ela foi enfileirada —
  // toda tentativa (retry automático ou reenvio manual) deve usar a URL
  // atual da configuração, senão editar o endpoint em /webhooks não tem
  // efeito nenhum sobre entregas que já estavam na fila.
  const targetUrl = delivery.webhook_configs?.target_url ?? delivery.target_url;
  const payload = await refreshSignedUrls(admin, delivery.campaign_id, delivery.payload);
  const body = JSON.stringify(payload);
  const attempts = delivery.attempts + 1;
  const nowIso = new Date().toISOString();

  if (!secret) {
    await admin
      .from("webhook_deliveries")
      .update({ status: "falhou", attempts, last_attempt_at: nowIso, response_body: "webhook_config sem segredo HMAC" })
      .eq("id", delivery.id);
    return;
  }

  try {
    const signature = signPayload(secret, body);
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VisionUp-Event": delivery.event,
        "X-VisionUp-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseBody = await res.text().catch(() => "");

    if (res.ok) {
      await admin
        .from("webhook_deliveries")
        .update({
          status: "entregue",
          attempts,
          target_url: targetUrl,
          payload: payload as Json,
          last_attempt_at: nowIso,
          response_status: res.status,
          response_body: responseBody.slice(0, 2000),
          next_retry_at: null,
        })
        .eq("id", delivery.id);
    } else {
      await scheduleRetryOrFail(admin, delivery.id, attempts, targetUrl, payload, res.status, responseBody);
    }
  } catch (err) {
    await scheduleRetryOrFail(
      admin,
      delivery.id,
      attempts,
      targetUrl,
      payload,
      null,
      err instanceof Error ? err.message : "erro desconhecido"
    );
  }
}

async function scheduleRetryOrFail(
  admin: ReturnType<typeof createAdminClient>,
  deliveryId: string,
  attempts: number,
  targetUrl: string,
  payload: unknown,
  responseStatus: number | null,
  responseBody: string
) {
  const nowIso = new Date().toISOString();

  if (attempts >= MAX_ATTEMPTS) {
    await admin
      .from("webhook_deliveries")
      .update({
        status: "falhou",
        attempts,
        target_url: targetUrl,
        payload: payload as Json,
        last_attempt_at: nowIso,
        response_status: responseStatus,
        response_body: responseBody.slice(0, 2000),
        next_retry_at: null,
      })
      .eq("id", deliveryId);
    return;
  }

  const minutes = BACKOFF_MINUTES[attempts - 1] ?? BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1];
  const nextRetryAt = new Date(Date.now() + minutes * 60_000).toISOString();

  await admin
    .from("webhook_deliveries")
    .update({
      status: "retentando",
      attempts,
      target_url: targetUrl,
      payload: payload as Json,
      last_attempt_at: nowIso,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 2000),
      next_retry_at: nextRetryAt,
    })
    .eq("id", deliveryId);
}
