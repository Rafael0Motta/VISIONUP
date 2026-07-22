import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WizardSteps } from "../../wizard-steps";
import { WizardBackLink } from "../../wizard-back-link";
import { ContatosForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContatosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "cliente"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, template_id, contact_list_id")
    .eq("id", id)
    .single();

  if (!campaign) {
    notFound();
  }

  const { data: existingList } = campaign.contact_list_id
    ? await supabase
        .from("contact_lists")
        .select("file_name, total_contacts, valid_contacts, invalid_contacts")
        .eq("id", campaign.contact_list_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para criar uma nova campanha de WhatsApp.
        </p>
      </div>
      <WizardSteps current={3} />
      <WizardBackLink href={`/campanhas/${campaign.id}/mensagem`} />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Lista de contatos</CardTitle>
        </CardHeader>
        <CardContent>
          <ContatosForm campaignId={campaign.id} existingList={existingList ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
