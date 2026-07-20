"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Excluir",
  successMessage = "Excluído com sucesso.",
  redirectTo,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  successMessage?: string;
  redirectTo?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        if (redirectTo) router.push(redirectTo);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir.");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Excluindo..." : label}
    </Button>
  );
}
