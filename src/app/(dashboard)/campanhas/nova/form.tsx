"use client";

import { useActionState, useState } from "react";
import { createCampaignDraft, type CampaignFormState } from "../actions";
import { useActionToast } from "@/lib/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: CampaignFormState = { error: null };

export function NovaCampanhaForm() {
  const [state, formAction, isPending] = useActionState(createCampaignDraft, initialState);
  useActionToast(state, isPending, null);
  const [profileEnabled, setProfileEnabled] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da campanha *</Label>
        <Input id="name" name="name" placeholder="Ex: Campanha Black Friday 2026" required disabled={isPending} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="profile_enabled"
          name="profile_enabled"
          checked={profileEnabled}
          onCheckedChange={(checked) => setProfileEnabled(checked === true)}
          disabled={isPending}
        />
        <Label htmlFor="profile_enabled" className="font-normal">
          Personalizar perfil do WhatsApp usado nesta campanha
        </Label>
      </div>

      {profileEnabled ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name">Nome de exibição</Label>
            <Input id="display_name" name="display_name" disabled={isPending} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="photo">Foto de perfil</Label>
            <Input id="photo" name="photo" type="file" accept="image/*" disabled={isPending} />
          </div>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Criando..." : "Avançar"}
      </Button>
    </form>
  );
}
