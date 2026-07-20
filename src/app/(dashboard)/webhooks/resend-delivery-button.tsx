"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { retryWebhookDelivery } from "./actions";
import { Button } from "@/components/ui/button";

export function ResendDeliveryButton({ deliveryId }: { deliveryId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { status } = await retryWebhookDelivery(deliveryId);
        if (status === "entregue") {
          toast.success("Evento reenviado com sucesso.");
        } else {
          toast.error(`Reenvio não confirmou entrega (status: ${status}).`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível reenviar.");
      }
    });
  }

  return (
    <Button type="button" size="sm" variant="ghost" onClick={handleClick} disabled={isPending}>
      <RefreshCw className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
      {isPending ? "Reenviando..." : "Reenviar"}
    </Button>
  );
}
