import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TemplateForm } from "../template-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovoTemplatePage() {
  const actor = await requireRole(["admin", "cliente"]);
  const supabase = await createClient();

  const { count } = await supabase
    .from("message_variations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Novo template</CardTitle>
      </CardHeader>
      <CardContent>
        <TemplateForm
          mode="create"
          actorRole={actor.role as "admin" | "cliente"}
          activeVariationsCount={count ?? 0}
        />
      </CardContent>
    </Card>
  );
}
