import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONE } from "@/lib/campaigns/status";
import { PIPELINE_STATUS_LABELS, PIPELINE_STATUS_TONE } from "@/lib/campaigns/pipeline-status";
import { StatusBadge } from "@/components/status-badge";
import { StatusUpdateForm } from "./status-update-form";
import { WizardBackLink } from "../wizard-back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RELEASED_STATUSES = ["liberado", "enviando", "concluido", "falha"];

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, created_at, contact_list_id, creator:profiles!campaigns_created_by_fkey(full_name), contact_list:contact_lists!campaigns_contact_list_id_fkey(total_contacts, valid_contacts, invalid_contacts)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: updates } = await supabase
    .from("campaign_status_updates")
    .select("id, status, comment, created_at, author:profiles!campaign_status_updates_created_by_fkey(full_name)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  const creator = campaign.creator as { full_name: string | null } | null;
  const contactList = campaign.contact_list as {
    total_contacts: number;
    valid_contacts: number;
    invalid_contacts: number;
  } | null;

  const canManageStatusUpdates = actor.role === "superadmin" && RELEASED_STATUSES.includes(campaign.status);

  return (
    <div className="flex flex-col gap-6">
      <WizardBackLink href="/campanhas" label="Voltar pra campanhas" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            Criada por {creator?.full_name ?? "—"} em{" "}
            {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <StatusBadge tone={CAMPAIGN_STATUS_TONE[campaign.status]}>
          {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </StatusBadge>
      </div>

      {contactList ? (
        <Card className="w-fit">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Contatos</p>
            <p className="text-lg font-semibold">{contactList.total_contacts}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Andamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManageStatusUpdates ? <StatusUpdateForm campaignId={campaign.id} /> : null}

          {(updates ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {RELEASED_STATUSES.includes(campaign.status)
                ? "Nenhuma atualização registrada ainda."
                : "O andamento detalhado aparece aqui depois que a campanha for liberada."}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(updates ?? []).map((u) => {
                const author = u.author as { full_name: string | null } | null;
                return (
                  <div key={u.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.status ? (
                        <StatusBadge tone={PIPELINE_STATUS_TONE[u.status]}>
                          {PIPELINE_STATUS_LABELS[u.status]}
                        </StatusBadge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {author?.full_name ?? "—"} ·{" "}
                        {new Date(u.created_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {u.comment ? <p>{u.comment}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
