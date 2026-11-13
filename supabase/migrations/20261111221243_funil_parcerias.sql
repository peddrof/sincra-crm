-- Funil "Fundo e parcerias" (Felipe, 11/11/2026): negócios com gestoras, fundos e parceiros (ex.: Baobá),
-- que não cabem nos funis de hospitais e de médicos. Revisa a decisão #7 (antes: sem funil de fundo).
alter table public.pipelines add column if not exists position int not null default 99;
update public.pipelines set position = 1 where key = 'hospital';
update public.pipelines set position = 2 where key = 'medico';

insert into public.pipelines (key, name, position) values ('parceria', 'Fundo e parcerias', 3)
on conflict (key) do nothing;

insert into public.pipeline_stages (pipeline_id, key, name, position, is_closed)
select p.id, s.key, s.name, s.position, s.is_closed
from public.pipelines p
join (values
  ('proposta', 'Proposta', 1, false),
  ('negociacao', 'Negociação', 2, false),
  ('contrato', 'Contrato', 3, false),
  ('assinado', 'Assinado', 4, true),
  ('perdido', 'Perdido', 5, true)
) as s(key, name, position, is_closed) on true
where p.key = 'parceria'
on conflict (pipeline_id, key) do nothing;
