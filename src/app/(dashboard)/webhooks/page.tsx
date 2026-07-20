import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS } from "@/lib/webhooks/catalog";
import { WebhookConfigRow } from "./webhook-config-row";
import { SweepButton } from "./sweep-button";
import { ResendDeliveryButton } from "./resend-delivery-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DELIVERY_STATUS_TONE: Record<string, "warning" | "success" | "destructive" | "neutral"> = {
  pendente: "neutral",
  retentando: "warning",
  entregue: "success",
  falhou: "destructive",
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  retentando: "Retentando",
  entregue: "Entregue",
  falhou: "Falhou",
};

export default async function WebhooksPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const [{ data: configs }, { data: deliveries }] = await Promise.all([
    supabase.from("webhook_configs").select("event, target_url, is_active, hmac_secret"),
    supabase
      .from("webhook_deliveries")
      .select("id, event, status, attempts, target_url, created_at, last_attempt_at, response_status")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const configByEvent = new Map((configs ?? []).map((c) => [c.event, c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Configure os endpoints do n8n para cada evento e acompanhe as entregas.
          </p>
        </div>
        <SweepButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints por evento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Segredo HMAC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEBHOOK_EVENTS.map((event) => {
                const config = configByEvent.get(event);
                return (
                  <WebhookConfigRow
                    key={event}
                    event={event}
                    label={WEBHOOK_EVENT_LABELS[event]}
                    targetUrl={config?.target_url ?? ""}
                    isActive={config?.is_active ?? false}
                    secret={config?.hmac_secret ?? null}
                  />
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Último envio</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(deliveries ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.event}</TableCell>
                  <TableCell>
                    <StatusBadge tone={DELIVERY_STATUS_TONE[d.status] ?? "neutral"}>
                      {DELIVERY_STATUS_LABEL[d.status] ?? d.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{d.attempts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.last_attempt_at
                      ? new Date(d.last_attempt_at).toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.response_status ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ResendDeliveryButton deliveryId={d.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(deliveries ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma entrega registrada ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
