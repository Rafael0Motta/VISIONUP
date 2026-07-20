-- ============================================================================
-- VisionUp — schema inicial (Fase 1)
-- Plataforma de disparos de WhatsApp — ponte de coleta e governança.
-- O n8n executa toda a automação/disparo real; este banco só guarda estado,
-- emite webhooks de saída e recebe callbacks autenticados por token de serviço.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensões
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tipos (enums)
-- ----------------------------------------------------------------------------
create type public.app_role as enum ('superadmin', 'admin', 'cliente');

create type public.template_media_type as enum ('none', 'image', 'video', 'text');

create type public.campaign_status as enum (
  'rascunho',
  'aguardando_aprovacao',
  'aprovado',
  'rejeitado',
  'liberado',
  'enviando',
  'concluido',
  'falha'
);

create type public.contact_list_status as enum ('pending', 'validating', 'validated', 'failed');

create type public.report_origin as enum ('manual', 'automatico');

create type public.webhook_delivery_status as enum ('pendente', 'entregue', 'falhou', 'retentando');

-- ----------------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Tabela: organizations
-- ============================================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: profiles
-- Roles vivem aqui, nunca em auth.users.raw_app_meta_data.
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  organization_id uuid references public.organizations (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_org_required_unless_superadmin check (
    role = 'superadmin' or organization_id is not null
  )
);

create index idx_profiles_organization_id on public.profiles (organization_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Funções auxiliares SECURITY DEFINER (evitam recursão de RLS em profiles)
-- ----------------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = _role
  );
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- Tabela: message_variations
-- Catálogo gerenciável (superadmin) do recurso "Variar Texto".
-- ============================================================================
create table public.message_variations (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_message_variations_updated_at
  before update on public.message_variations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: templates
-- ============================================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  media_type public.template_media_type not null default 'none',
  language text not null default 'pt_BR',
  body_text text not null check (char_length(body_text) <= 1024),
  variables jsonb not null default '[]'::jsonb,
  footer_text text,
  buttons jsonb not null default '[]'::jsonb check (jsonb_array_length(buttons) <= 3),
  use_variations boolean not null default false,
  is_default boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index idx_templates_organization_id on public.templates (organization_id);
create index idx_templates_is_default on public.templates (organization_id, is_default) where is_default = true;

create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: campaigns
-- (sem campos de pagamento — removido do MVP)
-- ============================================================================
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  name text not null,
  status public.campaign_status not null default 'rascunho',
  template_id uuid references public.templates (id),
  contact_list_id uuid, -- FK adicionada após criação de contact_lists (referência cruzada)
  profile_customization jsonb not null default '{"enabled": false}'::jsonb,
  scheduled_at timestamptz,
  rejection_reason text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  released_by uuid references public.profiles (id),
  released_at timestamptz,
  contact_list_signed_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaigns_organization_id on public.campaigns (organization_id);
create index idx_campaigns_created_by on public.campaigns (created_by);
create index idx_campaigns_status on public.campaigns (status);

create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: contact_lists
-- ============================================================================
create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  file_name text,
  storage_path text,
  total_contacts integer not null default 0,
  valid_contacts integer not null default 0,
  invalid_contacts integer not null default 0,
  status public.contact_list_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contact_lists_campaign_id on public.contact_lists (campaign_id);
create index idx_contact_lists_organization_id on public.contact_lists (organization_id);

create trigger trg_contact_lists_updated_at
  before update on public.contact_lists
  for each row execute function public.set_updated_at();

alter table public.campaigns
  add constraint campaigns_contact_list_id_fkey
  foreign key (contact_list_id) references public.contact_lists (id) on delete set null;

-- ============================================================================
-- Tabela: contacts
-- ============================================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  contact_list_id uuid not null references public.contact_lists (id) on delete cascade,
  phone text not null,
  name text,
  variables jsonb not null default '{}'::jsonb,
  is_valid boolean not null default true,
  validation_error text,
  created_at timestamptz not null default now()
);

create index idx_contacts_contact_list_id on public.contacts (contact_list_id);

-- ============================================================================
-- Tabela: campaign_reports
-- ============================================================================
create table public.campaign_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  origem public.report_origin not null,
  enviados integer not null default 0,
  entregues integer not null default 0,
  lidos integer not null default 0,
  falhados integer not null default 0,
  custo numeric(12, 2),
  raw_file_path text,
  importado_por uuid references public.profiles (id),
  importado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_campaign_reports_campaign_id on public.campaign_reports (campaign_id);

