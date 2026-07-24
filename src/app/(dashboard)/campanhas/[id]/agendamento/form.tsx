"use client";

import { useActionState } from "react";
import { scheduleCampaign, type CampaignFormState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CampaignFormState = { error: null };

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowLocalDatetimeValue(): string {
  return toLocalDatetimeValue(new Date().toISOString());
}

export function AgendamentoForm({
  campaignId,
  scheduledAt,
}: {
  campaignId: string;
  scheduledAt: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    scheduleCampaign.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Se quiser, marque uma data e horário desejados de envio — é só uma referência pra equipe
        se organizar (o disparo continua sendo liberado manualmente depois da aprovação). Deixe em
        branco pra não agendar.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduled_at">Data e horário desejados</Label>
        <Input
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          min={nowLocalDatetimeValue()}
          defaultValue={toLocalDatetimeValue(scheduledAt)}
          disabled={isPending}
        />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Continuar"}
      </Button>
    </form>
  );
}
