-- Pessoa em mais de uma organização (Felipe, 12/11/2026: Jabez e Marlon são das duas Vitas, Curitiba e Batel).
-- people.organization_id continua sendo a organização principal; aqui ficam os vínculos adicionais.
-- Um registro por pessoa: nada de duplicar a pessoa em cada organização.
create table if not exists public.pessoa_organizacoes (
  person_id uuid not null references public.people(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  papel text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid(),
  primary key (person_id, organization_id)
);
create index if not exists pessoa_organizacoes_org_idx on public.pessoa_organizacoes (organization_id);

alter table public.pessoa_organizacoes enable row level security;
create policy socios_pessoa_organizacoes on public.pessoa_organizacoes for all to authenticated
  using ((select private.is_active_member())) with check ((select private.is_active_member()));
