import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DisplayNameForm } from "./display-name-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConfiguracoesPage() {
  const actor = await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: organization }, canEditDisplayName] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, display_name")
      .eq("id", actor.organization_id as string)
      .single(),
    isFeatureEnabled("configuracoes.admin_pode_editar_nome_exibicao"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize como sua organização aparece para os clientes.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Nome de exibição</CardTitle>
        </CardHeader>
        <CardContent>
          <DisplayNameForm
            realName={organization?.name ?? ""}
            displayName={organization?.display_name ?? ""}
            canEdit={canEditDisplayName}
          />
        </CardContent>
      </Card>
    </div>
  );
}
