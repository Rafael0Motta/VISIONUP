import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FeatureFlagRow } from "./feature-flag-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CentralPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const { data: flags } = await supabase
    .from("feature_flags")
    .select("key, label, description, category, enabled")
    .order("category")
    .order("label");

  const byCategory = new Map<string, typeof flags>();
  for (const flag of flags ?? []) {
    const list = byCategory.get(flag.category) ?? [];
    list.push(flag);
    byCategory.set(flag.category, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Central do Sistema</h1>
        <p className="text-sm text-muted-foreground">
          Ative ou desative funcionalidades específicas da plataforma. Cada funcionalidade nova
          construída a partir de agora ganha um toggle aqui.
        </p>
      </div>

      {byCategory.size === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma funcionalidade catalogada ainda.
          </CardContent>
        </Card>
      ) : (
        Array.from(byCategory.entries()).map(([category, categoryFlags]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {categoryFlags!.map((flag) => (
                <FeatureFlagRow
                  key={flag.key}
                  flagKey={flag.key}
                  label={flag.label}
                  description={flag.description}
                  enabled={flag.enabled}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
