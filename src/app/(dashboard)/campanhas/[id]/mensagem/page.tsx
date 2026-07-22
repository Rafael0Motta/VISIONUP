import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { WizardSteps } from "../../wizard-steps";
import { WizardBackLink } from "../../wizard-back-link";
import { CatalogTemplateForm, type CatalogTemplateInitial, type CatalogVariation } from "./catalog-template-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_OPT_OUT_FOOTER, type TemplateButton, type TemplateVariable } from "@/lib/templates/parse";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function MensagemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "cliente"]);
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
    .select("id, content, media_type, media_path, footer_text, buttons")
    .eq("is_active", true);

  const variationPool: CatalogVariation[] = await Promise.all(
    (variations ?? []).map(async (v) => {
      let mediaUrl: string | null = null;
      if (v.media_path) {
        const { data: signed } = await supabase.storage
          .from("catalog-media")
          .createSignedUrl(v.media_path, SIGNED_URL_TTL_SECONDS);
        mediaUrl = signed?.signedUrl ?? null;
      }
      return {
        id: v.id,
        content: v.content,
        media_type: v.media_type,
        mediaUrl,
        footer_text: v.footer_text,
        buttons: (v.buttons as unknown as TemplateButton[]) ?? [],
      };
    })
  );

  let initial: CatalogTemplateInitial | null = null;
  if (campaign.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("body_text, media_type, media_path, footer_text, buttons, variables, text_overridden")
      .eq("id", campaign.template_id)
      .maybeSingle();

    if (template) {
      let mediaUrl: string | null = null;
      if (template.media_path) {
        const { data: signed } = await supabase.storage
          .from("template-media")
          .createSignedUrl(template.media_path, SIGNED_URL_TTL_SECONDS);
        mediaUrl = signed?.signedUrl ?? null;
      }
      initial = {
        body_text: template.body_text,
        media_type: template.media_type,
        mediaUrl,
        footer_text: template.footer_text,
        buttons: (template.buttons as unknown as TemplateButton[]) ?? [],
        variables: (template.variables as unknown as TemplateVariable[]) ?? [],
        text_overridden: template.text_overridden,
      };
    }
  }

  const allowTextOverride = await isFeatureEnabled("campanhas.editar_texto_livre");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para criar uma nova campanha de WhatsApp.
        </p>
      </div>
      <WizardSteps current={2} />
      <WizardBackLink href="/campanhas" />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Mensagem da campanha</CardTitle>
        </CardHeader>
        <CardContent>
          {variationPool.length === 0 && !initial ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma variação de mensagem está disponível no catálogo. Peça para o suporte
              cadastrar uma em <strong>Catálogo de Variações</strong> antes de continuar.
            </p>
          ) : (
            <CatalogTemplateForm
              campaignId={campaign.id}
              existingTemplateId={campaign.template_id}
              variationPool={variationPool}
              initial={initial}
              defaultFooterText={DEFAULT_OPT_OUT_FOOTER}
              allowTextOverride={allowTextOverride}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
