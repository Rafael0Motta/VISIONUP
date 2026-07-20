"use client";

import { useActionState, useRef } from "react";
import { uploadManualReport, type ReportFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CampaignReport } from "./page";

const initialState: ReportFormState = { error: null };

const ORIGIN_LABEL: Record<CampaignReport["origem"], string> = {
  automatico: "Automático",
  manual: "Manual",
};

export function ReportRow({
  campaignId,
  campaignName,
  reports,
}: {
  campaignId: string;
  campaignName: string;
  reports: CampaignReport[];
}) {
  const [state, formAction, isPending] = useActionState(
    uploadManualReport.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, "Relatório importado.");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <TableRow>
      <TableCell className="align-top font-medium">{campaignName}</TableCell>
      <TableCell className="align-top">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem relatório ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={r.origem === "automatico" ? "default" : "secondary"}>
                  {ORIGIN_LABEL[r.origem]}
                </Badge>
                <span className="text-muted-foreground">
                  Enviados: <strong className="text-foreground">{r.enviados}</strong> · Entregues:{" "}
                  <strong className="text-foreground">{r.entregues}</strong> · Lidos:{" "}
                  <strong className="text-foreground">{r.lidos}</strong> · Falhados:{" "}
                  <strong className="text-foreground">{r.falhados}</strong> · Expirados:{" "}
                  <strong className="text-foreground">{r.expirados}</strong>
                  {r.custo !== null ? (
                    <>
                      {" "}
                      · Custo: <strong className="text-foreground">{r.custo}</strong>
                    </>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-right">
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex items-center justify-end gap-2"
        >
          <Input
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isPending}
            className="h-8 w-56 text-xs"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Importando..." : "Importar"}
          </Button>
        </form>
        {state.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
      </TableCell>
    </TableRow>
  );
}
