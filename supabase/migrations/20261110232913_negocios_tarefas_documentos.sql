-- Módulos 4 a 6 (negócios e funil, tarefas, documentos) e configurações.

-- Autoria e responsável preenchidos pelo banco a partir da sessão.
alter table public.deals alter column created_by set default auth.uid();
alter table public.deals alter column owner_id set default auth.uid();
alter table public.tasks alter column created_by set default auth.uid();
alter table public.tasks alter column assignee_id set default auth.uid();
alter table public.document_requests alter column created_by set default auth.uid();
alter table public.documents alter column uploaded_by set default auth.uid();

-- Documentos: arquivo no Storage privado (bucket "documentos") até a conexão com o Drive.
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists size_bytes bigint;
alter table public.document_requests add column if not exists name text;

create index if not exists deals_organization_idx on public.deals (organization_id);
create index if not exists deals_stage_idx on public.deals (stage_id);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id, status);
create index if not exists tasks_deal_idx on public.tasks (deal_id);
create index if not exists documents_organization_idx on public.documents (organization_id);
create index if not exists document_requests_organization_idx on public.document_requests (organization_id);
create index if not exists document_request_items_request_idx on public.document_request_items (request_id, position);
create index if not exists document_checklist_items_checklist_idx on public.document_checklist_items (checklist_id, position);

-- Negócio: a etapa tem de ser do mesmo funil, e o status sai da etapa (operando = ganho, perdido = perdido).
create or replace function private.ajustar_negocio() returns trigger
language plpgsql set search_path = '' as $$
declare
  etapa_funil uuid;
  etapa_chave text;
  etapa_fechada boolean;
begin
  select s.pipeline_id, s.key, s.is_closed into etapa_funil, etapa_chave, etapa_fechada
  from public.pipeline_stages s where s.id = new.stage_id;
  if etapa_funil is null or etapa_funil <> new.pipeline_id then
    raise exception 'A etapa não pertence ao funil do negócio.' using errcode = '23514';
  end if;
  new.status := case
    when etapa_chave = 'perdido' then 'perdido'::public.deal_status
    when etapa_fechada then 'ganho'::public.deal_status
    else 'aberto'::public.deal_status
  end;
  return new;
end $$;

create trigger trg_deals_ajustar before insert or update of stage_id, pipeline_id on public.deals
  for each row execute function private.ajustar_negocio();

-- Tarefa: completed_at acompanha o status.
create or replace function private.ajustar_tarefa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' then
    if tg_op = 'INSERT' or old.status is distinct from 'concluida' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger trg_tasks_ajustar before insert or update of status on public.tasks
  for each row execute function private.ajustar_tarefa();

-- Eventos do feed para negócios, tarefas, documentos e configurações.
-- Roda como quem fez a alteração (security invoker): a RLS de activity_events continua valendo.
create or replace function private.registrar_evento_operacao() returns trigger
language plpgsql set search_path = '' as $$
declare
  ator uuid := auth.uid();
  nome_ator text;
  tipo text;
  resumo text;
  area_evento public.event_area := 'comercial';
  org_id uuid;
  entidade text := tg_table_name;
  entidade_id uuid;
  mencoes uuid[] := '{}';
  nome_org text;
  nome_etapa text;
  nome_resp text;
