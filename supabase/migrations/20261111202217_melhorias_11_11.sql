-- Ajustes pedidos pelo Felipe em 11/11/2026.

-- Médico como tipo de organização (médico pessoa física ou PJ), usado no funil "Médicos" e no mapa.
alter type public.organization_type add value if not exists 'medico' before 'outro';

-- Reuniões: com organização, interna (só sócios) ou com o fundo; e reuniões agendadas.
alter table public.interactions add column if not exists contexto text not null default 'organizacao'
  check (contexto in ('organizacao', 'interna', 'fundo'));
alter table public.interactions add column if not exists duracao_minutos int;
alter table public.interactions add column if not exists local text;
alter table public.interactions add column if not exists participantes text[] not null default '{}';
alter table public.interactions drop constraint if exists interactions_status_check;
alter table public.interactions add constraint interactions_status_check
  check (status in ('agendada', 'processando', 'revisar', 'confirmada', 'erro'));

-- Modelo de lista com link de formulário (ex.: Google Forms para o hospital enviar documentos).
alter table public.document_checklists add column if not exists link_formulario text;
alter table public.document_requests add column if not exists link_formulario text;

-- Comentários: o autor pode editar o próprio.
alter table public.event_comments add column if not exists editado_em timestamptz;
drop policy if exists comentarios_editar on public.event_comments;
create policy comentarios_editar on public.event_comments for update to authenticated
  using (private.is_active_member() and author_id = auth.uid())
  with check (private.is_active_member() and author_id = auth.uid());
