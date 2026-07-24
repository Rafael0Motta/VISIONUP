export type CampaignPipelineStatus =
  | "template_aprovado"
  | "template_reprovado"
  | "aguardando_validacao_meta"
  | "disparo_iniciado"
  | "disparo_em_andamento"
  | "concluido"
  | "outro";

export const PIPELINE_STATUS_LABELS: Record<CampaignPipelineStatus, string> = {
  template_aprovado: "Template aprovado",
  template_reprovado: "Template reprovado",
  aguardando_validacao_meta: "Aguardando validação Meta",
  disparo_iniciado: "Disparo iniciado",
  disparo_em_andamento: "Disparo em andamento",
  concluido: "Concluído",
  outro: "Outro",
};

export const PIPELINE_STATUS_TONE: Record<
  CampaignPipelineStatus,
  "warning" | "success" | "destructive" | "neutral"
> = {
  template_aprovado: "success",
  template_reprovado: "destructive",
  aguardando_validacao_meta: "warning",
  disparo_iniciado: "warning",
  disparo_em_andamento: "warning",
  concluido: "success",
  outro: "neutral",
};

export const PIPELINE_STATUS_VALUES: CampaignPipelineStatus[] = [
  "template_aprovado",
  "template_reprovado",
  "aguardando_validacao_meta",
  "disparo_iniciado",
  "disparo_em_andamento",
  "concluido",
  "outro",
];
