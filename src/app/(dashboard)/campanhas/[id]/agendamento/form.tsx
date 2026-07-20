"use client";

import { useActionState } from "react";
import { submitCampaignForApproval, type CampaignFormState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateButton, TemplateVariable } from "@/lib/templates/parse";

const initialState: CampaignFormState = { error: null };

type TemplateInfo = {
  media_type: "none" | "image" | "video" | "text";
  body_text: string;
  footer_text: string | null;
  buttons: TemplateButton[];
  variables: TemplateVariable[];
};

type ContactStats = {
  total_contacts: number;
  valid_contacts: number;
  invalid_contacts: number;
} | null;

export function AgendamentoForm({
  campaignId,
  scheduledAt,
  template,
  contactStats,
}: {
  campaignId: string;
  scheduledAt: string | null;
  template: TemplateInfo | null;
  contactStats: ContactStats;
}) {
  const [state, formAction, isPending] = useActionState(
    submitCampaignForApproval.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, null);

  const variableValues = Object.fromEntries(
    (template?.variables ?? []).map((v) => [v.index, v.example])
  );

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled_at">Agendamento (opcional)</Label>
          <Input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            defaultValue={scheduledAt ? scheduledAt.slice(0, 16) : ""}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco para envio assim que a campanha for liberada.
          </p>
        </div>

        {contactStats ? (
          <div className="w-fit rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total de contatos</p>
            <p className="text-lg font-semibold">{contactStats.total_contacts}</p>
          </div>
        ) : null}

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Enviando..." : "Enviar para aprovação"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        {template ? (
          <WhatsAppPreview
            mediaType={template.media_type}
            bodyText={template.body_text}
            footerText={template.footer_text}
            buttons={template.buttons}
            variableValues={variableValues}
          />
        ) : null}
      </div>
    </form>
  );
}
