-- Até agora "raw_file_path" em campaign_reports guardava só o nome do
-- arquivo (texto solto) — o upload manual nunca salvava o arquivo de
-- verdade no Storage, só extraía os números e descartava. Cliente precisa
-- poder baixar essa planilha depois, então agora o arquivo é enviado pro
-- bucket novo "campaign-reports" e raw_file_path passa a guardar o path
-- real (como o nome da coluna sempre sugeriu).

insert into storage.buckets (id, name, public)
values ('campaign-reports', 'campaign-reports', false)
on conflict (id) do nothing;

-- Superadmin é quem faz upload/gerencia (só ele importa relatório manual).
create policy "superadmin gerencia relatorios no storage"
  on storage.objects for all
  using (bucket_id = 'campaign-reports' and public.has_role(auth.uid(), 'superadmin'))
  with check (bucket_id = 'campaign-reports' and public.has_role(auth.uid(), 'superadmin'));

-- Cliente só lê o relatório da própria campanha — sem acesso de admin de
-- propósito (mesma decisão de restringir /relatorios a superadmin).
-- Referência qualificada como storage.objects.name pra não repetir a
-- ambiguidade de coluna já corrigida em 20260721211535.
create policy "cliente le o proprio relatorio no storage"
  on storage.objects for select
  using (
    bucket_id = 'campaign-reports'
    and public.has_role(auth.uid(), 'cliente')
    and exists (
      select 1
      from public.campaign_reports cr
      join public.campaigns c on c.id = cr.campaign_id
      where cr.raw_file_path = storage.objects.name
        and c.created_by = auth.uid()
    )
  );
