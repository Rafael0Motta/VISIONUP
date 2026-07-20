"use server";

import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ChangePasswordState = { error: string | null };

export async function changeOwnPassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const profile = await requireAuth();

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Preencha todos os campos." };
  }
  if (newPassword.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não bate com a nova senha." };
  }

  const supabase = await createClient();

  // Reautentica com a senha atual antes de trocar — evita que uma sessão
  // esquecida aberta em outro dispositivo consiga mudar a senha sem
  // confirmar que é realmente o dono da conta.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (reauthError) {
    return { error: "Senha atual incorreta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: "Não foi possível atualizar a senha." };
  }

  return { error: null };
}
