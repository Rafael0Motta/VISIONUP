"use client";

import { useActionState } from "react";
import { createVariation, type VariationFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: VariationFormState = { error: null };

export function CreateVariationForm() {
  const [state, formAction, isPending] = useActionState(createVariation, initialState);
  useActionToast(state, isPending, "Variação adicionada.");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="content"
        rows={4}
        placeholder={"Opa {{1}}!\n\nTemos novidade: {{2}}.\n\n{{3}}\n\nPara {{4}}, use o botão abaixo 👇"}
        required
        disabled={isPending}
      />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Adicionando..." : "Adicionar variação"}
      </Button>
    </form>
  );
}
