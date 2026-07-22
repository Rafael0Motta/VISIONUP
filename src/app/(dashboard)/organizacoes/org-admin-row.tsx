"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateOrgAdmin, deleteOrgAdmin, resetAdminPassword } from "./admin-actions";
import type { FormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { ResetPasswordButton } from "@/components/reset-password-button";

const initialState: FormState = { error: null };

export function OrgAdminRow({
  id,
  fullName,
  email,
}: {
  id: string;
  fullName: string | null;
  email: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateOrgAdmin.bind(null, id),
    initialState
  );
  useActionToast(state, isPending, "Administrador atualizado.");

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setIsEditing(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={3}>
          <form action={formAction} className="flex items-end gap-3">
            <Input name="full_name" defaultValue={fullName ?? ""} required disabled={isPending} />
            <Button type="submit" size="sm" disabled={isPending}>
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{fullName ?? "—"}</TableCell>
      <TableCell>{email}</TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Editar
        </Button>
        <ResetPasswordButton
          action={resetAdminPassword.bind(null, id)}
          confirmMessage={`Redefinir a senha de ${fullName ?? "este administrador"}? A senha atual deixa de funcionar.`}
          targetLabel={fullName ?? "administrador"}
        />
        <DeleteButton
          action={deleteOrgAdmin.bind(null, id)}
          confirmMessage={`Excluir o administrador ${fullName ?? ""}? Não pode ser desfeito.`}
        />
      </TableCell>
    </TableRow>
  );
}
