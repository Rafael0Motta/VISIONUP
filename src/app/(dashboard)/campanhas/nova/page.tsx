import { requireRole } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { WizardSteps } from "../wizard-steps";
import { NovaCampanhaForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovaCampanhaPage() {
  await requireRole(["admin", "cliente"]);
  const profileCustomizationEnabled = await isFeatureEnabled("campanhas.personalizacao_perfil");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">
          Siga os passos para criar uma nova campanha de WhatsApp.
        </p>
      </div>
      <WizardSteps current={1} />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Identificação da campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <NovaCampanhaForm profileCustomizationEnabled={profileCustomizationEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
