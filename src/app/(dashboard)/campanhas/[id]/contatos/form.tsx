"use client";

import { useActionState } from "react";
import { uploadCampaignContacts, type CampaignFormState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CampaignFormState = { error: null };

export function ContatosForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, isPending] = useActionState(
    uploadCampaignContacts.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Arquivo CSV</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required disabled={isPending} />
        <p className="text-xs text-muted-foreground">
          Precisa de uma coluna de telefone (telefone, phone, celular ou whatsapp). Nome e
          variáveis (variavel_1, variavel_2...) são opcionais.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Processando..." : "Avançar"}
      </Button>
    </form>
  );
}
