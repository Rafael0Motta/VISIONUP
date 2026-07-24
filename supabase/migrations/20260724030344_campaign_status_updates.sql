-- Timeline de status/comentários por campanha (pós-liberação), só superadmin
-- escreve; superadmin/admin/cliente da campanha leem. Imutável, mesmo padrão
-- de audit_log (corrigir um engano é adicionar entrada nova).

create type public.campaign_pipeline_status as enum (
  'template_aprovado',
  'template_reprovado',
  'aguardando_validacao_meta',
  'disparo_iniciado',
  'disparo_em_andamento',
  'concluido',
  'outro'
);

create table public.campaign_status_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  status public.campaign_pipeline_status,
  comment text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint campaign_status_updates_has_content check (status is not null or comment is not null)
);

create index idx_campaign_status_updates_campaign_id on public.campaign_status_updates (campaign_id);

alter table public.campaign_status_updates enable row level security;

create policy "superadmin gerencia status updates"
  on public.campaign_status_updates for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin le status updates da propria organizacao"
  on public.campaign_status_updates for select
  using (
    public.has_role(auth.uid(), 'admin')
    and exists (
      select 1 from public.campaigns c
      where c.id = campaign_status_updates.campaign_id
        and c.organization_id = public.current_profile_org()
    )
  );

create policy "cliente le status updates das proprias campanhas"
  on public.campaign_status_updates for select
  using (
    public.has_role(auth.uid(), 'cliente')
    and exists (
      select 1 from public.campaigns c
      where c.id = campaign_status_updates.campaign_id
        and c.created_by = auth.uid()
    )
  );

-- Exclusão de campanha pelo cliente passa a valer também pra rejeitadas
-- (antes só rascunho). A policy de admin já é "for all" sem restrição de
-- status, então já cobre rejeitada.
drop policy "cliente exclui as proprias campanhas em rascunho" on public.campaigns;

create policy "cliente exclui as proprias campanhas em rascunho ou rejeitadas"
  on public.campaigns for delete
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and organization_id = public.current_profile_org()
    and status in ('rascunho', 'rejeitado')
  );

update public.feature_flags
  set label = 'Cliente pode excluir campanhas em rascunho ou rejeitadas',
      description = 'Se desativado, só admin/superadmin conseguem excluir campanhas em rascunho ou rejeitadas.'
  where key = 'campanhas.exclusao_rascunho_cliente';