begin
  select coalesce(p.nickname, split_part(p.full_name, ' ', 1)) into nome_ator
  from public.profiles p where p.id = ator;
  nome_ator := coalesce(nome_ator, 'Sistema');

  if tg_table_name = 'deals' then
    entidade_id := new.id;
    org_id := new.organization_id;
    select o.trade_name into nome_org from public.organizations o where o.id = new.organization_id;
    if tg_op = 'INSERT' then
      tipo := 'deal.created';
      resumo := nome_ator || ' criou o negócio ' || new.title || coalesce(' com ' || nome_org, '');
    elsif new.stage_id is distinct from old.stage_id then
      select s.name into nome_etapa from public.pipeline_stages s where s.id = new.stage_id;
      tipo := 'deal.stage_changed';
      resumo := nome_ator || ' moveu ' || new.title || ' para ' || coalesce(nome_etapa, 'outra etapa');
    elsif (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
      return new;
    else
      tipo := 'deal.updated';
      resumo := nome_ator || ' atualizou o negócio ' || new.title;
    end if;
    if new.owner_id is not null and new.owner_id is distinct from ator
       and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
      mencoes := array[new.owner_id];
    end if;

  elsif tg_table_name = 'tasks' then
    entidade_id := new.id;
    org_id := new.organization_id;
    area_evento := 'geral';
    if tg_op = 'INSERT' then
      select coalesce(p.nickname, split_part(p.full_name, ' ', 1)) into nome_resp
      from public.profiles p where p.id = new.assignee_id;
      tipo := 'task.created';
      resumo := nome_ator || ' criou a tarefa ' || new.title
        || case when new.assignee_id is distinct from ator and nome_resp is not null then ' para ' || nome_resp else '' end;
      if new.assignee_id is not null and new.assignee_id is distinct from ator then
        mencoes := array[new.assignee_id];
      end if;
    elsif new.status = 'concluida' and old.status is distinct from 'concluida' then
      tipo := 'task.completed';
      resumo := nome_ator || ' concluiu a tarefa ' || new.title;
      if new.created_by is not null and new.created_by is distinct from ator then
        mencoes := array[new.created_by];
      end if;
    else
      return new;
    end if;

  elsif tg_table_name = 'document_requests' then
    entidade_id := new.id;
    org_id := new.organization_id;
    select o.trade_name into nome_org from public.organizations o where o.id = new.organization_id;
    tipo := 'document_request.created';
    resumo := nome_ator || ' abriu a lista ' || coalesce(new.name, 'de documentos') || coalesce(' para ' || nome_org, '');

  elsif tg_table_name = 'document_request_items' then
    if new.status is not distinct from old.status then
      return new;
    end if;
    select r.organization_id, o.trade_name into org_id, nome_org
    from public.document_requests r join public.organizations o on o.id = r.organization_id
    where r.id = new.request_id;
    entidade := 'document_requests';
    entidade_id := new.request_id;
    tipo := 'document.' || new.status::text;
    resumo := nome_ator || ' '
      || case new.status when 'recebido' then 'recebeu ' when 'aprovado' then 'aprovou ' when 'rejeitado' then 'recusou ' else 'reabriu ' end
      || new.title || coalesce(' de ' || nome_org, '');

  elsif tg_table_name = 'settings' then
    if new.value = old.value then
      return new;
    end if;
    area_evento := 'geral';
    tipo := 'settings.updated';
    resumo := nome_ator || ' alterou: ' || coalesce(new.description, new.key);
  else
    return new;
  end if;

  insert into public.activity_events
    (actor_type, actor_id, event_type, area, entity_type, entity_id, organization_id, summary, mentions)
  values
    (case when ator is null then 'system'::public.actor_type else 'user'::public.actor_type end,
     ator, tipo, area_evento, entidade, entidade_id, org_id, resumo, mencoes);
  return new;
end $$;

create trigger trg_deals_evento after insert or update on public.deals
  for each row execute function private.registrar_evento_operacao();
create trigger trg_tasks_evento after insert or update on public.tasks
  for each row execute function private.registrar_evento_operacao();
create trigger trg_document_requests_evento after insert on public.document_requests
  for each row execute function private.registrar_evento_operacao();
create trigger trg_document_request_items_evento after update of status on public.document_request_items
  for each row execute function private.registrar_evento_operacao();
create trigger trg_settings_evento after update on public.settings
  for each row execute function private.registrar_evento_operacao();

revoke execute on function private.ajustar_negocio() from public, anon;
revoke execute on function private.ajustar_tarefa() from public, anon;
revoke execute on function private.registrar_evento_operacao() from public, anon;

-- Arquivos dos documentos de clientes: bucket privado, 25 MB por arquivo, pasta por organização.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 26214400)
on conflict (id) do nothing;

create policy documentos_ler on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and private.is_active_member());
create policy documentos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and private.is_active_member());
create policy documentos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and owner_id = auth.uid()::text);
