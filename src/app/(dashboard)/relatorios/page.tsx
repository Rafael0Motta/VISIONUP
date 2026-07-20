import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ReportRow } from "./report-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type CampaignReport = {
  id: string;
  origem: "manual" | "automatico";
  enviados: number;
  entregues: number;
  lidos: number;
  falhados: number;
  expirados: number;
  custo: number | null;
  importado_em: string;
};

export default async function RelatoriosPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, created_at, creator:profiles!campaigns_created_by_fkey(full_name), campaign_reports(id, origem, enviados, entregues, lidos, falhados, expirados, custo, importado_em)"
    )
    .in("status", ["liberado", "enviando", "concluido", "falha"])
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os relatórios automáticos (callback do n8n) e importe manualmente quando o
          relatório só estiver disponível no painel da Infobip.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas liberadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Criada por</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Relatórios</TableHead>
                <TableHead className="text-right">Importar manualmente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns ?? []).map((c) => (
                <ReportRow
                  key={c.id}
                  campaignId={c.id}
                  campaignName={c.name}
                  creatorName={(c.creator as { full_name: string | null } | null)?.full_name ?? "—"}
                  createdAt={c.created_at}
                  reports={(c.campaign_reports ?? []) as CampaignReport[]}
                />
              ))}
              {(campaigns ?? []).length === 0 ? (
                <TableRow>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    Nenhuma campanha liberada ainda.
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
