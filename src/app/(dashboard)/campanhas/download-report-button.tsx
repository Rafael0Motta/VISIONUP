"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { getReportDownloadUrl } from "../relatorios/actions";
import { Button } from "@/components/ui/button";

export function DownloadReportButton({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { url } = await getReportDownloadUrl(campaignId);
        window.open(url, "_blank");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível baixar o relatório.");
      }
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      <FileDown className="size-3.5" />
      {isPending ? "Gerando..." : "Relatório"}
    </Button>
  );
}
