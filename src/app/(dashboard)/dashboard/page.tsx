import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";
import { InfoTooltip } from "@/components/info-tooltip";
import { DashboardFilters } from "./dashboard-filters";
import { DownloadContactListButton } from "@/app/(dashboard)/campanhas/download-contact-list-button";
import { DownloadReportButton } from "@/app/(dashboard)/campanhas/download-report-button";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONE,
  type CampaignStatus,
} from "@/lib/campaigns/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportTotals = {
  enviados: number;
  entregues: number;
  lidos: number;
  falhados: number;
  expirados: number;
};
type ReportRow = {
  campaign_id: string;
  origem: "manual" | "automatico";
  enviados: number;
  entregues: number;
  lidos: number;
  falhados: number;
  expirados: number;
};

const SENT_STATUSES: CampaignStatus[] = ["liberado", "enviando", "concluido", "falha"];

const TILE_STATUSES: { key: CampaignStatus; label: string; info: string }[] = [
  {
    key: "aguardando_aprovacao",
    label: "Aguardando aprovação",
    info: "Campanhas criadas pelo cliente que ainda não foram revisadas por um admin.",
  },
  {
    key: "aprovado",
    label: "Aprovadas",
    info: "Campanhas aprovadas pelo admin, aguardando liberação/envio via n8n.",
  },
  {
    key: "rejeitado",
    label: "Rejeitadas",
    info: "Campanhas recusadas pelo admin — não seguem para disparo.",
  },
  {
    key: "liberado",
    label: "Liberadas",
    info: "Campanhas aprovadas e já liberadas para disparo (webhook enviado ao n8n).",
  },
  {
    key: "concluido",
    label: "Concluídas",
    info: "Campanhas com relatório de disparo importado (manual ou automático via n8n).",
  },
  {
    key: "falha",
    label: "Falhas",
    info: "Campanhas cujo disparo falhou no n8n/Infobip.",
  },
];

const VOLUME_INFO: Record<keyof ReportTotals, string> = {
  enviados: "Soma da coluna \"enviados\" de todos os relatórios (manuais ou automáticos) das campanhas filtradas.",
  entregues: "Soma da coluna \"entregues\" — mensagens confirmadas como entregues pela Infobip (status Delivered).",
  lidos: "Também chamado de \"vistos\": contagem de destinatários com a coluna \"Visto em\" preenchida no relatório da Infobip.",
  falhados: "Soma de mensagens com status Undeliverable/Failed — não puderam ser entregues.",
  expirados: "Soma de mensagens com status Expired na Infobip — a janela de tempo para entrega expirou antes do envio.",
};

function dedupeReports(reports: ReportRow[]): Map<string, ReportRow> {
  // Evita contar 2x quando a mesma campanha tem relatório manual E automático:
  // prioriza o automático (callback do n8n) como fonte de verdade.
  const byCampaign = new Map<string, ReportRow>();
  for (const r of reports) {
    const current = byCampaign.get(r.campaign_id);
    if (!current || (current.origem === "manual" && r.origem === "automatico")) {
      byCampaign.set(r.campaign_id, r);
    }
  }
  return byCampaign;
}

function sumReports(reports: ReportRow[]): ReportTotals {
  const totals: ReportTotals = { enviados: 0, entregues: 0, lidos: 0, falhados: 0, expirados: 0 };
  for (const r of dedupeReports(reports).values()) {
    totals.enviados += r.enviados;
    totals.entregues += r.entregues;
    totals.lidos += r.lidos;
    totals.falhados += r.falhados;
    totals.expirados += r.expirados;
  }
  return totals;
}

function buildQueryString(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

function HeadWithInfo({ children, info }: { children: React.ReactNode; info: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <InfoTooltip text={info} />
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    orgId?: string;
    clienteId?: string;
    campaignId?: string;
    status?: string;
    detail?: string;
  }>;
}) {
  const profile = await requireAuth();
  const params = await searchParams;
  const supabase = await createClient();

  const isCliente = profile.role === "cliente";
  const isSuperadmin = profile.role === "superadmin";
  const isAdmin = profile.role === "admin";

  // organização efetiva do filtro: admin sempre a própria; superadmin, a escolhida (se houver)
  const scopedOrgId = isAdmin ? (profile.organization_id as string) : isSuperadmin ? params.orgId : undefined;

  let campaignsQuery = supabase
    .from("campaigns")
    .select("id, name, status, organization_id, created_by, created_at");

  if (isCliente) {
    campaignsQuery = campaignsQuery.eq("created_by", profile.id);
  } else if (scopedOrgId) {
    campaignsQuery = campaignsQuery.eq("organization_id", scopedOrgId);
  }
  if (!isCliente && params.clienteId) {
    campaignsQuery = campaignsQuery.eq("created_by", params.clienteId);
  }
  if (params.from) {
    campaignsQuery = campaignsQuery.gte("created_at", params.from);
  }
  if (params.to) {
    campaignsQuery = campaignsQuery.lte("created_at", `${params.to}T23:59:59`);
  }

  // As três consultas abaixo não dependem uma da outra — rodar em paralelo
  // em vez de sequencial evita empilhar 3 idas e voltas ao banco à toa.
  const clienteFilterOrgId = isAdmin ? (profile.organization_id as string) : scopedOrgId;
  const [{ data: campaignsData }, { data: organizationsData }, { data: clienteOptionsData }] =
    await Promise.all([
      campaignsQuery,
      isSuperadmin
        ? supabase.from("organizations").select("id, name").order("name")
        : Promise.resolve({ data: null }),
      !isCliente && clienteFilterOrgId
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .eq("organization_id", clienteFilterOrgId)
            .eq("role", "cliente")
            .order("full_name")
        : Promise.resolve({ data: null }),
    ]);
  const scopedCampaigns = campaignsData ?? [];
  const organizations: { id: string; name: string }[] = organizationsData ?? [];
  const clienteOptions: { id: string; full_name: string | null }[] = clienteOptionsData ?? [];

  // opções do filtro de campanha: todas as campanhas dentro do escopo atual (org/cliente/período)
  const campaignOptions = scopedCampaigns
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const statusFilter = params.status as CampaignStatus | undefined;
  const campaigns = scopedCampaigns.filter((c) => {
    if (params.campaignId && c.id !== params.campaignId) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });
  const campaignIds = campaigns.map((c) => c.id);

  const { data: reportsData } = campaignIds.length
    ? await supabase
        .from("campaign_reports")
        .select("campaign_id, origem, enviados, entregues, lidos, falhados, expirados")
        .in("campaign_id", campaignIds)
    : { data: [] as ReportRow[] };
  const reports = reportsData ?? [];

  const statusCounts: Partial<Record<CampaignStatus, number>> = {};
  for (const c of campaigns) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
  }
  const totals = sumReports(reports);


  // ---- quebra por cliente (admin sempre; superadmin quando uma org está selecionada) ----
  let clienteBreakdown: {
    id: string;
    name: string;
    campanhas: number;
    disparos: number;
    enviados: number;
    entregues: number;
  }[] = [];
  const showClienteBreakdown = isAdmin || (isSuperadmin && !!scopedOrgId);
  if (showClienteBreakdown) {
    const namesById = new Map<string, string>();
    if (clienteOptions.length > 0) {
      for (const c of clienteOptions) namesById.set(c.id, c.full_name ?? "—");
    } else {
      const creatorIds = Array.from(new Set(campaigns.map((c) => c.created_by)));
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);
        for (const c of creators ?? []) namesById.set(c.id, c.full_name ?? "—");
      }
    }

    const reportsByCampaign = dedupeReports(reports);
    const byCliente = new Map<string, { campanhas: number; disparos: number; enviados: number; entregues: number }>();
    for (const c of campaigns) {
      const bucket = byCliente.get(c.created_by) ?? { campanhas: 0, disparos: 0, enviados: 0, entregues: 0 };
      bucket.campanhas += 1;
      if (SENT_STATUSES.includes(c.status)) bucket.disparos += 1;
      const report = reportsByCampaign.get(c.id);
      if (report) {
        bucket.enviados += report.enviados;
        bucket.entregues += report.entregues;
      }
      byCliente.set(c.created_by, bucket);
    }

    clienteBreakdown = Array.from(byCliente.entries())
      .map(([id, v]) => ({ id, name: namesById.get(id) ?? "—", ...v }))
      .sort((a, b) => b.disparos - a.disparos);
  }

  // ---- por organização (só superadmin, sem org selecionada) ----
  let orgBreakdown: { name: string; campanhas: number; enviados: number }[] = [];
  if (isSuperadmin && !scopedOrgId) {
    const campaignsByOrg = new Map<string, number>();
    for (const c of campaigns) {
      if (!c.organization_id) continue;
      campaignsByOrg.set(c.organization_id, (campaignsByOrg.get(c.organization_id) ?? 0) + 1);
    }
    const campaignOrgById = new Map(campaigns.map((c) => [c.id, c.organization_id]));
    const enviadosByOrg = new Map<string, number>();
    for (const r of reports) {
      const orgId = campaignOrgById.get(r.campaign_id);
      if (!orgId) continue;
      enviadosByOrg.set(orgId, (enviadosByOrg.get(orgId) ?? 0) + r.enviados);
    }
    orgBreakdown = organizations.map((o) => ({
      name: o.name,
      campanhas: campaignsByOrg.get(o.id) ?? 0,
      enviados: enviadosByOrg.get(o.id) ?? 0,
    }));
  }

  // ---- drill-down por status (tile clicado) ----
  const detailStatus = params.detail as CampaignStatus | undefined;
  let detailRows: { id: string; name: string; status: CampaignStatus; created_at: string; creatorName: string }[] = [];
  if (detailStatus) {
    const filtered = campaigns.filter((c) => c.status === detailStatus);
    const creatorIds = Array.from(new Set(filtered.map((c) => c.created_by)));
    const namesById = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase.from("profiles").select("id, full_name").in("id", creatorIds);
      for (const c of creators ?? []) namesById.set(c.id, c.full_name ?? "—");
    }
    detailRows = filtered
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        created_at: c.created_at,
        creatorName: namesById.get(c.created_by) ?? "—",
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  // ---- campanha selecionada via filtro (pra oferecer download direto) ----
  let selectedCampaign: {
    id: string;
    name: string;
    status: CampaignStatus;
    contactListId: string | null;
    hasDownloadableReport: boolean;
  } | null = null;
  if (params.campaignId) {
    const { data: sc } = await supabase
      .from("campaigns")
      .select("id, name, status, contact_list_id, campaign_reports(origem, raw_file_path)")
      .eq("id", params.campaignId)
      .maybeSingle();
    if (sc) {
      selectedCampaign = {
        id: sc.id,
        name: sc.name,
        status: sc.status,
        contactListId: sc.contact_list_id,
        hasDownloadableReport: (sc.campaign_reports ?? []).some(
          (r) => r.origem === "manual" && r.raw_file_path?.includes("/")
        ),
      };
    }
  }

  const baseFilterParams = {
    from: params.from,
    to: params.to,
    orgId: params.orgId,
    clienteId: params.clienteId,
    campaignId: params.campaignId,
    status: params.status,
  };
  const hasActiveFilters = Object.values(baseFilterParams).some(Boolean);

  const shortcuts: { href: string; label: string }[] = isSuperadmin
    ? [
        { href: "/organizacoes", label: "Organizações" },
        { href: "/aprovacoes", label: "Aprovações" },
        { href: "/webhooks", label: "Webhooks" },
        { href: "/relatorios", label: "Relatórios" },
        { href: "/auditoria", label: "Auditoria" },
      ]
    : isAdmin
      ? [
          { href: "/clientes", label: "Clientes" },
          { href: "/campanhas", label: "Campanhas" },
          { href: "/aprovacoes", label: "Aprovações" },
        ]
      : [{ href: "/campanhas", label: "Campanhas" }];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Olá, {profile.full_name ?? "usuário"}</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-64">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardFilters
                from={params.from}
                to={params.to}
                orgId={params.orgId}
                clienteId={params.clienteId}
                campaignId={params.campaignId}
                status={params.status}
                isSuperadmin={isSuperadmin}
                organizations={organizations.map((o) => ({ id: o.id, label: o.name }))}
                clienteOptions={clienteOptions.map((c) => ({ id: c.id, label: c.full_name ?? "—" }))}
                campaignOptions={campaignOptions.map((c) => ({ id: c.id, label: c.name }))}
                statusOptions={TILE_STATUSES.map((t) => ({ id: t.key, label: t.label }))}
                hasActiveFilters={hasActiveFilters}
              />
            </CardContent>
          </Card>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TILE_STATUSES.map((t) => (
              <StatTile
                key={t.key}
                label={t.label}
                value={statusCounts[t.key] ?? 0}
                tone={CAMPAIGN_STATUS_TONE[t.key]}
                active={detailStatus === t.key}
                info={t.info}
                href={`/dashboard${buildQueryString({ ...baseFilterParams, detail: t.key })}`}
              />
            ))}
          </div>

          {selectedCampaign ? (
            <Card>
              <CardHeader>
                <CardTitle>Campanha selecionada</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{selectedCampaign.name}</p>
                  <StatusBadge tone={CAMPAIGN_STATUS_TONE[selectedCampaign.status]}>
                    {CAMPAIGN_STATUS_LABELS[selectedCampaign.status]}
                  </StatusBadge>
                </div>
                {selectedCampaign.contactListId ? (
                  <DownloadContactListButton campaignId={selectedCampaign.id} />
                ) : null}
                {!isAdmin && selectedCampaign.hasDownloadableReport ? (
                  <DownloadReportButton campaignId={selectedCampaign.id} />
                ) : null}
                {!selectedCampaign.contactListId && !selectedCampaign.hasDownloadableReport ? (
                  <p className="text-sm text-muted-foreground">
                    Ainda não há planilha de contatos nem relatório disponível pra essa campanha.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {detailStatus ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento — {CAMPAIGN_STATUS_LABELS[detailStatus]}</CardTitle>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/dashboard${buildQueryString(baseFilterParams)}`}>Fechar</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.creatorName}</TableCell>
                        <TableCell>
                          <StatusBadge tone={CAMPAIGN_STATUS_TONE[r.status]}>
                            {CAMPAIGN_STATUS_LABELS[r.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {detailRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma campanha nesse status.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Volume de envios</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Enviados" value={totals.enviados} info={VOLUME_INFO.enviados} />
              <StatTile label="Entregues" value={totals.entregues} tone="success" info={VOLUME_INFO.entregues} />
              <StatTile label="Lidos (vistos)" value={totals.lidos} tone="success" info={VOLUME_INFO.lidos} />
              <StatTile label="Expirados" value={totals.expirados} tone="warning" info={VOLUME_INFO.expirados} />
              <StatTile label="Falhados" value={totals.falhados} tone="destructive" info={VOLUME_INFO.falhados} />
            </CardContent>
          </Card>

          {showClienteBreakdown ? (
            <Card>
              <CardHeader>
                <CardTitle>Por cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>
                        <HeadWithInfo info="Quantidade de campanhas criadas por esse cliente no período/filtro selecionado.">
                          Campanhas
                        </HeadWithInfo>
                      </TableHead>
                      <TableHead>
                        <HeadWithInfo info="Campanhas do cliente que chegaram a ser liberadas, estão enviando, concluídas ou falharam.">
                          Disparos
                        </HeadWithInfo>
                      </TableHead>
                      <TableHead>
                        <HeadWithInfo info={VOLUME_INFO.enviados}>Enviados</HeadWithInfo>
                      </TableHead>
                      <TableHead>
                        <HeadWithInfo info={VOLUME_INFO.entregues}>Entregues</HeadWithInfo>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clienteBreakdown.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.campanhas}</TableCell>
                        <TableCell>{c.disparos}</TableCell>
                        <TableCell>{c.enviados}</TableCell>
                        <TableCell>{c.entregues}</TableCell>
                      </TableRow>
                    ))}
                    {clienteBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum cliente com campanhas no período.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {isSuperadmin && !scopedOrgId ? (
            <Card>
              <CardHeader>
                <CardTitle>Por organização</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organização</TableHead>
                      <TableHead>
                        <HeadWithInfo info="Quantidade de campanhas criadas dentro dessa organização no período/filtro selecionado.">
                          Campanhas
                        </HeadWithInfo>
                      </TableHead>
                      <TableHead>
                        <HeadWithInfo info={VOLUME_INFO.enviados}>Enviados</HeadWithInfo>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgBreakdown.map((o) => (
                      <TableRow key={o.name}>
                        <TableCell>{o.name}</TableCell>
                        <TableCell>{o.campanhas}</TableCell>
                        <TableCell>{o.enviados}</TableCell>
                      </TableRow>
                    ))}
                    {orgBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhuma organização ainda.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Atalhos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <Button key={s.href} asChild variant="outline" size="sm">
                  <Link href={s.href}>{s.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
