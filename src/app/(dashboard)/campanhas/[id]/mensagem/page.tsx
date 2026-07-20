import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WizardSteps } from "../../wizard-steps";
import { createTemplateForCampaign, updateTemplateForCampaignStep } from "../../actions";
import { TemplateForm, type TemplateFormInitialValues } from "@/app/(dashboard)/templates/template-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_OPT_OUT_FOOTER, type TemplateButton, type TemplateVariable } from "@/lib/templates/parse";

export default async function MensagemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(["admin", "cliente"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, organization_id, template_id")
    .eq("id", id)
    .single();

  if (!campaign) {
    notFound();
  }

  const { data: variations } = await supabase
    .from("message_variations")
    .select("content")
    .eq("is_active", true);

  const variationPool = (variations ?? []).map((v) => v.content);

  let initialValues: TemplateFormInitialValues | undefined;
  let existingMediaUrl: string | null = null;
  if (campaign.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("*")
      .eq("id", campaign.template_id)
      .single();

    if (template) {
      initialValues = {
        name: template.name,
        media_type: template.media_type,
        body_text: template.body_text,
        footer_text: template.footer_text,
        variables: (template.variables as unknown as TemplateVariable[]) ?? [],
        buttons: (template.buttons as unknown as TemplateButton[]) ?? [],
        use_variations: template.use_variations,
        is_default: template.is_default,
      };

      if (template.media_path) {
        const { data: signed } = await supabase.storage
          .from("template-media")
          .createSignedUrl(template.media_path, 60 * 60);
        existingMediaUrl = signed?.signedUrl ?? null;
      }
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
      <WizardSteps current={2} />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>{initialValues ? "Editar template" : "Novo template"}</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            mode={initialValues ? "edit" : "create"}
            actorRole={actor.role as "admin" | "cliente"}
            activeVariationsCount={variationPool.length}
            variationPool={!initialValues ? variationPool : undefined}
            initialValues={initialValues}
            submitLabel="Avançar"
            defaultFooterText={DEFAULT_OPT_OUT_FOOTER}
            existingMediaUrl={existingMediaUrl}
            hideUseVariations
            action={
              initialValues
                ? updateTemplateForCampaignStep.bind(null, campaign.id, campaign.template_id!)
                : createTemplateForCampaign.bind(null, campaign.id)
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
