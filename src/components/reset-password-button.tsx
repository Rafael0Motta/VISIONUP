"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ResetPasswordButton({
  action,
  confirmMessage,
  targetLabel,
}: {
  action: () => Promise<{ password: string }>;
  confirmMessage: string;
  targetLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      try {
        const { password } = await action();
        setGeneratedPassword(password);
        setOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Redefinindo..." : "Redefinir senha"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova senha — {targetLabel}</DialogTitle>
          </DialogHeader>
          <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            Senha temporária: <code className="font-mono">{generatedPassword}</code>
            <br />
            Copie e repasse agora — ela não será exibida novamente.
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
