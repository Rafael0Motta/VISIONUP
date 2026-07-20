"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";

export type ClienteFormState = {
  error: string | null;
  generatedPassword?: string;
  createdEmail?: string;
};

function revalidateClientePaths(organizationId: string) {
  revalidatePath("/clientes");
  revalidatePath(`/organizacoes/${organizationId}`);
}

/**
 * organizationId: quando null, usa a organização do próprio admin autenticado.
 * Superadmin sempre deve passar a organização explicitamente (vem da URL de
 * /organizacoes/[id], não de input do formulário).
 */
export async function createCliente(
  organizationId: string | null,
  _prevState: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const actor = await requireRole(["admin", "superadmin"]);

  const orgId = actor.role === "admin" ? actor.organization_id : organizationId;
  if (!orgId) {
    return { error: "Organização não informada." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const displayName = formData.has("display_name")
    ? String(formData.get("display_name") ?? "").trim()
    : null;

  if (!fullName || !email) {
    return { error: "Informe nome e e-mail." };
  }

  const admin = createAdminClient();
  const password = generateTemporaryPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: "Não foi possível criar o usuário (e-mail já usado?)." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    role: "cliente",
    organization_id: orgId,
    full_name: fullName,
    email,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível criar o perfil do cliente." };
  }

  if (displayName !== null) {
    await supabase
      .from("organizations")
      .update({ display_name: displayName || null })
      .eq("id", orgId);
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "client_created",
    organization_id: orgId,
    metadata: { cliente_id: created.user.id, full_name: fullName, email },
  });
  await enqueueWebhook({
    event: "client_created",
    organizationId: orgId,
    actor,
    data: { cliente_id: created.user.id, full_name: fullName, email },
  });

  revalidateClientePaths(orgId);
  return { error: null, generatedPassword: password, createdEmail: email };
}

export async function updateCliente(
  clienteId: string,
  _prevState: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const actor = await requireRole(["admin", "superadmin"]);
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName) {
    return { error: "Informe o nome do cliente." };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", clienteId)
    .eq("role", "cliente")
    .single();

  if (fetchError || !target || !target.organization_id) {
    return { error: "Cliente não encontrado ou sem permissão." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", clienteId);

  if (updateError) {
    return { error: "Não foi possível atualizar o cliente." };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "client_updated",
    organization_id: target.organization_id,
    metadata: { cliente_id: clienteId, full_name: fullName },
  });
  await enqueueWebhook({
    event: "client_updated",
    organizationId: target.organization_id,
    actor,
    data: { cliente_id: clienteId, full_name: fullName },
  });

  revalidateClientePaths(target.organization_id);
  return { error: null };
}

export async function resetClientePassword(clienteId: string): Promise<{ password: string }> {
  const actor = await requireRole(["admin", "superadmin"]);

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name")
    .eq("id", clienteId)
    .eq("role", "cliente")
    .single();

  if (fetchError || !target || !target.organization_id) {
    throw new Error("Cliente não encontrado ou sem permissão.");
  }

  const admin = createAdminClient();
  const password = generateTemporaryPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(clienteId, { password });

  if (updateError) {
    throw new Error("Não foi possível redefinir a senha.");
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "client_password_reset",
    organization_id: target.organization_id,
    metadata: { cliente_id: clienteId, full_name: target.full_name },
  });

  return { password };
}

export async function deleteCliente(clienteId: string) {
  const actor = await requireRole(["admin", "superadmin"]);

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name")
    .eq("id", clienteId)
    .eq("role", "cliente")
    .single();

  if (fetchError || !target || !target.organization_id) {
    throw new Error("Cliente não encontrado ou sem permissão.");
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(clienteId);

  if (deleteError) {
    throw new Error("Não foi possível excluir o cliente.");
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "client_deleted",
    organization_id: target.organization_id,
    metadata: { cliente_id: clienteId, full_name: target.full_name },
  });
  await enqueueWebhook({
    event: "client_deleted",
    organizationId: target.organization_id,
    actor,
    data: { cliente_id: clienteId, full_name: target.full_name },
  });

  revalidateClientePaths(target.organization_id);
}
