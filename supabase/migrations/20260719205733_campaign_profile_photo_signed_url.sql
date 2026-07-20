-- Mesmo padrão de contact_list_signed_url: guarda o link assinado gerado na
-- liberação da campanha, pra referência/auditoria (o n8n recebe esse mesmo
-- link no payload do webhook campaign_released).
alter table public.campaigns add column profile_photo_signed_url text;
