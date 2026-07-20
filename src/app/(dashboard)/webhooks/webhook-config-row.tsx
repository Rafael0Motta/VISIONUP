"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import {
  upsertWebhookConfig,
  regenerateWebhookSecret,
  type WebhookConfigFormState,
} from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { WebhookEvent } from "@/lib/webhooks/catalog";

const initialState: WebhookConfigFormState = { error: null };

export function WebhookConfigRow({
  event,
  label,
  targetUrl,
  isActive,
  secret,
}: {
  event: WebhookEvent;
  label: string;
  targetUrl: string;
  isActive: boolean;
  secret: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertWebhookConfig.bind(null, event),
    initialState
  );
  useActionToast(state, isPending, "Configuração salva.");

  const [showSecret, setShowSecret] = useState(false);
  const [isRegenerating, startRegenerate] = useTransition();

  function handleRegenerate() {
    startRegenerate(async () => {
      try {
        await regenerateWebhookSecret(event);
        toast.success("Segredo regenerado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível regenerar.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <form action={formAction} className="flex flex-col gap-2">
          <p className="text-sm font-medium">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{event}</p>
          <Input
            name="target_url"
            placeholder="https://n8n.seu-dominio.com/webhook/..."
            defaultValue={targetUrl}
            disabled={isPending}
          />
          <div className="flex items-center gap-2">
            <Checkbox id={`active-${event}`} name="is_active" defaultChecked={isActive} disabled={isPending} />
            <label htmlFor={`active-${event}`} className="text-sm text-muted-foreground">
              Ativo
            </label>
          </div>
          {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-fit">
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </TableCell>
      <TableCell className="align-top">
        {secret ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {showSecret ? secret : "•".repeat(24)}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setShowSecret((v) => !v)}
              >
                {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit gap-1 text-xs"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className="size-3.5" />
              {isRegenerating ? "Gerando..." : "Regenerar"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Gerado ao salvar</p>
        )}
      </TableCell>
    </TableRow>
  );
}
