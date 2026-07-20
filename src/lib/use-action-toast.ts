"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Dispara um toast assim que uma submissão via useActionState termina
 * (transição de isPending true -> false). Não dispara no mount inicial.
 */
export function useActionToast(
  state: { error: string | null },
  isPending: boolean,
  successMessage: string | null
) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) {
        toast.error(state.error);
      } else if (successMessage) {
        toast.success(successMessage);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, successMessage]);
}
