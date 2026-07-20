"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { triggerWebhookSweep } from "./actions";
import { Button } from "@/components/ui/button";

export function SweepButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await triggerWebhookSweep();
      toast.success(`Sweep concluído: ${result.processed} entrega(s) processada(s).`);
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} />
      {isPending ? "Processando..." : "Processar fila agora"}
    </Button>
  );
}
