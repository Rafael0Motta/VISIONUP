"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { getContactListDownloadUrl } from "./actions";
import { Button } from "@/components/ui/button";

export function DownloadContactListButton({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { url } = await getContactListDownloadUrl(campaignId);
        window.open(url, "_blank");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível baixar a planilha.");
      }
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      <Download className="size-3.5" />
      {isPending ? "Gerando..." : "Planilha"}
    </Button>
  );
}
