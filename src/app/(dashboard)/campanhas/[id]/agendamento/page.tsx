import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WizardSteps } from "../../wizard-steps";
import { WizardBackLink } from "../../wizard-back-link";
import { AgendamentoForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateButton, TemplateVariable } from "@/lib/templates/parse";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora — só precisa durar a sessão de revisão

type ProfileCustomization = {
  enabled?: boolean;
  display_name?: string | null;
  photo_path?: string | null;
};

export default async function AgendamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "cliente"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, template_id, contact_list_id, profile_customization")
    .eq("id", id)
    .single();

  if (!campaign) {
    notFound();
  }

  const [{ data: template }, { data: contactList }] = await Promise.all([
    campaign.template_id
      ? supabase
          .from("templates")
          .select("name, media_type, media_path, body_text, footer_text, buttons, variables")
          .eq("id", campaign.template_id)
          .single()
      : Promise.resolve({ data: null }),
    campaign.contact_list_id
      ? supabase
          .from("contact_lists")
          .select("total_contacts, valid_contacts, invalid_contacts")
          .eq("id", campaign.contact_list_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  let mediaUrl: string | null = null;
  if (template?.media_path) {
    const { data: signed } = await supabase.storage
      .from("template-media")
      .createSignedUrl(template.media_path, SIGNED_URL_TTL_SECONDS);
    mediaUrl = signed?.signedUrl ?? null;
  }

  const profileCustomization = campaign.profile_customization as ProfileCustomization | null;
  let profilePhotoUrl: string | null = null;
  if (profileCustomization?.enabled && profileCustomization.photo_path) {
    const { data: signed } = await supabase.storage
      .from("campaign-profile-photos")
      .createSignedUrl(profileCustomization.photo_path, SIGNED_URL_TTL_SECONDS);
    profilePhotoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para criar uma nova campanha de WhatsApp.
        </p>
      </div>
      <WizardSteps current={4} />
      <WizardBackLink href={`/campanhas/${campaign.id}/contatos`} />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Revisar e confirmar</CardTitle>
        </CardHeader>
        <CardContent>
          <AgendamentoForm
            campaignId={campaign.id}
            campaignName={campaign.name}
            template={
              template
                ? {
                    name: template.name,
                    media_type: template.media_type,
                    mediaUrl,
                    body_text: template.body_text,
                    footer_text: template.footer_text,
                    buttons: (template.buttons as unknown as TemplateButton[]) ?? [],
                    variables: (template.variables as unknown as TemplateVariable[]) ?? [],
                  }
                : null
            }
            contactStats={contactList}
            profileCustomization={
              profileCustomization
                ? {
                    enabled: profileCustomization.enabled,
                    display_name: profileCustomization.display_name ?? null,
                    photoUrl: profilePhotoUrl,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
