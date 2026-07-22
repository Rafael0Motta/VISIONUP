-- Permite ao admin/cliente editar manualmente o texto da mensagem no wizard
-- de campanha (foge do catálogo, precisa de aviso e revisão da equipe).
alter table public.templates
  add column text_overridden boolean not null default false;

insert into public.feature_flags (key, label, description, category) values
  ('campanhas.editar_texto_livre', 'Liberar edição livre do texto da mensagem',
   'Permite ao admin/cliente editar manualmente o texto do template ao criar uma campanha — a mensagem foge do padrão aprovado do catálogo, pode não ser aprovada e pode ser ajustada pela equipe técnica antes do envio.',
   'Campanhas');
