import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
