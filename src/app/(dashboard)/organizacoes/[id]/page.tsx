import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { UpdateOrganizationForm } from "../update-organization-form";
import { CreateOrgAdminForm } from "../create-org-admin-form";
import { OrgAdminRow } from "../org-admin-row";
import { CreateClienteForm } from "@/app/(dashboard)/clientes/create-cliente-form";
import { ClienteRow } from "@/app/(dashboard)/clientes/cliente-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function OrganizacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["superadmin"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: organization }, { data: clientes }, { data: orgCampaigns }, { data: admins }] =
    await Promise.all([
      supabase.from("organizations").select("id, name, display_name").eq("id", id).single(),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "cliente")
        .eq("organization_id", id)
        .order("full_name"),
      supabase.from("campaigns").select("created_by").eq("organization_id", id),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "admin")
        .eq("organization_id", id)
        .order("full_name"),
    ]);

  if (!organization) {
    notFound();
  }

  const campaignCountByCliente = new Map<string, number>();
  for (const c of orgCampaigns ?? []) {
    campaignCountByCliente.set(c.created_by, (campaignCountByCliente.get(c.created_by) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Organização</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateOrganizationForm id={organization.id} name={organization.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo administrador desta organização</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrgAdminForm organizationId={organization.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(admins ?? []).map((adminRow) => (
                <OrgAdminRow
                  key={adminRow.id}
                  id={adminRow.id}
                  fullName={adminRow.full_name}
                  email={adminRow.email}
                />
              ))}
              {(admins ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum administrador vinculado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo cliente nesta organização</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateClienteForm
            organizationId={organization.id}
            organizationName={organization.name}
            currentDisplayName={organization.display_name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes vinculados</CardTitle>
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
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum cliente vinculado.
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
