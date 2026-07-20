"use client";

import { useActionState } from "react";
import { updateOrganizationDisplayName, type SettingsFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SettingsFormState = { error: null };

export function DisplayNameForm({
  realName,
  displayName,
}: {
  realName: string;
  displayName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateOrganizationDisplayName,
    initialState
  );
  useActionToast(state, isPending, "Nome de exibição atualizado.");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Nome real (interno)</Label>
        <Input value={realName} disabled />
        <p className="text-xs text-muted-foreground">
          Esse é o nome da sua organização no sistema — não muda. Todos os seus clientes
          continuam vinculados a ele internamente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Nome de exibição para os clientes</Label>
        <Input
          id="display_name"
          name="display_name"
          placeholder={realName}
          defaultValue={displayName}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Se preenchido, seus clientes veem esse nome em vez de &quot;{realName}&quot;. Deixe em
          branco pra usar o nome real.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
