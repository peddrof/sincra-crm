-- Quadro semanal de tarefas: due_date = dia em que a tarefa está no quadro.
-- Pedido entre sócios = tarefa criada por um sócio para outro (created_by <> assignee_id):
-- nasce sem dia (coluna "A agendar"), com a data pedida em requested_date; quem recebeu escolhe o dia.
alter table public.tasks add column if not exists requested_date date;
create index if not exists tasks_due_idx on public.tasks (due_date);

-- "seg 10/11"
create or replace function private.dia_curto(d date) returns text
language sql immutable set search_path = '' as $$
  select (array['dom','seg','ter','qua','qui','sex','sáb'])[extract(dow from d)::int + 1] || ' ' || to_char(d, 'DD/MM')
$$;

-- Concluída sem dia vai para o dia da conclusão, para continuar visível no quadro.
create or replace function private.ajustar_tarefa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' then
    if tg_op = 'INSERT' or old.status is distinct from 'concluida' then
      new.completed_at := now();
    end if;
    if new.due_date is null then
      new.due_date := (now() at time zone 'America/Sao_Paulo')::date;
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

-- Eventos de tarefa no feed (substitui o ramo de tarefas de registrar_evento_operacao).
-- Mudança de dia só vira evento em pedido entre sócios: quem pediu e o terceiro sócio veem a data escolhida.
create or replace function private.registrar_evento_tarefa() returns trigger
language plpgsql set search_path = '' as $$
declare
  ator uuid := auth.uid();
  nome_ator text;
  nome_resp text;
  tipo text;
  resumo text;
  mencoes uuid[] := '{}';
  pedido boolean := new.created_by is not null and new.assignee_id is not null and new.created_by <> new.assignee_id;
  aviso_atraso text := '';
begin
  select coalesce(p.nickname, split_part(p.full_name, ' ', 1)) into nome_ator from public.profiles p where p.id = ator;
  nome_ator := coalesce(nome_ator, 'Sistema');
  select coalesce(p.nickname, split_part(p.full_name, ' ', 1)) into nome_resp from public.profiles p where p.id = new.assignee_id;

  if tg_op = 'INSERT' then
    if pedido then
      tipo := 'task.requested';
      resumo := nome_ator || ' pediu a ' || coalesce(nome_resp, 'outro sócio') || ': ' || new.title
        || coalesce(', para ' || private.dia_curto(coalesce(new.requested_date, new.due_date)), '');
    else
      tipo := 'task.created';
      resumo := nome_ator || ' criou a tarefa ' || new.title;
    end if;
    if new.assignee_id is not null and new.assignee_id is distinct from ator then
      mencoes := array[new.assignee_id];
    end if;

  elsif new.status = 'concluida' and old.status is distinct from 'concluida' then
    tipo := 'task.completed';
    resumo := nome_ator || ' concluiu a tarefa ' || new.title;
    if new.created_by is not null and new.created_by is distinct from ator then
      mencoes := array[new.created_by];
    end if;

  elsif pedido and new.status = 'aberta' and new.due_date is distinct from old.due_date then
    if new.requested_date is not null and new.due_date > new.requested_date then
      aviso_atraso := ' (o pedido era para ' || private.dia_curto(new.requested_date) || ')';
    end if;
    if new.due_date is null then
      tipo := 'task.unscheduled';
      resumo := nome_ator || ' tirou do dia a tarefa ' || new.title;
    elsif old.due_date is null then
      tipo := 'task.scheduled';
      resumo := nome_ator || ' agendou ' || new.title || ' para ' || private.dia_curto(new.due_date) || aviso_atraso;
    else
      tipo := 'task.rescheduled';
      resumo := nome_ator || ' remarcou ' || new.title || ' de ' || private.dia_curto(old.due_date)
        || ' para ' || private.dia_curto(new.due_date) || aviso_atraso;
    end if;
    select coalesce(array_agg(x), '{}') into mencoes
    from unnest(array[new.created_by, new.assignee_id]) x where x is distinct from ator and x is not null;

  else
    return new;
  end if;

  insert into public.activity_events
    (actor_type, actor_id, event_type, area, entity_type, entity_id, organization_id, summary, mentions)
  values
    (case when ator is null then 'system'::public.actor_type else 'user'::public.actor_type end,
     ator, tipo, 'geral', 'tasks', new.id, new.organization_id, resumo, mencoes);
  return new;
end $$;

drop trigger if exists trg_tasks_evento on public.tasks;
create trigger trg_tasks_evento after insert or update on public.tasks
  for each row execute function private.registrar_evento_tarefa();
