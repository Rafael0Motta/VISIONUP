import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_TONE, resumeStepPath } from "@/lib/campaigns/status";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const actor = await requireRole(["admin", "cliente", "superadmin"]);
  const { clienteId } = await searchParams;
  const supabase = await createClient();

  const isFilteredByCliente = actor.role !== "cliente" && !!clienteId;

  let query = supabase
    .from("campaigns")
    .select("id, name, status, template_id, contact_list_id, rejection_reason, created_at, created_by")
    .order("created_at", { ascending: false });

  if (actor.role === "cliente") {
    query = query.eq("created_by", actor.id);
  } else if (isFilteredByCliente) {
    query = query.eq("created_by", clienteId);
  }

  const { data: campaigns } = await query;

  let filteredClienteName: string | null = null;
  if (isFilteredByCliente) {
    const { data: cliente } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", clienteId)
      .single();
    filteredClienteName = cliente?.full_name ?? "Cliente";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Campanhas</h1>
        {actor.role !== "superadmin" ? (
          <Button asChild>
            <Link href="/campanhas/nova">Nova campanha</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {actor.role === "cliente"
              ? "Minhas campanhas"
              : isFilteredByCliente
                ? `Campanhas de ${filteredClienteName}`
                : actor.role === "superadmin"
                  ? "Todas as campanhas"
                  : "Campanhas da organização"}
          </CardTitle>
          {isFilteredByCliente ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/campanhas">Ver todas</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p>{c.name}</p>
                    {c.status === "rejeitado" && c.rejection_reason ? (
                      <p className="text-xs text-destructive">Motivo: {c.rejection_reason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={CAMPAIGN_STATUS_TONE[c.status]}>
                      {CAMPAIGN_STATUS_LABELS[c.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {actor.role !== "superadmin" && (c.status === "rascunho" || c.status === "rejeitado") ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={resumeStepPath(c)}>
                          {c.status === "rejeitado" ? "Editar e reenviar" : "Continuar"}
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {(campaigns ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma campanha ainda.
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
