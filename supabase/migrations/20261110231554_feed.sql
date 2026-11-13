-- Módulo 3 (feed): políticas por autor, visão com leitura e menções, anexos de posts.

-- activity_events é o registro do que aconteceu: todo sócio lê; ninguém edita.
-- Inserção só em nome próprio (o gatilho de CRM roda como quem fez a alteração, então passa).
-- Apagar: só o próprio post manual.
drop policy members_all on public.activity_events;
create policy feed_ler on public.activity_events for select to authenticated
  using (private.is_active_member());
create policy feed_inserir on public.activity_events for insert to authenticated
  with check (private.is_active_member() and actor_type = 'user' and actor_id = auth.uid());
create policy feed_apagar_post on public.activity_events for delete to authenticated
  using (private.is_active_member() and actor_id = auth.uid() and event_type = 'post.created');

-- Comentários: todo sócio lê; cada um escreve e apaga só os seus.
alter table public.event_comments alter column author_id set default auth.uid();
drop policy members_all on public.event_comments;
create policy comentarios_ler on public.event_comments for select to authenticated
  using (private.is_active_member());
create policy comentarios_inserir on public.event_comments for insert to authenticated
  with check (private.is_active_member() and author_id = auth.uid());
create policy comentarios_apagar on public.event_comments for delete to authenticated
  using (private.is_active_member() and author_id = auth.uid());

-- Reações: todo sócio vê; cada um põe e tira só as suas.
alter table public.event_reactions alter column profile_id set default auth.uid();
drop policy members_all on public.event_reactions;
create policy reacoes_ler on public.event_reactions for select to authenticated
  using (private.is_active_member());
create policy reacoes_inserir on public.event_reactions for insert to authenticated
  with check (private.is_active_member() and profile_id = auth.uid());
create policy reacoes_apagar on public.event_reactions for delete to authenticated
  using (private.is_active_member() and profile_id = auth.uid());

-- Leitura: cada sócio só vê e marca as próprias.
alter table public.event_reads alter column profile_id set default auth.uid();
drop policy members_all on public.event_reads;
create policy leituras_proprias on public.event_reads for all to authenticated
  using (private.is_active_member() and profile_id = auth.uid())
  with check (private.is_active_member() and profile_id = auth.uid());

create index if not exists event_reads_profile_idx on public.event_reads (profile_id);
create index if not exists event_comments_event_idx on public.event_comments (event_id, created_at);
create index if not exists activity_events_mentions_idx on public.activity_events using gin (mentions);

-- Visão do feed para quem está logado: lido (o próprio evento conta como lido), menção e total de comentários.
-- security_invoker: a RLS das tabelas vale para quem consulta.
create view public.feed_eventos with (security_invoker = true) as
select
  e.*,
  (e.actor_id = auth.uid()
    or exists (select 1 from public.event_reads r where r.event_id = e.id and r.profile_id = auth.uid())) as lido,
  coalesce(auth.uid() = any (e.mentions), false) as me_menciona,
  (select count(*) from public.event_comments c where c.event_id = e.id)::int as total_comentarios
from public.activity_events e;

-- Anexos de posts: bucket privado, 8 MB por arquivo. Cada sócio grava na própria pasta (<id do sócio>/...).
insert into storage.buckets (id, name, public, file_size_limit)
values ('feed-anexos', 'feed-anexos', false, 8388608)
on conflict (id) do nothing;

create policy feed_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'feed-anexos' and private.is_active_member());
create policy feed_anexos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-anexos' and private.is_active_member()
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy feed_anexos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'feed-anexos' and owner_id = auth.uid()::text);
