-- Tarefas com progresso, prioridade, período (início → entrega), etapas e lixeira.
-- status continua aberta/concluida/cancelada; o andamento de uma tarefa aberta fica em progresso.
alter table public.tasks
  add column if not exists progresso text not null default 'a_fazer'
    check (progresso in ('a_fazer', 'em_andamento', 'pausada')),
  add column if not exists prioridade text not null default 'normal'
    check (prioridade in ('urgente', 'importante', 'normal', 'baixa')),
  add column if not exists start_date date,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id);

alter table public.tasks drop constraint if exists tasks_periodo_check;
alter table public.tasks add constraint tasks_periodo_check
  check (start_date is null or due_date is null or start_date <= due_date);

create index if not exists tasks_lixeira_idx on public.tasks (deleted_at) where deleted_at is not null;

-- Etapas (checklist) de uma tarefa.
create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  done boolean not null default false,
  position int not null default 0,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists task_steps_task_idx on public.task_steps (task_id, position);
alter table public.task_steps enable row level security;
drop policy if exists members_all on public.task_steps;
create policy members_all on public.task_steps for all to authenticated
  using ((select private.is_active_member())) with check ((select private.is_active_member()));

-- Alerta de tarefa atrasada ignora a lixeira.
do $$
declare def text;
begin
  def := pg_get_functiondef('public.alertas_followup'::regproc);
  if position('t.deleted_at is null' in def) = 0 then
    def := replace(def, 'where t.status = ''aberta'' and t.due_date < current_date',
                        'where t.status = ''aberta'' and t.due_date < current_date and t.deleted_at is null');
    execute def;
  end if;
end $$;

-- Eventos: além de pedir/agendar/remarcar/concluir, a mudança de andamento de um pedido também vai para o feed.
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

  elsif new.deleted_at is not null then
    return new;

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

  elsif pedido and new.status = 'aberta' and new.progresso is distinct from old.progresso then
    tipo := 'task.progress';
    resumo := nome_ator || case new.progresso
      when 'em_andamento' then ' começou ' when 'pausada' then ' pausou ' else ' voltou para começar: ' end || new.title;
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
