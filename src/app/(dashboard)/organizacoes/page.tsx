import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "./create-organization-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OrganizacoesPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  const { data: clientCounts } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("role", "cliente");

  const countByOrg = new Map<string, number>();
  for (const row of clientCounts ?? []) {
    if (!row.organization_id) continue;
    countByOrg.set(row.organization_id, (countByOrg.get(row.organization_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova organização</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(organizations ?? []).map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{countByOrg.get(org.id) ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/organizacoes/${org.id}`} className="text-sm underline">
                      Ver detalhes
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {(organizations ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma organização cadastrada.
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
