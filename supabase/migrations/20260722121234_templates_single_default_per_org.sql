-- Passa a valer um único template padrão por organização — o wizard de
-- campanha do cliente agora só preenche variáveis desse template padrão,
-- então precisa haver exatamente um pra não virar ambíguo.
--
-- Defensivo: confirmado ao vivo que hoje nenhuma organização tem mais de um
-- padrão, mas desmarca duplicados (mantendo o mais recente) antes de criar
-- o índice único, pra migration nunca falhar por causa de dado antigo.
update public.templates t
set is_default = false
where is_default = true
  and updated_at < (
    select max(t2.updated_at) from public.templates t2
    where t2.organization_id = t.organization_id and t2.is_default = true
  );

create unique index idx_templates_one_default_per_org
  on public.templates (organization_id)
  where is_default = true;
