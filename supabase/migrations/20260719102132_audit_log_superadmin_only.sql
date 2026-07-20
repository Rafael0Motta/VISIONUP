-- Auditoria fica visível só pro superadmin — admin não deve mais ler
-- audit_log nem da própria organização.
drop policy if exists "admin le audit_log da propria organizacao" on public.audit_log;
