-- Módulo 2 (organizações e pessoas): autoria, validação de CNPJ e eventos automáticos no feed.

-- Autoria e responsável preenchidos pelo banco a partir da sessão.
alter table public.organizations alter column created_by set default auth.uid();
alter table public.organizations alter column owner_id set default auth.uid();
alter table public.people alter column created_by set default auth.uid();

-- CNPJ guardado sem pontuação. Desde jul/2026 a Receita emite CNPJ alfanumérico:
-- 12 posições de A-Z/0-9 + 2 dígitos verificadores numéricos. Os dígitos são validados na aplicação.
alter table public.organizations
  add constraint organizations_cnpj_formato check (cnpj is null or cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');
alter table public.organizations
  add constraint organizations_uf_formato check (state is null or state ~ '^[A-Z]{2}$');

create index if not exists people_organization_idx on public.people (organization_id);
create index if not exists organizations_owner_idx on public.organizations (owner_id);

-- Eventos automáticos: toda criação ou alteração de organização e pessoa vai para activity_events.
-- Roda com os privilégios de quem fez a alteração (security invoker), então a RLS continua valendo.
create or replace function private.registrar_evento_crm() returns trigger
language plpgsql set search_path = '' as $$
declare
  ator uuid := auth.uid();
  nome_ator text;
  acao text := case tg_op when 'INSERT' then 'adicionou' else 'atualizou' end;
  sufixo text := case tg_op when 'INSERT' then 'created' else 'updated' end;
  resumo text;
  org_id uuid;
  tipo text;
begin
  -- Alteração que só mexeu em updated_at não vira evento.
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return new;
  end if;

  select coalesce(p.nickname, split_part(p.full_name, ' ', 1)) into nome_ator
  from public.profiles p where p.id = ator;
  nome_ator := coalesce(nome_ator, 'Sistema');

  if tg_table_name = 'organizations' then
    org_id := new.id;
    tipo := 'organization.' || sufixo;
    resumo := nome_ator || ' ' || acao || ' ' || new.trade_name;
  else
    org_id := new.organization_id;
    tipo := 'person.' || sufixo;
    select nome_ator || ' ' || acao || ' ' || new.full_name || coalesce(' em ' || o.trade_name, '')
      into resumo
    from (select 1) x left join public.organizations o on o.id = new.organization_id;
  end if;

  insert into public.activity_events
    (actor_type, actor_id, event_type, area, entity_type, entity_id, organization_id, summary)
  values
    (case when ator is null then 'system'::public.actor_type else 'user'::public.actor_type end,
     ator, tipo, 'comercial'::public.event_area, tg_table_name, new.id, org_id, resumo);

  return new;
end $$;

revoke execute on function private.registrar_evento_crm() from public, anon;

create trigger trg_organizations_evento after insert or update on public.organizations
  for each row execute function private.registrar_evento_crm();
create trigger trg_people_evento after insert or update on public.people
  for each row execute function private.registrar_evento_crm();
