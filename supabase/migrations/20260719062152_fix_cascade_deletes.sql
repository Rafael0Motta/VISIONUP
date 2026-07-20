-- ============================================================================
-- Corrige regras ON DELETE ausentes na migration inicial.
-- Sem isso, excluir um cliente (profiles) com templates/campanhas/listas
-- associados falha por violação de FK — quebra o requisito de exclusão em
-- cascata da Fase 3 (PRD 3.4).
-- ============================================================================

-- Conteúdo do cliente: some junto com o profile
alter table public.templates
  drop constraint templates_created_by_fkey,
  add constraint templates_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete cascade;

alter table public.campaigns
  drop constraint campaigns_created_by_fkey,
  add constraint campaigns_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete cascade;

alter table public.contact_lists
  drop constraint contact_lists_created_by_fkey,
  add constraint contact_lists_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

-- Referências de "quem aprovou/liberou/importou": preserva o registro, perde o vínculo
alter table public.campaigns
  drop constraint campaigns_approved_by_fkey,
  add constraint campaigns_approved_by_fkey
    foreign key (approved_by) references public.profiles (id) on delete set null;

alter table public.campaigns
  drop constraint campaigns_released_by_fkey,
  add constraint campaigns_released_by_fkey
    foreign key (released_by) references public.profiles (id) on delete set null;

alter table public.campaign_reports
  drop constraint campaign_reports_importado_por_fkey,
  add constraint campaign_reports_importado_por_fkey
    foreign key (importado_por) references public.profiles (id) on delete set null;

alter table public.message_variations
  drop constraint message_variations_created_by_fkey,
  add constraint message_variations_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.webhook_configs
  drop constraint webhook_configs_created_by_fkey,
  add constraint webhook_configs_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

-- Campanha pode perder o vínculo com um template removido (ex: template do
-- criador removido em cascata) sem que a própria campanha seja apagada
alter table public.campaigns
  drop constraint campaigns_template_id_fkey,
  add constraint campaigns_template_id_fkey
    foreign key (template_id) references public.templates (id) on delete set null;

-- audit_log: entradas do próprio cliente removido somem junto (PRD 3.4);
-- entradas de outros atores que apenas referenciam a organização/campanha
-- removida ficam órfãs (campo vira null) em vez de bloquear a exclusão
alter table public.audit_log
  drop constraint audit_log_actor_id_fkey,
  add constraint audit_log_actor_id_fkey
    foreign key (actor_id) references public.profiles (id) on delete cascade;

alter table public.audit_log
  drop constraint audit_log_organization_id_fkey,
  add constraint audit_log_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete set null;

alter table public.audit_log
  drop constraint audit_log_campaign_id_fkey,
  add constraint audit_log_campaign_id_fkey
    foreign key (campaign_id) references public.campaigns (id) on delete set null;
