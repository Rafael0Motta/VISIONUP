-- Corrige dois problemas deixados pela migration 20260719182942
-- (admin_no_draft_access), aplicada para a exigência de LGPD "admin não
-- acessa rascunhos de cliente":
--
-- 1. A policy do admin bloqueia QUALQUER linha em rascunho, inclusive as
--    criadas pelo próprio admin — quebrando o fluxo normal de criação de
--    campanha quando quem cria é um admin (INSERT/UPDATE em campaigns e
--    contact_lists falha por violar o WITH CHECK "status <> 'rascunho'").
--    O requisito original era só esconder rascunhos de CLIENTE, então agora
--    abrimos uma exceção "ou created_by = auth.uid()" — o rascunho de
--    outro usuário (cliente) continua bloqueado.
--
-- 2. Cliente não tinha NENHUMA policy de DELETE em campaigns — necessário
--    para a função de "excluir rascunho" no wizard (feature nova).

-- --- campaigns -------------------------------------------------------------

drop policy "admin gerencia campanhas nao rascunho da propria organizacao" on public.campaigns;

create policy "admin gerencia campanhas nao rascunho ou proprias"
  on public.campaigns for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and (status <> 'rascunho' or created_by = auth.uid())
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and (status <> 'rascunho' or created_by = auth.uid())
  );

create policy "cliente exclui as proprias campanhas em rascunho"
  on public.campaigns for delete
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and organization_id = public.current_profile_org()
    and status = 'rascunho'
  );

-- --- contact_lists (mesmo furo, mesma correção) -----------------------------

drop policy "admin gerencia listas de campanhas nao rascunho" on public.contact_lists;

create policy "admin gerencia listas de campanhas nao rascunho ou proprias"
  on public.contact_lists for all
  using (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and campaign_id in (
      select id from public.campaigns
      where status <> 'rascunho' or created_by = auth.uid()
    )
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and organization_id = public.current_profile_org()
    and campaign_id in (
      select id from public.campaigns
      where status <> 'rascunho' or created_by = auth.uid()
    )
  );

-- --- storage.objects (bucket contact-lists): mesma exceção para o branch admin

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
          where cl.storage_path = name
            and (c.status <> 'rascunho' or c.created_by = auth.uid())
        )
      )
    )
  );
