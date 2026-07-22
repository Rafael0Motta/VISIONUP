-- Bug real na policy "org le listas de contato" (existia desde
-- 20260719182942_admin_no_draft_access.sql, replicado sem querer em
-- 20260721140500): dentro do EXISTS, a subquery faz
-- "join public.campaigns c" — e campaigns também tem uma coluna "name"
-- (nome da campanha). A referência solta "name" em
-- "where cl.storage_path = name" acaba resolvendo pra "c.name" (sombreada
-- pelo escopo mais interno do join) em vez de "storage.objects.name" (o
-- caminho do arquivo, que é o que a policy realmente precisa comparar).
-- Resultado: a condição nunca bate de verdade — confirmado com um teste
-- real (admin não conseguia ler o próprio arquivo de rascunho no storage,
-- só recebia "Object not found").
--
-- Correção: qualificar explicitamente como "storage.objects.name" pra não
-- deixar a referência ser capturada pelo escopo do join.

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
          where cl.storage_path = storage.objects.name
            and (c.status <> 'rascunho' or c.created_by = auth.uid())
        )
      )
    )
  );
