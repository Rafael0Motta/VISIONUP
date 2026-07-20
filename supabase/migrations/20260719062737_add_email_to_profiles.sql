-- Denormaliza o e-mail em profiles: auth.users não é consultável pelo client
-- autenticado comum (anon key + RLS), e listagens de cliente precisam exibir
-- e-mail sem chamada extra à Admin API a cada render.
alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

alter table public.profiles
  alter column email set not null,
  add constraint profiles_email_unique unique (email);
