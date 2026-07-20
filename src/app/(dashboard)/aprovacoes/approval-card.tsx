"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, TriangleAlert, UserRound } from "lucide-react";
import { approveCampaign, rejectCampaign, releaseCampaign, type ApprovalFormState } from "./actions";
import type { ApprovalCampaign } from "./page";
import { useActionToast } from "@/lib/use-action-toast";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  liberado: "Liberado",
  rejeitado: "Rejeitado",
};

const rejectInitialState: ApprovalFormState = { error: null };

function formatDate(iso: string | null) {
  if (!iso) return "Envio imediato";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ApproveButton({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await approveCampaign(campaignId);
            toast.success("Campanha aprovada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível aprovar.");
          }
        })
      }
    >
      {isPending ? "Aprovando..." : "Aprovar"}
    </Button>
  );
}

function ReleaseButton({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await releaseCampaign(campaignId);
            toast.success("Campanha liberada.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível liberar.");
          }
        })
      }
    >
      {isPending ? "Liberando..." : "Liberar campanha"}
    </Button>
  );
}

function RejectDialog({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    rejectCampaign.bind(null, campaignId),
    rejectInitialState
  );
  useActionToast(state, isPending, "Campanha rejeitada.");

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da rejeição</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <Textarea name="reason" placeholder="Explique o motivo para o cliente" rows={4} required />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Rejeitando..." : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApprovalCard({
  campaign,
  view,
}: {
  campaign: ApprovalCampaign;
  view: "pendente" | "aprovado" | "liberado" | "rejeitado";
}) {
  const [expanded, setExpanded] = useState(true);
  const initials = (campaign.creator?.full_name ?? "?").slice(0, 1).toUpperCase();
  const variableValues = Object.fromEntries(
    (campaign.template?.variables ?? []).map((v) => [v.index, v.example])
  );

  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex-row items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {initials}
          </span>
          <div>
            <p className="font-medium">{campaign.name}</p>
            <p className="text-xs text-muted-foreground">
              Por: {campaign.creator?.full_name ?? "—"} · Agendado: {formatDate(campaign.scheduled_at)}
            </p>
          </div>
          <StatusBadge
            tone={
              view === "aprovado" || view === "liberado"
                ? "success"
                : view === "rejeitado"
                  ? "destructive"
                  : "warning"
            }
          >
            {CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
          </StatusBadge>
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </CardHeader>

      {expanded ? (
        <CardContent className="flex flex-col gap-4">
          {campaign.profile_customization?.enabled ? (
            <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 p-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {campaign.profile_customization.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.profile_customization.photoUrl}
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
                    {campaign.profile_customization.display_name || "(mantém o nome atual)"}
                  </strong>
                  . Essa foto e nome vão substituir os do número de WhatsApp usado no disparo.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {campaign.template ? (
              <WhatsAppPreview
                mediaType={campaign.template.media_type}
                mediaUrl={campaign.template.mediaUrl}
                bodyText={campaign.template.body_text}
                footerText={campaign.template.footer_text}
                buttons={campaign.template.buttons}
                variableValues={variableValues}
                title="Prévia do template de mensagem"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sem template vinculado.</p>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Planilha de contatos</p>
                <div className="w-fit rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{campaign.contact_list?.total_contacts ?? 0}</p>
                </div>
              </div>

              {view === "rejeitado" && campaign.rejection_reason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Motivo da rejeição</p>
                  <p className="text-muted-foreground">{campaign.rejection_reason}</p>
                </div>
              ) : null}

              {view === "pendente" ? (
                <div className="flex gap-2">
                  <ApproveButton campaignId={campaign.id} />
                  <RejectDialog campaignId={campaign.id} />
                </div>
              ) : null}

              {view === "aprovado" ? <ReleaseButton campaignId={campaign.id} /> : null}
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
