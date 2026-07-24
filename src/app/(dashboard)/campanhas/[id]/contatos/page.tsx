import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseContactsCsv } from "@/lib/contacts/parse";
import { WizardSteps } from "../../wizard-steps";
import { WizardBackLink } from "../../wizard-back-link";
import { ContatosForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactsPreview } from "../../actions";

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
        .select("file_name, total_contacts, valid_contacts, invalid_contacts, storage_path")
        .eq("id", campaign.contact_list_id)
        .maybeSingle()
    : { data: null };

  let existingPreview: ContactsPreview | null = null;
  if (existingList?.storage_path) {
    const { data: file } = await supabase.storage.from("contact-lists").download(existingList.storage_path);
    if (file) {
      const parsed = parseContactsCsv(await file.text());
      existingPreview = {
        fileName: existingList.file_name ?? "arquivo.csv",
        total: existingList.total_contacts,
        validCount: existingList.valid_contacts,
        invalidCount: existingList.invalid_contacts,
        sampleRows: parsed.rows.slice(0, 8).map((r) => ({ phone: r.phone, name: r.name, isValid: r.isValid })),
      };
    }
  }

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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Lista de contatos</CardTitle>
        </CardHeader>
        <CardContent>
          <ContatosForm campaignId={campaign.id} existingPreview={existingPreview} />
        </CardContent>
      </Card>
    </div>
  );
}
