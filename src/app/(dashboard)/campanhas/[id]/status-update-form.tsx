"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCampaignStatusUpdate, type StatusUpdateFormState } from "./status-updates-actions";
import { useActionToast } from "@/lib/use-action-toast";
import { PIPELINE_STATUS_VALUES, PIPELINE_STATUS_LABELS } from "@/lib/campaigns/pipeline-status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: StatusUpdateFormState = { error: null };
const NONE_VALUE = "__none__";

export function StatusUpdateForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, isPending] = useActionState(
    addCampaignStatusUpdate.bind(null, campaignId),
    initialState
  );
  useActionToast(state, isPending, "Atualização registrada.");

  const [status, setStatus] = useState(NONE_VALUE);
  const [comment, setComment] = useState("");

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setStatus(NONE_VALUE);
      setComment("");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Nova atualização</p>
      <Select
        name="status"
        value={status}
        onValueChange={setStatus}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status (opcional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Sem status (só comentário)</SelectItem>
          {PIPELINE_STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {PIPELINE_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        name="comment"
        placeholder="Comentário (opcional)"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isPending}
      />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Registrar"}
      </Button>
    </form>
  );
}
