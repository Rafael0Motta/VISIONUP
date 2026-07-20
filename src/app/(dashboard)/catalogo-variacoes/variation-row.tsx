"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleVariationActive, deleteVariation } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export function VariationRow({
  id,
  content,
  isActive,
}: {
  id: string;
  content: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleVariationActive(id, isActive);
      toast.success(isActive ? "Variação desativada." : "Variação ativada.");
    });
  }

  return (
    <TableRow>
      <TableCell className="max-w-md whitespace-pre-line text-sm">{content}</TableCell>
      <TableCell>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Ativa" : "Inativa"}
        </Badge>
      </TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <Button type="button" size="sm" variant="outline" onClick={handleToggle} disabled={isPending}>
          {isActive ? "Desativar" : "Ativar"}
        </Button>
        <DeleteButton
          action={deleteVariation.bind(null, id)}
          confirmMessage="Excluir esta variação do catálogo? Não pode ser desfeito."
          successMessage="Variação excluída."
        />
      </TableCell>
    </TableRow>
  );
}
