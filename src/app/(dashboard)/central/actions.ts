"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function toggleFeatureFlag(key: string) {
  const actor = await requireRole(["superadmin"]);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .single();

  if (!current) return;

  await supabase
    .from("feature_flags")
    .update({ enabled: !current.enabled, updated_by: actor.id })
    .eq("key", key);

  revalidatePath("/central");
}
