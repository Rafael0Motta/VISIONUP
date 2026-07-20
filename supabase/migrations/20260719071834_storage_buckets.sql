-- Buckets privados usados pelo wizard de campanha.
-- Convenção de path: {organization_id}/{campaign_id}/arquivo — permite RLS
-- por organização via storage.foldername(name).
insert into storage.buckets (id, name, public)
values
  ('campaign-profile-photos', 'campaign-profile-photos', false),
  ('contact-lists', 'contact-lists', false)
on conflict (id) do nothing;

create policy "org le fotos de perfil de campanha"
  on storage.objects for select
  using (
    bucket_id = 'campaign-profile-photos'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );

create policy "org envia fotos de perfil de campanha"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign-profile-photos'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'cliente'))
    and (storage.foldername(name))[1] = public.current_profile_org()::text
  );

create policy "org remove fotos de perfil de campanha"
  on storage.objects for delete
  using (
    bucket_id = 'campaign-profile-photos'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );

create policy "org le listas de contato"
  on storage.objects for select
  using (
    bucket_id = 'contact-lists'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );

create policy "org envia listas de contato"
  on storage.objects for insert
  with check (
    bucket_id = 'contact-lists'
    and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'cliente'))
    and (storage.foldername(name))[1] = public.current_profile_org()::text
  );

create policy "org remove listas de contato"
  on storage.objects for delete
  using (
    bucket_id = 'contact-lists'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (storage.foldername(name))[1] = public.current_profile_org()::text
    )
  );
