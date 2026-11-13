-- 0001_init.sql — esquema inicial da plataforma interna da Sincra (RASCUNHO)
-- Revisar antes de aplicar em produção. Ver docs/05-modelo-de-dados.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type organization_type as enum ('hospital', 'clinica', 'operadora', 'fundo', 'outro');
create type deal_status as enum ('aberto', 'ganho', 'perdido');
create type interaction_type as enum ('reuniao', 'ligacao', 'email', 'nota', 'instagram', 'whatsapp');
create type task_status as enum ('aberta', 'concluida', 'cancelada');
create type doc_item_status as enum ('pendente', 'recebido', 'aprovado', 'rejeitado');
-- Sem assinatura eletrônica integrada: o PDF é gerado e baixado, o cliente assina pelo gov.br
-- e um sócio sobe o PDF assinado (decisão #3, 10/11/2026).
create type contract_status as enum ('rascunho', 'em_revisao', 'aprovado', 'gerado', 'assinado', 'recusado', 'cancelado');
-- 'direto': gera o PDF sem aprovação; 'revisao': contrato negociado, exige aprovação de um sócio antes do PDF final.
create type signing_mode as enum ('direto', 'revisao');
create type signer_status as enum ('pendente', 'assinado', 'recusado');
create type actor_type as enum ('user', 'system', 'github');
create type event_area as enum ('comercial', 'produto', 'fundo', 'operacao', 'geral');

-- ---------------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Sócios
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text,
  avatar_url text,
  main_area event_area default 'geral',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

-- ---------------------------------------------------------------------------
-- Configurações
-- ---------------------------------------------------------------------------
create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- Taxas em % ao mês (decisão #8, 10/11/2026).
insert into settings (key, value, description) values
  ('default_rate_hospital', '{"value": 3.5, "unit": "percent_per_month"}', 'Taxa padrão para hospitais e clínicas (% ao mês)'),
  ('default_rate_medico',   '{"value": 6.0, "unit": "percent_per_month"}', 'Taxa padrão para médicos (% ao mês)');

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  type organization_type not null,
  legal_name text,
  trade_name text not null,
  cnpj text unique,
  city text,
  state char(2),
  website text,
  drive_folder_id text,
  owner_id uuid references profiles(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();

create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  deal_id uuid,               -- FK adicionada depois de deals
  title text not null,
  drive_file_id text,
  mime_type text,
  uploaded_by_actor actor_type not null default 'user',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  crm_number text,            -- CRM do médico, quando aplicável
  can_sign boolean not null default false,
  signing_evidence_document_id uuid references documents(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_people_updated before update on people
  for each row execute function set_updated_at();

create table pipelines (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,   -- 'hospital', 'medico', 'fundo'
  name text not null
);

create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  key text not null,
  name text not null,
  position int not null,
  is_closed boolean not null default false,
  unique (pipeline_id, key)
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id),
  stage_id uuid not null references pipeline_stages(id),
  title text not null,
  owner_id uuid references profiles(id),
  status deal_status not null default 'aberto',
  rate_percent numeric(6,3),          -- se nulo, usa o padrão de settings
  amount_estimate_cents bigint,
  expected_close_date date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_deals_updated before update on deals
  for each row execute function set_updated_at();

alter table documents
  add constraint documents_deal_fk foreign key (deal_id) references deals(id) on delete set null;

create table interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  type interaction_type not null,
  occurred_at timestamptz not null default now(),
  summary text,
  transcript_document_id uuid references documents(id),
  calendar_event_id text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_id uuid references profiles(id),
  due_date date,
  status task_status not null default 'aberta',
  organization_id uuid references organizations(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  decided_by uuid references profiles(id),
  decided_at date not null default current_date,
  organization_id uuid references organizations(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Listas de documentos por organização (sem portal externo: os sócios sobem os arquivos)
-- ---------------------------------------------------------------------------
create table document_checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type organization_type,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references document_checklists(id) on delete cascade,
  title text not null,
  description text,
  required boolean not null default true,
  position int not null
);

create table document_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  checklist_id uuid references document_checklists(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table document_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references document_requests(id) on delete cascade,
  title text not null,
  description text,
  required boolean not null default true,
  position int not null,
  status doc_item_status not null default 'pendente',
  document_id uuid references documents(id),
  reviewer_comment text,
  reviewed_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
create trigger trg_doc_req_items_updated before update on document_request_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Contratos
-- ---------------------------------------------------------------------------
create table contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,                 -- 'nda', 'proposta', 'adesao_medico', 'cessao' ...
  version int not null default 1,
  signing_mode signing_mode not null,
  base_file_path text not null,       -- arquivo em templates/ ou Storage
  variables jsonb not null default '[]',
  legal_reviewed boolean not null default false,
  legal_reviewed_note text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (kind, version),
  -- só modelo revisado pode ser ativado
  constraint active_requires_review check (not active or legal_reviewed)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references contract_templates(id),
  deal_id uuid references deals(id) on delete set null,
  organization_id uuid not null references organizations(id),
  status contract_status not null default 'rascunho',
  variables jsonb not null default '{}',
  pdf_document_id uuid references documents(id),          -- PDF gerado para download
  signed_document_id uuid references documents(id),       -- PDF assinado (gov.br) enviado por um sócio
  signer_check_override_by uuid references profiles(id),  -- quem confirmou signatário sem comprovação
  approved_by uuid references profiles(id),
  generated_at timestamptz,
  signed_at timestamptz,
  signed_uploaded_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_contracts_updated before update on contracts
  for each row execute function set_updated_at();

create table contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  person_id uuid references people(id),
  profile_id uuid references profiles(id),       -- sócio da Sincra assinando
  name text not null,
  email text,
  phone text,
  status signer_status not null default 'pendente',
  signed_at timestamptz,
  constraint signer_is_someone check (person_id is not null or profile_id is not null)
);

-- ---------------------------------------------------------------------------
-- Feed de atualizações
-- ---------------------------------------------------------------------------
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_type actor_type not null,
  actor_id uuid references profiles(id),
  event_type text not null,
  area event_area not null default 'geral',
  entity_type text,
  entity_id uuid,
  organization_id uuid references organizations(id) on delete set null,
  summary text not null,
  body text,                           -- texto de post manual
  payload jsonb not null default '{}',
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_events_created_idx on activity_events (created_at desc);
create index activity_events_org_idx on activity_events (organization_id, created_at desc);
create index activity_events_actor_idx on activity_events (actor_id, created_at desc);

create table event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references activity_events(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table event_reactions (
  event_id uuid not null references activity_events(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id, emoji)
);

create table event_reads (
  event_id uuid not null references activity_events(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  read_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table notification_preferences (
  profile_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,            -- '*' para padrão
  push boolean not null default false,
  primary key (profile_id, event_type)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: só sócios ativos. Webhooks (GitHub, após a publicação) usam service role no servidor.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','organizations','documents','people','pipelines','pipeline_stages',
    'deals','interactions','tasks','decisions','document_checklists','document_checklist_items',
    'document_requests','document_request_items','contract_templates','contracts','contract_signers',
    'activity_events','event_comments','event_reactions','event_reads'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy members_all on %I for all to authenticated using (is_active_member()) with check (is_active_member())', t);
  end loop;
end $$;

-- Preferências e inscrições de push: cada sócio só vê as suas
alter table notification_preferences enable row level security;
create policy own_prefs on notification_preferences for all to authenticated
  using (profile_id = auth.uid() and is_active_member())
  with check (profile_id = auth.uid() and is_active_member());

alter table push_subscriptions enable row level security;
create policy own_push on push_subscriptions for all to authenticated
  using (profile_id = auth.uid() and is_active_member())
  with check (profile_id = auth.uid() and is_active_member());

-- ---------------------------------------------------------------------------
-- Dados iniciais: funis (decisão #7, 10/11/2026 — sem funil de fundo; clínicas no funil de hospitais)
-- ---------------------------------------------------------------------------
insert into pipelines (key, name) values
  ('hospital', 'Hospitais e clínicas'),
  ('medico', 'Médicos');

insert into pipeline_stages (pipeline_id, key, name, position, is_closed)
select p.id, s.key, s.name, s.position, s.is_closed
from pipelines p
join (values
  ('hospital','prospeccao','Prospecção',1,false),
  ('hospital','reuniao','Reunião',2,false),
  ('hospital','documentos','Documentos',3,false),
  ('hospital','analise_fundo','Análise do fundo',4,false),
  ('hospital','contrato','Contrato',5,false),
  ('hospital','operando','Operando',6,true),
  ('hospital','perdido','Perdido',7,true),
  ('medico','contato','Contato',1,false),
  ('medico','cadastro','Cadastro',2,false),
  ('medico','adesao','Adesão',3,false),
  ('medico','operando','Operando',4,true),
  ('medico','perdido','Perdido',5,true)
) as s(pipeline_key, key, name, position, is_closed) on s.pipeline_key = p.key;
