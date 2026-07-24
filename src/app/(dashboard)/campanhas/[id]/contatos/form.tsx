"use client";

import Link from "next/link";
import { useActionState } from "react";
import { uploadCampaignContacts, type ContactsPreview, type ContactsUploadState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

const initialState: ContactsUploadState = { error: null };

function PreviewTable({ preview }: { preview: ContactsPreview }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div>
        <p className="font-medium">{preview.fileName}</p>
        <p className="text-sm text-muted-foreground">
          {preview.total} contato{preview.total === 1 ? "" : "s"} ({preview.validCount} válido
          {preview.validCount === 1 ? "" : "s"}
          {preview.invalidCount > 0
            ? `, ${preview.invalidCount} inválido${preview.invalidCount === 1 ? "" : "s"}`
            : ""}
          )
        </p>
      </div>
      {preview.sampleRows.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.sampleRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{row.phone || "—"}</TableCell>
                  <TableCell>{row.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.isValid ? "default" : "destructive"}>
                      {row.isValid ? "Válido" : "Inválido"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {preview.total > preview.sampleRows.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Mostrando {preview.sampleRows.length} de {preview.total} linhas.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ContatosForm({
  campaignId,
  existingPreview,
}: {
  campaignId: string;
  existingPreview: ContactsPreview | null;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadCampaignContacts.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, null);

  const preview = state.preview ?? existingPreview;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">{preview ? "Enviar nova lista (substitui a atual)" : "Arquivo CSV"}</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required={!preview} disabled={isPending} />
          <p className="text-xs text-muted-foreground">
            Precisa de uma coluna de telefone (telefone, phone, celular ou whatsapp). Nome e
            variáveis (variavel_1, variavel_2...) são opcionais.
          </p>
          <a
            href="/modelo-contatos.csv"
            download
            className="inline-flex w-fit items-center gap-1 text-xs text-primary underline"
          >
            <Download className="size-3" />
            Baixar CSV modelo
          </a>
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Processando..." : "Enviar arquivo"}
        </Button>
      </form>

      {preview ? (
        <>
          <PreviewTable preview={preview} />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/campanhas/${campaignId}/confirmacao`}>Avançar</Link>
            </Button>
            <Button asChild>
              <Link href={`/campanhas/${campaignId}/agendamento`}>Agendar campanha</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
