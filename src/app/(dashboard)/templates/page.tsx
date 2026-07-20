import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

const MEDIA_LABELS: Record<string, string> = {
  none: "Nenhuma",
  image: "Imagem",
  video: "Vídeo",
  text: "Texto",
};

export default async function TemplatesPage() {
  const actor = await requireRole(["admin", "cliente"]);
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, media_type, is_default, use_variations, created_by")
    .eq("organization_id", actor.organization_id as string)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Templates</h1>
        <Button asChild>
          <Link href="/templates/novo">Novo template</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates da organização</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Mídia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(templates ?? []).map((tpl) => {
                const canDelete =
                  actor.role === "admin" ||
                  (tpl.created_by === actor.id && !tpl.is_default);

                return (
                  <TableRow key={tpl.id}>
                    <TableCell>{tpl.name}</TableCell>
                    <TableCell>{MEDIA_LABELS[tpl.media_type]}</TableCell>
                    <TableCell className="flex gap-2">
                      {tpl.is_default ? <Badge>Padrão</Badge> : null}
                      {tpl.use_variations ? <Badge variant="secondary">Variar texto</Badge> : null}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/templates/${tpl.id}`}>Editar</Link>
                      </Button>
                      {canDelete ? (
                        <DeleteButton
                          action={deleteTemplate.bind(null, tpl.id)}
                          confirmMessage={`Excluir o template "${tpl.name}"? Não pode ser desfeito.`}
                          successMessage="Template excluído."
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(templates ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum template cadastrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
