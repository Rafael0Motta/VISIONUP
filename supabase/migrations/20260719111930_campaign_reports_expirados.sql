-- Separa "expirado" (Infobip: Expired — mensagem não entregue dentro da
-- janela de tempo) de "falhado" (Undeliverable — não pôde ser entregue),
-- antes tudo caía junto em falhados.
alter table public.campaign_reports add column expirados integer not null default 0;
