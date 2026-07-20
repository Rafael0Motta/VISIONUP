export function extractVariableIndexes(bodyText: string): number[] {
  const matches = bodyText.matchAll(/\{\{(\d+)\}\}/g);
  const indexes = new Set<number>();
  for (const match of matches) {
    indexes.add(Number(match[1]));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

export const BUTTON_TYPES = ["quick_reply", "url", "phone_number"] as const;
export type ButtonType = (typeof BUTTON_TYPES)[number];

export const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  quick_reply: "Resposta Rápida",
  url: "Link",
  phone_number: "Telefone",
};

export type TemplateVariable = { index: number; example: string };
export type TemplateButton = { type: ButtonType; label: string; value?: string };

export const MAX_BUTTONS = 3;

export const DEFAULT_OPT_OUT_FOOTER = 'Digite "sair" para não receber mais.';

// Limites reais de mídia da WhatsApp Business API.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE_BYTES = 16 * 1024 * 1024; // 16MB

export function renderBodyText(bodyText: string, values: Record<number, string>): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (match, index) => {
    const value = values[Number(index)];
    return value && value.trim() ? value : match;
  });
}

export function buildVariables(bodyText: string, formData: FormData): TemplateVariable[] {
  return extractVariableIndexes(bodyText).map((index) => ({
    index,
    example: String(formData.get(`variable_example_${index}`) ?? "").trim(),
  }));
}

/**
 * Toda variável {{N}} usada no corpo da mensagem precisa de um exemplo
 * preenchido — sem isso o disparo real sairia com o placeholder literal
 * (ex: "{{1}}") em vez do valor esperado. Retorna null quando tudo certo,
 * ou uma mensagem de erro pronta pra exibir no formulário.
 */
export function validateVariablesFilled(variables: TemplateVariable[]): string | null {
  const missing = variables.filter((v) => !v.example).map((v) => v.index);
  if (missing.length === 0) return null;
  return `Preencha o exemplo da${missing.length > 1 ? "s" : ""} variável${missing.length > 1 ? "eis" : ""} ${missing
    .map((i) => `{{${i}}}`)
    .join(", ")} antes de salvar.`;
}

export function buildButtons(formData: FormData): TemplateButton[] {
  const buttons: TemplateButton[] = [];
  for (let slot = 1; slot <= MAX_BUTTONS; slot++) {
    const type = String(formData.get(`button_${slot}_type`) ?? "none");
    if (!BUTTON_TYPES.includes(type as ButtonType)) continue;

    const label = String(formData.get(`button_${slot}_label`) ?? "").trim();
    if (!label) continue;

    const value = String(formData.get(`button_${slot}_value`) ?? "").trim();
    buttons.push({
      type: type as ButtonType,
      label,
      ...(type !== "quick_reply" ? { value } : {}),
    });
  }
  return buttons;
}
