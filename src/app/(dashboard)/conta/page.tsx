import { requireAuth } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContaPage() {
  const profile = await requireAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
