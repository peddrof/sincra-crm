-- Relacionamento com pessoas (pedido do Felipe, 11/11/2026, complemento "contatos pessoais e avulsos").
-- Profundidade (N0–N3), situação e prioridade (P1–P3) são independentes entre si e do tipo profissional.
-- Nada aqui apaga histórico: "fora da visão principal" é só filtro de tela.

alter table public.people
  add column if not exists relacao_tipo text
    check (relacao_tipo in ('comercial', 'parceiro', 'prestador', 'mentor', 'ponte', 'interno', 'outro')),
  add column if not exists profundidade smallint check (profundidade between 0 and 3),
  add column if not exists situacao text
    check (situacao in ('ativa', 'retomavel', 'em_aberto', 'sem_resposta', 'recusa', 'recusa_grosseira', 'evidencia_insuficiente')),
  add column if not exists prioridade smallint check (prioridade between 1 and 3),
  add column if not exists ultima_interacao date,
  add column if not exists confirmacao_pendente boolean not null default false,
  add column if not exists motivo_classificacao text,
  add column if not exists proximo_passo text,
  add column if not exists canal_contato text,
  add column if not exists fontes text,
  -- Local só quando verificado; natureza diz se é local de trabalho ou pessoal (nunca inferido de DDD).
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists natureza_local text check (natureza_local in ('profissional', 'pessoal'));

-- Pessoas ligadas a um negócio real (médicas ou não). Não cria oportunidade: só associa.
create table if not exists public.deal_people (
  deal_id uuid not null references public.deals(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  papel text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid(),
  primary key (deal_id, person_id)
);
create index if not exists deal_people_person_idx on public.deal_people (person_id);

alter table public.deal_people enable row level security;
create policy socios_deal_people on public.deal_people for all to authenticated
  using ((select private.is_active_member())) with check ((select private.is_active_member()));
