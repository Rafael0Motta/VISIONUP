"use client";

import { deleteOrgAdmin } from "./admin-actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

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
      <TableCell className="text-right">
        <DeleteButton
          action={deleteOrgAdmin.bind(null, id)}
          confirmMessage={`Excluir o administrador ${fullName ?? ""}? Não pode ser desfeito.`}
        />
      </TableCell>
    </TableRow>
  );
}
