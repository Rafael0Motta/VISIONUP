"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Option = { id: string; label: string };

export function DashboardFilters({
  from,
  to,
  orgId,
  clienteId,
  campaignId,
  status,
  isSuperadmin,
  organizations,
  clienteOptions,
  campaignOptions,
  statusOptions,
  hasActiveFilters,
}: {
  from?: string;
  to?: string;
  orgId?: string;
  clienteId?: string;
  campaignId?: string;
  status?: string;
  isSuperadmin: boolean;
  organizations: Option[];
  clienteOptions: Option[];
  campaignOptions: Option[];
  statusOptions: Option[];
  hasActiveFilters: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Trocar organização/cliente muda o conjunto de campanhas disponível —
  // por isso os filtros dependentes são limpos e o form é reenviado na hora,
  // em vez de esperar o clique em "Aplicar" com uma seleção que não existe mais.
  function resetAndSubmit(fieldsToClear: string[]) {
    const form = formRef.current;
    if (!form) return;
    for (const field of fieldsToClear) {
      const el = form.elements.namedItem(field);
      if (el instanceof HTMLSelectElement) el.value = "";
    }
    form.requestSubmit();
  }

  return (
    <form ref={formRef} method="get" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="from">
          De
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="to">
          Até
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      {isSuperadmin ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="orgId">
            Organização
          </label>
          <select
            id="orgId"
            name="orgId"
            defaultValue={orgId ?? ""}
            onChange={() => resetAndSubmit(["clienteId", "campaignId"])}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {clienteOptions.length > 0 ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="clienteId">
            Cliente
          </label>
          <select
            id="clienteId"
            name="clienteId"
            defaultValue={clienteId ?? ""}
            onChange={() => resetAndSubmit(["campaignId"])}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {clienteOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="campaignId">
          Campanha
        </label>
        <select
          id="campaignId"
          name="campaignId"
          defaultValue={campaignId ?? ""}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">
            {clienteOptions.length > 0 && !clienteId ? "Todas (selecione um cliente)" : "Todas"}
          </option>
          {campaignOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="status">
          Status da campanha
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos</option>
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" className="w-full">
        Aplicar
      </Button>
      {hasActiveFilters ? (
        <Button asChild type="button" size="sm" variant="ghost" className="w-full">
          <Link href="/dashboard">Limpar filtros</Link>
        </Button>
      ) : null}
    </form>
  );
}
