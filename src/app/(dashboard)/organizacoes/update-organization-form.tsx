"use client";

import { useActionState } from "react";
import { updateOrganization, deleteOrganization, type FormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/components/delete-button";

const initialState: FormState = { error: null };

export function UpdateOrganizationForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState(
    updateOrganization.bind(null, id),
    initialState
  );
  useActionToast(state, isPending, "Organização atualizada.");

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-none">
          <Label htmlFor="name">Nome da organização</Label>
          <Input id="name" name="name" defaultValue={name} required disabled={isPending} />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <DeleteButton
          action={deleteOrganization.bind(null, id)}
          confirmMessage={`Excluir a organização "${name}"? Isso remove todos os clientes, templates e campanhas dela. Não pode ser desfeito.`}
          successMessage="Organização excluída."
          redirectTo="/organizacoes"
        />
      </form>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </div>
  );
}
