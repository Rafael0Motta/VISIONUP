import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TemplateForm } from "../template-form";
import type { TemplateVariable, TemplateButton } from "@/lib/templates/parse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditarTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(["admin", "cliente"]);
  const { id } = await params;
  const supabase = await createClient();

  const { count } = await supabase
    .from("message_variations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!template) {
    notFound();
  }

  let existingMediaUrl: string | null = null;
  if (template.media_path) {
    const { data: signed } = await supabase.storage
      .from("template-media")
      .createSignedUrl(template.media_path, 60 * 60);
    existingMediaUrl = signed?.signedUrl ?? null;
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Editar template</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateForm
          mode="edit"
          templateId={template.id}
          actorRole={actor.role as "admin" | "cliente"}
          activeVariationsCount={count ?? 0}
          existingMediaUrl={existingMediaUrl}
          initialValues={{
            name: template.name,
            media_type: template.media_type,
            body_text: template.body_text,
            footer_text: template.footer_text,
            variables: (template.variables as unknown as TemplateVariable[]) ?? [],
            buttons: (template.buttons as unknown as TemplateButton[]) ?? [],
            use_variations: template.use_variations,
            is_default: template.is_default,
          }}
        />
      </CardContent>
    </Card>
  );
}
