import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateVariationForm } from "./create-variation-form";
import { VariationRow } from "./variation-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CatalogoVariacoesPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const { data: variations } = await supabase
    .from("message_variations")
    .select("id, content, is_active")
    .order("created_at");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova variação de texto</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateVariationForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo do &quot;Variar Texto&quot;</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(variations ?? []).map((variation) => (
                <VariationRow
                  key={variation.id}
                  id={variation.id}
                  content={variation.content}
                  isActive={variation.is_active}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
