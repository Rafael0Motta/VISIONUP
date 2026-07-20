"use client";

import { deleteOrgAdmin, resetAdminPassword } from "./admin-actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { ResetPasswordButton } from "@/components/reset-password-button";

export function OrgAdminRow({
  id,
  fullName,
  email,
}: {
  id: string;
  fullName: string | null;
  email: string;
}) {
  return (
    <TableRow>
      <TableCell>{fullName ?? "—"}</TableCell>
      <TableCell>{email}</TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
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
