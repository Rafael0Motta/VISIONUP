import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("key, enabled");
  return Object.fromEntries((data ?? []).map((f) => [f.key, f.enabled]));
}

/** Flag inexistente = não bloqueia nada (fail-open pra features não catalogadas ainda). */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
  return data?.enabled ?? true;
}
