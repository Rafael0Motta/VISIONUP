-- Nome "de fachada" que o admin pode definir pra própria organização, sem
-- mexer no nome real (usado internamente, gerenciado só pelo superadmin).
-- Clientes veem display_name quando definido; admin/superadmin sempre veem
-- o nome real.
alter table public.organizations add column display_name text;

create policy "admin atualiza o nome de exibicao da propria organizacao"
  on public.organizations for update
  using (
    public.has_role(auth.uid(), 'admin')
    and id = public.current_profile_org()
  )
  with check (
    public.has_role(auth.uid(), 'admin')
    and id = public.current_profile_org()
  );
