"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/auth/password";
import type { FormState } from "./actions";

export type OrgAdminFormState = FormState & {
  generatedPassword?: string;
  createdEmail?: string;
};

export async function createOrgAdmin(
  organizationId: string,
  _prevState: OrgAdminFormState,
  formData: FormData
): Promise<OrgAdminFormState> {
  const actor = await requireRole(["superadmin"]);

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

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
    role: "admin",
    organization_id: organizationId,
    full_name: fullName,
    email,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível criar o perfil do administrador." };
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "org_admin_created",
    organization_id: organizationId,
    metadata: { admin_id: created.user.id, full_name: fullName, email },
  });

  revalidatePath(`/organizacoes/${organizationId}`);
  return { error: null, generatedPassword: password, createdEmail: email };
}

export async function deleteOrgAdmin(adminId: string) {
  const actor = await requireRole(["superadmin"]);

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  if (fetchError || !target || !target.organization_id) {
    throw new Error("Administrador não encontrado.");
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(adminId);

  if (deleteError) {
    throw new Error("Não foi possível excluir o administrador.");
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: "org_admin_deleted",
    organization_id: target.organization_id,
    metadata: { admin_id: adminId, full_name: target.full_name },
  });

  revalidatePath(`/organizacoes/${target.organization_id}`);
}
