import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VariationForm } from "../variation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateButton } from "@/lib/templates/parse";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function EditVariationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["superadmin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: variation } = await supabase
    .from("message_variations")
    .select("content, media_type, media_path, footer_text, buttons")
    .eq("id", id)
    .maybeSingle();

  if (!variation) {
    notFound();
  }

  let mediaUrl: string | null = null;
  if (variation.media_path) {
    const { data: signed } = await supabase.storage
      .from("catalog-media")
      .createSignedUrl(variation.media_path, SIGNED_URL_TTL_SECONDS);
    mediaUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Editar template do catálogo</h1>
      </div>
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Template</CardTitle>
        </CardHeader>
        <CardContent>
          <VariationForm
            mode="edit"
            variationId={id}
            initialValues={{
              content: variation.content,
              media_type: variation.media_type,
              mediaUrl,
              footer_text: variation.footer_text,
              buttons: (variation.buttons as unknown as TemplateButton[]) ?? [],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
