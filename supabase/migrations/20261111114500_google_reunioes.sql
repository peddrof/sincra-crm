-- Fase 2: conexão com o Google (Drive/Calendar) e reuniões a partir de transcrições.

-- Conexão única da Sincra com o Google (conta do Felipe). O refresh token fica criptografado pela aplicação
-- (AES-256-GCM, chave GOOGLE_TOKEN_ENCRYPTION_KEY). RLS ligada e sem políticas: só o servidor, com a
-- chave secreta, lê e grava. Nenhum sócio vê o token pela API.
create table public.integracoes_google (
  id smallint primary key default 1 check (id = 1),
  email text not null,
  refresh_token_cifrado text not null,
  escopos text not null,
  conectado_por uuid references public.profiles(id),
  conectado_em timestamptz not null default now()
);
alter table public.integracoes_google enable row level security;
comment on table public.integracoes_google is 'Sem políticas de propósito: acesso só pela service role no servidor.';

-- Reuniões = interactions do tipo "reuniao", vindas de uma transcrição no Drive.
alter table public.interactions alter column created_by set default auth.uid();
alter table public.interactions add column if not exists title text;
alter table public.interactions add column if not exists drive_file_id text unique;
alter table public.interactions add column if not exists status text not null default 'confirmada'
  check (status in ('processando', 'revisar', 'confirmada', 'erro'));
alter table public.interactions add column if not exists extraction jsonb;
alter table public.interactions add column if not exists error text;
alter table public.interactions add column if not exists confirmed_by uuid references public.profiles(id);
alter table public.interactions add column if not exists confirmed_at timestamptz;
create index if not exists interactions_organization_idx on public.interactions (organization_id, occurred_at desc);
create index if not exists decisions_organization_idx on public.decisions (organization_id);

-- Gravar o ID da pasta do Drive na organização não é "atualizar a organização": não gera evento.
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
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'updated_at' - 'drive_folder_id') = (to_jsonb(old) - 'updated_at' - 'drive_folder_id') then
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