-- ============================================================================
-- Tabela: webhook_configs (saída, app → n8n) — só superadmin gerencia
-- ============================================================================
create table public.webhook_configs (
  id uuid primary key default gen_random_uuid(),
  event text not null unique,
  target_url text not null,
  is_active boolean not null default true,
  hmac_secret text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_webhook_configs_updated_at
  before update on public.webhook_configs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: webhook_deliveries (log/retry) — escrita só via service role
-- ============================================================================
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_config_id uuid references public.webhook_configs (id) on delete set null,
  event text not null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  payload jsonb not null,
  target_url text not null,
  status public.webhook_delivery_status not null default 'pendente',
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  response_status integer,
  response_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_webhook_deliveries_status on public.webhook_deliveries (status);
create index idx_webhook_deliveries_campaign_id on public.webhook_deliveries (campaign_id);

create trigger trg_webhook_deliveries_updated_at
  before update on public.webhook_deliveries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabela: audit_log — trilha imutável, escrita só via service role
-- ============================================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  actor_role public.app_role,
  action text not null,
  organization_id uuid references public.organizations (id),
  campaign_id uuid references public.campaigns (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_organization_id on public.audit_log (organization_id);
create index idx_audit_log_campaign_id on public.audit_log (campaign_id);

-- ============================================================================
-- RLS — ativação
-- ============================================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.message_variations enable row level security;
alter table public.templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contacts enable row level security;
alter table public.campaign_reports enable row level security;
alter table public.webhook_configs enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.audit_log enable row level security;

-- ----------------------------------------------------------------------------
-- Policies: organizations
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia organizacoes"
  on public.organizations for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "membros veem a propria organizacao"
  on public.organizations for select
  using (id = public.current_profile_org());

-- ----------------------------------------------------------------------------
-- Policies: profiles
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia perfis"
  on public.profiles for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin ve perfis da propria organizacao"
  on public.profiles for select
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

create policy "admin gerencia clientes da propria organizacao"
  on public.profiles for insert
  with check (
    public.has_role(auth.uid(), 'admin')
    and role = 'cliente'
    and organization_id = public.current_profile_org()
  );

create policy "admin atualiza clientes da propria organizacao"
  on public.profiles for update
  using (
    public.has_role(auth.uid(), 'admin')
    and role = 'cliente'
    and organization_id = public.current_profile_org()
  )
  with check (
    role = 'cliente'
    and organization_id = public.current_profile_org()
  );

create policy "admin remove clientes da propria organizacao"
  on public.profiles for delete
  using (
    public.has_role(auth.uid(), 'admin')
    and role = 'cliente'
    and organization_id = public.current_profile_org()
  );

create policy "usuario ve o proprio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "usuario atualiza o proprio perfil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_profile_role());

-- ----------------------------------------------------------------------------
-- Policies: message_variations (catálogo global do "Variar Texto")
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia catalogo de variacoes"
  on public.message_variations for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "usuarios autenticados leem variacoes ativas"
  on public.message_variations for select
  using (is_active = true or public.has_role(auth.uid(), 'superadmin'));

-- ----------------------------------------------------------------------------
-- Policies: templates
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia todos os templates"
  on public.templates for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin gerencia templates da propria organizacao"
  on public.templates for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

create policy "cliente ve templates da propria organizacao"
  on public.templates for select
  using (
    public.has_role(auth.uid(), 'cliente')
    and organization_id = public.current_profile_org()
  );

create policy "cliente cria templates proprios sem marcar padrao"
  on public.templates for insert
  with check (
    public.has_role(auth.uid(), 'cliente')
    and organization_id = public.current_profile_org()
    and created_by = auth.uid()
    and is_default = false
  );

create policy "cliente edita os proprios templates sem marcar padrao"
  on public.templates for update
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and organization_id = public.current_profile_org()
  )
  with check (
    created_by = auth.uid()
    and organization_id = public.current_profile_org()
    and is_default = false
  );

-- ----------------------------------------------------------------------------
-- Policies: campaigns
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia todas as campanhas"
  on public.campaigns for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin gerencia campanhas da propria organizacao"
  on public.campaigns for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

create policy "cliente ve as proprias campanhas"
  on public.campaigns for select
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
  );

create policy "cliente cria as proprias campanhas"
  on public.campaigns for insert
  with check (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and organization_id = public.current_profile_org()
    and status = 'rascunho'
  );

create policy "cliente edita campanhas em rascunho ou rejeitadas"
  on public.campaigns for update
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and status in ('rascunho', 'rejeitado', 'aguardando_aprovacao')
  )
  with check (
    created_by = auth.uid()
    and organization_id = public.current_profile_org()
  );

-- ----------------------------------------------------------------------------
-- Policies: contact_lists / contacts
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia todas as listas"
  on public.contact_lists for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin ve listas da propria organizacao"
  on public.contact_lists for select
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

