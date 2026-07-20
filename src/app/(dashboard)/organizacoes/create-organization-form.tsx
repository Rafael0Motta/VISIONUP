"use client";

import { useActionState } from "react";
import { createOrganization, type FormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = { error: null };

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(createOrganization, initialState);
  useActionToast(state, isPending, "Organização criada.");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-none">
        <Label htmlFor="name">Nova organização</Label>
        <Input id="name" name="name" placeholder="Ex: Minha Empresa" required disabled={isPending} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar"}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
