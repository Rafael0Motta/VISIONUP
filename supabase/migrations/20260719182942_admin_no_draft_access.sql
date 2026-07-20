-- LGPD: enquanto uma campanha está em rascunho, ela ainda não foi submetida
-- pelo cliente para revisão — o admin não deve enxergar nem gerenciar esse
-- conteúdo (nem a campanha em si, nem a lista de contatos/PII anexada a ela).
-- Superadmin continua com acesso irrestrito (papel de supervisão da plataforma).

drop policy "admin gerencia campanhas da propria organizacao" on public.campaigns;

create policy "admin gerencia campanhas nao rascunho da propria organizacao"
  on public.campaigns for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and status <> 'rascunho'
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and status <> 'rascunho'
  );

drop policy "admin gerencia listas da propria organizacao" on public.contact_lists;

create policy "admin gerencia listas de campanhas nao rascunho"
  on public.contact_lists for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and campaign_id in (select id from public.campaigns where status <> 'rascunho')
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and campaign_id in (select id from public.campaigns where status <> 'rascunho')
  );

drop policy "org le listas de contato" on storage.objects;

create policy "org le listas de contato"
  on storage.objects for select
  using (
    bucket_id = 'contact-lists'
    and (
      public.has_role(auth.uid(), 'superadmin')
      or (
        public.has_role(auth.uid(), 'cliente')
        and (storage.foldername(name))[1] = public.current_profile_org()::text
      )
      or (
        public.has_role(auth.uid(), 'admin')
        and (storage.foldername(name))[1] = public.current_profile_org()::text
        and exists (
          select 1
          from public.contact_lists cl
          join public.campaigns c on c.id = cl.campaign_id
          where cl.storage_path = name and c.status <> 'rascunho'
        )
      )
    )
  );
