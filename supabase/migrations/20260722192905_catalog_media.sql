-- Catálogo de variações ganha mídia/rodapé/botões opcionais, pra funcionar
-- como um "template pré-definido" completo, não só texto.
alter table public.message_variations
  add column media_type public.template_media_type not null default 'none',
  add column media_path text,
  add column footer_text text,
  add column buttons jsonb not null default '[]'::jsonb
    check (jsonb_array_length(buttons) <= 3);

-- Bucket separado do `template-media` porque a mídia do catálogo é global
-- (sem organização) — a RLS de `template-media` é por pasta-de-organização,
-- não serve aqui.
insert into storage.buckets (id, name, public)
values ('catalog-media', 'catalog-media', false)
on conflict (id) do nothing;

create policy "usuarios autenticados leem midia do catalogo"
  on storage.objects for select
  using (bucket_id = 'catalog-media' and auth.uid() is not null);

create policy "superadmin gerencia midia do catalogo"
  on storage.objects for all
  using (bucket_id = 'catalog-media' and public.has_role(auth.uid(), 'superadmin'))
  with check (bucket_id = 'catalog-media' and public.has_role(auth.uid(), 'superadmin'));
