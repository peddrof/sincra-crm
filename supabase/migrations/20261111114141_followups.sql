-- Fase 2, decisão #18: follow-ups automáticos (negócio parado, documento pendente, tarefa atrasada, organização sem contato).

-- Prazos configuráveis (dias).
insert into public.settings (key, value, description) values
  ('followup_negocio_parado_dias', '{"value": 7}', 'Alerta de negócio parado na mesma etapa (dias)'),
  ('followup_documento_pendente_dias', '{"value": 5}', 'Alerta de lista com documento pendente (dias)'),
  ('followup_sem_contato_dias', '{"value": 30}', 'Alerta de organização sem contato (dias)')
on conflict (key) do nothing;

-- Quando o negócio entrou na etapa atual.
alter table public.deals add column if not exists stage_changed_at timestamptz not null default now();

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
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.stage_changed_at := now();
  end if;
  return new;
end $$;

create or replace function private.prazo(chave text, padrao int) returns int
language sql stable set search_path = '' as $$
  select coalesce((select (s.value ->> 'value')::int from public.settings s where s.key = chave), padrao);
$$;

-- Alertas abertos agora. Security invoker: para o sócio, a RLS vale; para o job, roda como dono das tabelas.
create or replace function public.alertas_followup()
returns table (
  tipo text, area public.event_area, entidade text, entidade_id uuid, organizacao_id uuid,
  responsavel uuid, dias int, resumo text
)
language sql stable set search_path = '' as $$
  -- Negócio aberto parado na mesma etapa.
  select 'negocio_parado', 'comercial'::public.event_area, 'deals', d.id, d.organization_id, d.owner_id,
         (current_date - d.stage_changed_at::date)::int,
         d.title || ' parado há ' || (current_date - d.stage_changed_at::date) || ' dias em ' || s.name || '.'
  from public.deals d join public.pipeline_stages s on s.id = d.stage_id
  where d.status = 'aberto'
    and d.stage_changed_at < now() - make_interval(days => private.prazo('followup_negocio_parado_dias', 7))

  union all
  -- Lista com documento obrigatório pendente ou recusado há mais de N dias.
  select 'documento_pendente', 'comercial', 'document_requests', r.id, r.organization_id, r.created_by,
         (current_date - r.created_at::date)::int,
         o.trade_name || ': ' || count(*) || case when count(*) = 1 then ' documento pendente' else ' documentos pendentes' end
           || ' há ' || (current_date - r.created_at::date) || ' dias.'
  from public.document_requests r
  join public.organizations o on o.id = r.organization_id
  join public.document_request_items i on i.request_id = r.id
  where i.required and i.status in ('pendente', 'rejeitado')
    and r.created_at < now() - make_interval(days => private.prazo('followup_documento_pendente_dias', 5))
  group by r.id, r.organization_id, r.created_by, r.created_at, o.trade_name

  union all
  -- Tarefa aberta com prazo vencido.
  select 'tarefa_atrasada', 'geral', 'tasks', t.id, t.organization_id, t.assignee_id,
         (current_date - t.due_date)::int,
         'Tarefa atrasada há ' || (current_date - t.due_date) || case when current_date - t.due_date = 1 then ' dia: ' else ' dias: ' end || t.title || '.'
  from public.tasks t
  where t.status = 'aberta' and t.due_date < current_date

  union all
  -- Organização com negócio aberto e sem nenhuma movimentação há mais de N dias.
  select 'sem_contato', 'comercial', 'organizations', o.id, o.id, o.owner_id,
         (current_date - u.ultimo::date)::int,
         o.trade_name || ' sem contato há ' || (current_date - u.ultimo::date) || ' dias.'
  from public.organizations o
  cross join lateral (
    select greatest(
      o.created_at,
      (select max(i.occurred_at) from public.interactions i where i.organization_id = o.id),
      (select max(e.created_at) from public.activity_events e
        where e.organization_id = o.id and e.actor_type = 'user')
    ) as ultimo
  ) u
  where exists (select 1 from public.deals d where d.organization_id = o.id and d.status = 'aberto')
    and u.ultimo < now() - make_interval(days => private.prazo('followup_sem_contato_dias', 30));
$$;

-- Job diário: publica no feed cada alerta, no máximo uma vez a cada 7 dias por item.
create or replace function private.gerar_followups() returns int
language plpgsql security definer set search_path = '' as $$
declare
  inseridos int;
begin
  insert into public.activity_events
    (actor_type, actor_id, event_type, area, entity_type, entity_id, organization_id, summary, mentions)
  select 'system', null, 'followup.' || a.tipo, a.area, a.entidade, a.entidade_id, a.organizacao_id, a.resumo,
         case when a.responsavel is null then '{}'::uuid[] else array[a.responsavel] end
  from public.alertas_followup() a
  where not exists (
    select 1 from public.activity_events e
    where e.event_type = 'followup.' || a.tipo
      and e.entity_id = a.entidade_id
      and e.created_at > now() - interval '7 days'
  );
  get diagnostics inseridos = row_count;
  return inseridos;
end $$;

revoke execute on function private.gerar_followups() from public, anon, authenticated;
revoke execute on function private.prazo(text, int) from public, anon;
grant execute on function private.prazo(text, int) to authenticated;
revoke execute on function public.alertas_followup() from public, anon;
grant execute on function public.alertas_followup() to authenticated;

create extension if not exists pg_cron;
-- 11h UTC = 8h em Brasília.
select cron.schedule('sincra-followups-diarios', '0 11 * * *', 'select private.gerar_followups()');
