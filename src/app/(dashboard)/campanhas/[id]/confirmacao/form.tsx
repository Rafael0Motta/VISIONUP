"use client";

import { useActionState } from "react";
import { UserRound, TriangleAlert, CalendarClock } from "lucide-react";
import { submitCampaignForApproval, type CampaignFormState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { Button } from "@/components/ui/button";
import type { TemplateButton, TemplateVariable } from "@/lib/templates/parse";

const initialState: CampaignFormState = { error: null };

type TemplateInfo = {
  name: string;
  media_type: "none" | "image" | "video" | "text";
  mediaUrl: string | null;
  body_text: string;
  footer_text: string | null;
  buttons: TemplateButton[];
  variables: TemplateVariable[];
  text_overridden: boolean;
};

type ContactStats = {
  total_contacts: number;
  valid_contacts: number;
  invalid_contacts: number;
} | null;

type ProfileCustomizationInfo = {
  enabled?: boolean;
  display_name?: string | null;
  photoUrl?: string | null;
} | null;

export function ConfirmacaoForm({
  campaignId,
  campaignName,
  scheduledAt,
  template,
  contactStats,
  profileCustomization,
}: {
  campaignId: string;
  campaignName: string;
  scheduledAt: string | null;
  template: TemplateInfo | null;
  contactStats: ContactStats;
  profileCustomization: ProfileCustomizationInfo;
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
        <div>
          <p className="text-sm font-medium">Resumo da campanha</p>
          <div className="mt-2 flex flex-col gap-1 rounded-md border p-3 text-sm">
            <p>
              Nome: <strong>{campaignName}</strong>
            </p>
            {template ? (
              <p>
                Template: <strong>{template.name}</strong>
              </p>
            ) : null}
          </div>
        </div>

        {contactStats ? (
          <div className="w-fit rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total de contatos</p>
            <p className="text-lg font-semibold">{contactStats.total_contacts}</p>
          </div>
        ) : null}

        {scheduledAt ? (
          <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            <p>
              Agendado para:{" "}
              <strong>
                {new Date(scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </strong>
            </p>
          </div>
        ) : null}

        {profileCustomization?.enabled ? (
          <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 p-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
              {profileCustomization.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileCustomization.photoUrl}
                  alt="Nova foto de perfil do WhatsApp"
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlert className="size-4 shrink-0 text-warning-foreground" />
                Personalização de perfil ativada
              </div>
              <p className="text-muted-foreground">
                Nome de exibição:{" "}
                <strong className="text-foreground">
                  {profileCustomization.display_name || "(mantém o nome atual)"}
                </strong>
                . Essa foto e nome vão substituir os do número de WhatsApp usado no disparo.
              </p>
            </div>
          </div>
        ) : null}

        {template?.text_overridden ? (
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-warning-foreground" />
            <p className="text-muted-foreground">
              <strong className="text-foreground">Texto editado manualmente</strong> — foge do
              padrão do catálogo, pode não ser aprovado e pode ser ajustado pela equipe técnica.
            </p>
          </div>
        ) : null}

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Confirmando..." : "Confirmar campanha"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        {template ? (
          <WhatsAppPreview
            mediaType={template.media_type}
            mediaUrl={template.mediaUrl}
            bodyText={template.body_text}
            footerText={template.footer_text}
            buttons={template.buttons}
            variableValues={variableValues}
            title="Prévia da mensagem"
          />
        ) : null}
      </div>
    </form>
  );
}
