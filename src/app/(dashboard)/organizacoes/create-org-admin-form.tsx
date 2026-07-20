"use client";

import { useActionState } from "react";
import { createOrgAdmin, type OrgAdminFormState } from "./admin-actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OrgAdminFormState = { error: null };

export function CreateOrgAdminForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, isPending] = useActionState(
    createOrgAdmin.bind(null, organizationId),
    initialState
  );
  useActionToast(state, isPending, null);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin_full_name">Nome</Label>
          <Input id="admin_full_name" name="full_name" required disabled={isPending} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin_email">E-mail</Label>
          <Input id="admin_email" name="email" type="email" required disabled={isPending} />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar administrador"}
        </Button>
      </form>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.generatedPassword ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          Administrador <strong>{state.createdEmail}</strong> criado. Senha temporária:{" "}
          <code className="font-mono">{state.generatedPassword}</code>
          <br />
          Copie e repasse agora — ela não será exibida novamente.
        </p>
      ) : null}
    </div>
  );
}
