export type CampaignStatus =
  | "rascunho"
  | "aguardando_aprovacao"
  | "aprovado"
  | "rejeitado"
  | "liberado"
  | "enviando"
  | "concluido"
  | "falha";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  liberado: "Liberado",
  enviando: "Enviando",
  concluido: "Concluído",
  falha: "Falha",
};

export const CAMPAIGN_STATUS_TONE: Record<
  CampaignStatus,
  "warning" | "success" | "destructive" | "neutral"
> = {
  rascunho: "neutral",
  aguardando_aprovacao: "warning",
  aprovado: "success",
  rejeitado: "destructive",
  liberado: "success",
  enviando: "warning",
  concluido: "success",
  falha: "destructive",
};

export function resumeStepPath(campaign: {
  id: string;
  status: string;
  template_id: string | null;
  contact_list_id: string | null;
}): string {
  // rejeitada: manda pro passo de mensagem pra revisar tudo de novo até reenviar
  if (campaign.status === "rejeitado") return `/campanhas/${campaign.id}/mensagem`;
  if (!campaign.template_id) return `/campanhas/${campaign.id}/mensagem`;
  if (!campaign.contact_list_id) return `/campanhas/${campaign.id}/contatos`;
  return `/campanhas/${campaign.id}/confirmacao`;
}
