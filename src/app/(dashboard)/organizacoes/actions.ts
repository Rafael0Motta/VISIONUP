"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";

export type FormState = { error: string | null };

export async function createOrganization(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireRole(["superadmin"]);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Informe o nome da organização." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível criar a organização." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "organization_created",
    organization_id: data.id,
    metadata: { name },
  });
  await enqueueWebhook({
    event: "organization_created",
    organizationId: data.id,
    actor,
    data: { organization_id: data.id, name },
  });

  revalidatePath("/organizacoes");
  redirect(`/organizacoes/${data.id}`);
}

export async function updateOrganization(
  organizationId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await requireRole(["superadmin"]);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Informe o nome da organização." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", organizationId);

  if (error) {
    return { error: "Não foi possível atualizar a organização." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "organization_updated",
    organization_id: organizationId,
    metadata: { name },
  });
  await enqueueWebhook({
    event: "organization_updated",
    organizationId,
    actor,
    data: { organization_id: organizationId, name },
  });

  revalidatePath("/organizacoes");
  revalidatePath(`/organizacoes/${organizationId}`);
  return { error: null };
}

export async function deleteOrganization(organizationId: string) {
  const actor = await requireRole(["superadmin"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) {
    throw new Error("Não foi possível excluir a organização.");
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "organization_deleted",
    organization_id: null,
    metadata: { organization_id: organizationId },
  });

  revalidatePath("/organizacoes");
}
