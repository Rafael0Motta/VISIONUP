import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "./approval-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TemplateButton, TemplateVariable } from "@/lib/templates/parse";

export type ApprovalCampaign = {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  rejection_reason: string | null;
  profile_customization: {
    enabled?: boolean;
    display_name?: string | null;
    photo_path?: string | null;
    photoUrl?: string | null;
  } | null;
  creator: { full_name: string | null } | null;
  template: {
    media_type: "none" | "image" | "video" | "text";
    media_path: string | null;
    mediaUrl?: string | null;
    body_text: string;
    footer_text: string | null;
    buttons: TemplateButton[];
    variables: TemplateVariable[];
    text_overridden: boolean;
  } | null;
  contact_list: {
    total_contacts: number;
    valid_contacts: number;
    invalid_contacts: number;
  } | null;
};

async function fetchCampaigns(
  status: "aguardando_aprovacao" | "aprovado" | "rejeitado" | "liberado",
  organizationId: string | null
) {
  const supabase = await createClient();
  let query = supabase
    .from("campaigns")
    .select(
      "id, name, status, scheduled_at, rejection_reason, profile_customization, creator:profiles!campaigns_created_by_fkey(full_name), template:templates(media_type, media_path, body_text, footer_text, buttons, variables, text_overridden), contact_list:contact_lists!campaigns_contact_list_id_fkey(total_contacts, valid_contacts, invalid_contacts)"
    )
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data } = await query;
  const campaigns = (data ?? []) as unknown as ApprovalCampaign[];

  await Promise.all(
    campaigns.map(async (c) => {
      if (c.template?.media_path) {
        const { data: signed } = await supabase.storage
          .from("template-media")
          .createSignedUrl(c.template.media_path, 60 * 60);
        c.template.mediaUrl = signed?.signedUrl ?? null;
      }
      if (c.profile_customization?.photo_path) {
        const { data: signed } = await supabase.storage
          .from("campaign-profile-photos")
          .createSignedUrl(c.profile_customization.photo_path, 60 * 60);
        c.profile_customization.photoUrl = signed?.signedUrl ?? null;
      }
    })
  );

  return campaigns;
}

export default async function AprovacoesPage() {
  const actor = await requireRole(["admin", "superadmin"]);
  const orgId = actor.role === "admin" ? actor.organization_id : null;

  const [pendentes, aprovados, liberadas, rejeitados] = await Promise.all([
    fetchCampaigns("aguardando_aprovacao", orgId),
    fetchCampaigns("aprovado", orgId),
    fetchCampaigns("liberado", orgId),
    fetchCampaigns("rejeitado", orgId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Aprovações</h1>
        <p className="text-sm text-muted-foreground">Revise, aprove e libere as campanhas solicitadas.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="aprovados">Aprovados ({aprovados.length})</TabsTrigger>
            <TabsTrigger value="liberadas">Liberadas ({liberadas.length})</TabsTrigger>
            <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pendentes" className="flex flex-col gap-4">
          {pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha pendente.</p>
          ) : (
            pendentes.map((c) => <ApprovalCard key={c.id} campaign={c} view="pendente" />)
          )}
        </TabsContent>

        <TabsContent value="aprovados" className="flex flex-col gap-4">
          {aprovados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha aprovada aguardando liberação.</p>
          ) : (
            aprovados.map((c) => <ApprovalCard key={c.id} campaign={c} view="aprovado" />)
          )}
        </TabsContent>

        <TabsContent value="liberadas" className="flex flex-col gap-4">
          {liberadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha liberada ainda.</p>
          ) : (
            liberadas.map((c) => <ApprovalCard key={c.id} campaign={c} view="liberado" />)
          )}
        </TabsContent>

        <TabsContent value="rejeitados" className="flex flex-col gap-4">
          {rejeitados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha rejeitada.</p>
          ) : (
            rejeitados.map((c) => <ApprovalCard key={c.id} campaign={c} view="rejeitado" />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
