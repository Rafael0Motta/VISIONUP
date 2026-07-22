insert into public.feature_flags (key, label, description, category) values
  ('clientes.admin_pode_excluir', 'Admin pode excluir clientes',
   'Se desativado, só superadmin consegue excluir clientes (admin continua criando/editando).', 'Clientes'),
  ('configuracoes.admin_pode_editar_nome_exibicao', 'Admin pode editar o nome de exibição da organização',
   'Se desativado, o campo fica somente leitura para o admin.', 'Organizações');
