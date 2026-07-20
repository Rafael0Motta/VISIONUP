"use client";

import { useActionState } from "react";
import { createCliente, type ClienteFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ClienteFormState = { error: null };

export function CreateClienteForm({
  organizationId,
  organizationName,
  currentDisplayName,
}: {
  organizationId: string | null;
  /** Nome real da organização (referência, exibido como placeholder do campo de exibição). */
  organizationName?: string;
  /** Nome de exibição atual da organização, se houver — pré-preenche o campo. */
  currentDisplayName?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createCliente.bind(null, organizationId),
    initialState
  );
  useActionToast(state, isPending, null);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Nome</Label>
          <Input id="full_name" name="full_name" required disabled={isPending} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required disabled={isPending} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="display_name">Nome de exibição da organização (opcional)</Label>
          <Input
            id="display_name"
            name="display_name"
            placeholder={organizationName ?? "Nome real da organização"}
            defaultValue={currentDisplayName ?? ""}
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar cliente"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Esse nome é o que os clientes dessa organização veem no lugar do nome interno. Deixe em
        branco pra manter o nome real.
      </p>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.generatedPassword ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          Cliente <strong>{state.createdEmail}</strong> criado. Senha temporária:{" "}
          <code className="font-mono">{state.generatedPassword}</code>
          <br />
          Copie e repasse agora — ela não será exibida novamente.
        </p>
      ) : null}
    </div>
  );
}
