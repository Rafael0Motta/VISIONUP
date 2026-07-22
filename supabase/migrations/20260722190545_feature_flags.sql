-- Central do Sistema (superadmin): catálogo de feature flags globais.
-- Cada flag só pode RESTRINGIR algo que o papel já é capaz de fazer no
-- banco (RLS não muda) — o bloqueio real acontece dentro da própria server
-- action, não só escondendo o botão na UI.

create table public.feature_flags (
  key text primary key,
  label text not null,
  description text,
  category text not null default 'geral',
  enabled boolean not null default true,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create trigger trg_feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy "usuarios autenticados leem feature flags"
  on public.feature_flags for select
  using (true);

create policy "superadmin gerencia feature flags"
  on public.feature_flags for all
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

insert into public.feature_flags (key, label, description, category) values
  ('campanhas.personalizacao_perfil', 'Personalização de perfil do WhatsApp',
   'Permite escolher nome de exibição e foto de perfil ao criar uma campanha.', 'Campanhas'),
  ('campanhas.exclusao_rascunho_cliente', 'Cliente pode excluir rascunho de campanha',
   'Se desativado, só admin/superadmin conseguem excluir campanhas em rascunho.', 'Campanhas');
