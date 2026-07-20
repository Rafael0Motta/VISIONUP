-- Mesmo padrão de contact_list_signed_url / profile_photo_signed_url: guarda
-- o link assinado da mídia do template (imagem/vídeo) gerado na liberação,
-- pra referência/auditoria (o n8n recebe esse mesmo link no payload do
-- webhook campaign_released).
alter table public.campaigns add column template_media_signed_url text;