create policy "cliente gerencia listas das proprias campanhas"
  on public.contact_lists for all
  using (
    public.has_role(auth.uid(), 'cliente')
    and organization_id = public.current_profile_org()
    and campaign_id in (select id from public.campaigns where created_by = auth.uid())
  )
  with check (
    public.has_role(auth.uid(), 'cliente')
    and organization_id = public.current_profile_org()
    and campaign_id in (select id from public.campaigns where created_by = auth.uid())
  );

create policy "superadmin gerencia todos os contatos"
  on public.contacts for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin ve contatos da propria organizacao"
  on public.contacts for select
  using (
    public.has_role(auth.uid(), 'admin')
    and contact_list_id in (
      select id from public.contact_lists where organization_id = public.current_profile_org()
    )
  );

create policy "cliente gerencia contatos das proprias listas"
  on public.contacts for all
  using (
    public.has_role(auth.uid(), 'cliente')
    and contact_list_id in (
      select cl.id from public.contact_lists cl
      join public.campaigns c on c.id = cl.campaign_id
      where c.created_by = auth.uid()
    )
  )
  with check (
    public.has_role(auth.uid(), 'cliente')
    and contact_list_id in (
      select cl.id from public.contact_lists cl
      join public.campaigns c on c.id = cl.campaign_id
      where c.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Policies: campaign_reports
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia todos os relatorios"
  on public.campaign_reports for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

create policy "admin gerencia relatorios da propria organizacao"
  on public.campaign_reports for all
  using (
    public.has_role(auth.uid(), 'admin')
    and campaign_id in (
      select id from public.campaigns where organization_id = public.current_profile_org()
    )
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and campaign_id in (
      select id from public.campaigns where organization_id = public.current_profile_org()
    )
  );

create policy "cliente ve relatorios das proprias campanhas"
  on public.campaign_reports for select
  using (
    public.has_role(auth.uid(), 'cliente')
    and campaign_id in (select id from public.campaigns where created_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Policies: webhook_configs — só superadmin, nunca exposto a admin/cliente
-- ----------------------------------------------------------------------------
create policy "superadmin gerencia webhook_configs"
  on public.webhook_configs for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

-- ----------------------------------------------------------------------------
-- Policies: webhook_deliveries — leitura só superadmin; escrita via service role
-- ----------------------------------------------------------------------------
create policy "superadmin le webhook_deliveries"
  on public.webhook_deliveries for select
  using (public.has_role(auth.uid(), 'superadmin'));

-- ----------------------------------------------------------------------------
-- Policies: audit_log — imutável; leitura por superadmin (tudo) e admin (própria org)
-- ----------------------------------------------------------------------------
create policy "superadmin le audit_log"
  on public.audit_log for select
  using (public.has_role(auth.uid(), 'superadmin'));

create policy "admin le audit_log da propria organizacao"
  on public.audit_log for select
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

-- ============================================================================
-- Seed: catálogo inicial do "Variar Texto" (12 variações fixas)
-- ============================================================================
insert into public.message_variations (content) values
  ($$Opa {{1}}!

Temos novidade: {{2}}.

{{3}}

Para {{4}}, use o botão abaixo 👇$$),
  ($$Ei {{1}}!

Novidade: {{2}}.

{{3}}

Para {{4}}, aperte o botão abaixo 👇$$),
  ($$Oie {{1}}!

Tenho uma novidade: {{2}}.

{{3}}

Para {{4}}, toque no botão abaixo 👇$$),
  ($$Olá {{1}}!

Temos novidade: {{2}}.

{{3}}

Para {{4}}, aperte o botão abaixo 👇$$),
  ($$Oi {{1}}!

Temos uma novidade: {{2}}.

{{3}}

Para {{4}}, clique no botão abaixo 👇$$),
  ($$Opa {{1}}!

Temos uma novidade: {{2}}.

{{3}}

Para {{4}}, use o botão abaixo 👇$$),
  ($$Eai {{1}}!

Temos novidade: {{2}}.

{{3}}

Para {{4}}, use o botão abaixo 👇$$),
  ($$Fala {{1}}!

Tenho uma novidade: {{2}}.

{{3}}

Para {{4}}, confira no botão abaixo 👇$$),
  ($$E aí {{1}}!

Chegou novidade: {{2}}.

{{3}}

Para {{4}}, acesse o botão abaixo 👇$$),
  ($$Salve {{1}}!

Separei uma novidade: {{2}}.

{{3}}

Para {{4}}, veja o botão abaixo 👇$$),
  ($$Oii {{1}}!

Preparei uma novidade: {{2}}.

{{3}}

Para {{4}}, confira o botão abaixo 👇$$),
  ($$Alô {{1}}!

Tenho um recado: {{2}}.

{{3}}

Para {{4}}, dá uma olhada no botão abaixo 👇$$);
