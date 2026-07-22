"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateCliente, deleteCliente, resetClientePassword, type ClienteFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { ResetPasswordButton } from "@/components/reset-password-button";

const initialState: ClienteFormState = { error: null };

export function ClienteRow({
  id,
  fullName,
  email,
  campaignCount,
  canDelete = true,
}: {
  id: string;
  fullName: string | null;
  email: string;
  campaignCount: number;
  canDelete?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateCliente.bind(null, id),
    initialState
  );
  useActionToast(state, isPending, "Cliente atualizado.");

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
        <TableCell colSpan={4}>
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
      <TableCell>
        {campaignCount > 0 ? (
          <Link href={`/campanhas?clienteId=${id}`} className="text-sm underline">
            {campaignCount} campanha{campaignCount === 1 ? "" : "s"}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Nenhuma</span>
        )}
      </TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Editar
        </Button>
        <ResetPasswordButton
          action={resetClientePassword.bind(null, id)}
          confirmMessage={`Redefinir a senha de ${fullName ?? "este cliente"}? A senha atual deixa de funcionar.`}
          targetLabel={fullName ?? "cliente"}
        />
        {canDelete ? (
          <DeleteButton
            action={deleteCliente.bind(null, id)}
            confirmMessage={`Excluir ${fullName ?? "este cliente"}? Isso remove também templates, campanhas e listas de contatos dele. Não pode ser desfeito.`}
            successMessage="Cliente excluído."
          />
        ) : null}
      </TableCell>
    </TableRow>
  );
}
