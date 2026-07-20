import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateClienteForm } from "./create-cliente-form";
import { ClienteRow } from "./cliente-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClientesPage() {
  const actor = await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name, display_name")
    .eq("id", actor.organization_id as string)
    .single();

  const { data: clientes } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "cliente")
    .eq("organization_id", actor.organization_id as string)
    .order("full_name");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("created_by")
    .eq("organization_id", actor.organization_id as string);

  const campaignCountByCliente = new Map<string, number>();
  for (const c of campaigns ?? []) {
    campaignCountByCliente.set(c.created_by, (campaignCountByCliente.get(c.created_by) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClienteForm
            organizationId={null}
            organizationName={organization?.name}
            currentDisplayName={organization?.display_name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Campanhas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clientes ?? []).map((cliente) => (
                <ClienteRow
                  key={cliente.id}
                  id={cliente.id}
                  fullName={cliente.full_name}
                  email={cliente.email}
                  campaignCount={campaignCountByCliente.get(cliente.id) ?? 0}
                />
              ))}
              {(clientes ?? []).length === 0 ? (
                <TableRow>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
