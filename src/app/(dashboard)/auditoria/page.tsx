import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABELS: Record<string, string> = {
  organization_created: "Organização criada",
  organization_updated: "Organização atualizada",
  organization_deleted: "Organização excluída",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  client_deleted: "Cliente excluído",
  org_admin_created: "Administrador criado",
  org_admin_deleted: "Administrador excluído",
  template_created: "Template criado",
  template_updated: "Template atualizado",
  template_deleted: "Template excluído",
  template_set_as_default: "Template marcado como padrão",
  campaign_created: "Campanha criada",
  campaign_submitted_for_approval: "Campanha enviada para aprovação",
  campaign_approved: "Campanha aprovada",
  campaign_rejected: "Campanha rejeitada",
  campaign_released: "Campanha liberada",
  campaign_sending_started: "Disparo iniciado",
  campaign_completed: "Disparo concluído",
  campaign_failed: "Disparo com falha",
  campaign_report_added: "Relatório adicionado",
  contact_list_uploaded: "Lista de contatos enviada",
  contact_list_validated: "Lista de contatos validada",
};

export default async function AuditoriaPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, action, actor_role, created_at, metadata, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Trilha de ações sensíveis — últimas 100 entradas.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{ACTION_LABELS[e.action] ?? e.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.actor?.full_name ?? (e.actor_role ? "—" : "n8n (sistema)")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(e.metadata)}
                  </TableCell>
                </TableRow>
              ))}
              {(entries ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma entrada de auditoria ainda.
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
