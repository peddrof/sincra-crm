-- Endurece as funções auxiliares (avisos do Security Advisor do Supabase).

-- 1. search_path fixo no gatilho de updated_at.
alter function public.set_updated_at() set search_path = '';

-- 2. is_active_member sai do schema exposto pela API (public) para um schema privado.
--    As políticas de RLS referenciam a função pelo OID, então continuam valendo.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_active_member() set schema private;
alter function private.is_active_member() set search_path = '';

create or replace function private.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

revoke execute on function private.is_active_member() from public, anon;
grant execute on function private.is_active_member() to authenticated;
