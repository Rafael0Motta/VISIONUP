-- Admin também pode criar campanhas (matriz de permissões do PRD), então
-- precisa de CRUD completo em contact_lists/contacts da própria organização,
-- não só leitura como a Fase 1 previu.
drop policy "admin ve listas da propria organizacao" on public.contact_lists;

create policy "admin gerencia listas da propria organizacao"
  on public.contact_lists for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
  );

drop policy "admin ve contatos da propria organizacao" on public.contacts;

create policy "admin gerencia contatos da propria organizacao"
  on public.contacts for all
  using (
    public.has_role(auth.uid(), 'admin')
    and contact_list_id in (
      select id from public.contact_lists where organization_id = public.current_profile_org()
    )
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and contact_list_id in (
      select id from public.contact_lists where organization_id = public.current_profile_org()
    )
  );
