"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { toggleVariationActive, deleteVariation } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export function VariationRow({
  id,
  content,
  isActive,
  hasMedia,
}: {
  id: string;
  content: string;
  isActive: boolean;
  hasMedia: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleVariationActive(id);
        toast.success(isActive ? "Variação desativada." : "Variação ativada.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a variação.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="max-w-md whitespace-pre-line text-sm">
        <div className="flex items-start gap-2">
          {hasMedia ? (
            <ImageIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label="Tem mídia" />
          ) : null}
          <span>{content}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Ativa" : "Inativa"}
        </Badge>
      </TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <Button asChild size="sm" variant="outline">
          <Link href={`/catalogo-variacoes/${id}`}>Editar</Link>
        </Button>
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
