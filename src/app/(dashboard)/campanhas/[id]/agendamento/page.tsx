import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WizardSteps } from "../../wizard-steps";
import { AgendamentoForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateButton, TemplateVariable } from "@/lib/templates/parse";

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
    .select("id, scheduled_at, template_id, contact_list_id")
    .eq("id", id)
    .single();

  if (!campaign) {
    notFound();
  }

  const [{ data: template }, { data: contactList }] = await Promise.all([
    campaign.template_id
      ? supabase
          .from("templates")
          .select("name, media_type, body_text, footer_text, buttons, variables")
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para criar uma nova campanha de WhatsApp.
        </p>
      </div>
      <WizardSteps current={4} />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Agendamento e revisão</CardTitle>
        </CardHeader>
        <CardContent>
          <AgendamentoForm
            campaignId={campaign.id}
            scheduledAt={campaign.scheduled_at}
            template={
              template
                ? {
                    media_type: template.media_type,
                    body_text: template.body_text,
                    footer_text: template.footer_text,
                    buttons: (template.buttons as unknown as TemplateButton[]) ?? [],
                    variables: (template.variables as unknown as TemplateVariable[]) ?? [],
                  }
                : null
            }
            contactStats={contactList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
