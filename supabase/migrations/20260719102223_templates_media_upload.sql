-- Upload real de imagem/vídeo pro cabeçalho do template (antes só existia
-- o campo media_type, sem arquivo de verdade por trás).
alter table public.templates add column media_path text;

insert into storage.buckets (id, name, public)
values ('template-media', 'template-media', false)
on conflict (id) do nothing;

create policy "org le midia de template"
  on storage.objects for select
  using (
    bucket_id = 'template-media'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );

create policy "org envia midia de template"
  on storage.objects for insert
  with check (
    bucket_id = 'template-media'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'cliente'))
    and (storage.foldername(name))[1] = public.current_profile_org()::text
  );

create policy "org remove midia de template"
  on storage.objects for delete
  using (
    bucket_id = 'template-media'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );
