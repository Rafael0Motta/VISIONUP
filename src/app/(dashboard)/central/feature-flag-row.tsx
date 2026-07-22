"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleFeatureFlag } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function FeatureFlagRow({
  flagKey,
  label,
  description,
  enabled,
}: {
  flagKey: string;
  label: string;
  description: string | null;
  enabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleFeatureFlag(flagKey);
        toast.success(enabled ? "Funcionalidade desativada." : "Funcionalidade ativada.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
      }
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox
        id={flagKey}
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={flagKey} className="font-medium">
          {label}
        </Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
