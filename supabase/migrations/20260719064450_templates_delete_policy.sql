-- Cliente pode excluir os próprios templates (nunca os marcados como padrão
-- da organização — is_default só é definido/alterado por admin/superadmin).
create policy "cliente exclui os proprios templates nao padrao"
  on public.templates for delete
  using (
    public.has_role(auth.uid(), 'cliente')
    and created_by = auth.uid()
    and is_default = false
  );
