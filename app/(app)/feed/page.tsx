import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoSecundario, classeCampo } from "@/components/campos";
import { marcarTudoLido } from "@/lib/actions/feed";
import { getSocio } from "@/lib/auth";
import { AREAS, apelidoDe, GRUPOS_EVENTO, type Area } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { EventoItem, type Comentario, type EventoFeed, type Reacao } from "./EventoItem";
import { PostForm } from "./PostForm";

export const metadata: Metadata = { title: "Feed · Sincra" };

type Filtros = {
  pessoa?: string;
  area?: string;
  org?: string;
  tipo?: string;
  nao_lidos?: string;
  mencoes?: string;
  antes?: string;
};

const POR_PAGINA = 50;

async function FeedConteudo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const socio = await getSocio();
  const supabase = await createClient();

  let consulta = supabase.from("feed_eventos").select("*").order("created_at", { ascending: false }).limit(POR_PAGINA);
  if (filtros.pessoa) consulta = consulta.eq("actor_id", filtros.pessoa);
  if (filtros.area && AREAS.some((a) => a.valor === filtros.area)) consulta = consulta.eq("area", filtros.area as Area);
  if (filtros.org) consulta = consulta.eq("organization_id", filtros.org);
  const grupo = GRUPOS_EVENTO.find((g) => g.valor === filtros.tipo);
  if (grupo) consulta = consulta.or(grupo.prefixos.map((p) => `event_type.like.${p}*`).join(","));
  if (filtros.nao_lidos) consulta = consulta.eq("lido", false);
  if (filtros.mencoes) consulta = consulta.eq("me_menciona", true);
  if (filtros.antes) consulta = consulta.lt("created_at", filtros.antes);

  const [{ data: linhas, error }, { data: perfis }, { data: orgs }, { count: naoLidos }] = await Promise.all([
    consulta,
    supabase.from("profiles").select("id, full_name, nickname, active"),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
    supabase.from("feed_eventos").select("id", { count: "exact", head: true }).eq("lido", false),
  ]);
  if (error) console.error("[feed] falha na lista:", error.message);

  const eventos: EventoFeed[] = (linhas ?? []).flatMap((e) =>
    e.id && e.event_type && e.summary && e.created_at
      ? [
          {
            id: e.id,
            actor_id: e.actor_id,
            event_type: e.event_type,
            area: e.area,
            entity_type: e.entity_type,
            entity_id: e.entity_id,
            organization_id: e.organization_id,
            summary: e.summary,
            body: e.body,
            payload: e.payload,
            created_at: e.created_at,
            lido: e.lido ?? true,
            me_menciona: e.me_menciona ?? false,
          },
        ]
      : [],
  );
  const ids = eventos.map((e) => e.id);

  const [{ data: comentarios }, { data: reacoes }] = ids.length
    ? await Promise.all([
        supabase.from("event_comments").select("id, event_id, author_id, body, created_at, editado_em").in("event_id", ids).order("created_at"),
        supabase.from("event_reactions").select("event_id, emoji, profile_id").in("event_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const nomePerfil = new Map((perfis ?? []).map((p) => [p.id, apelidoDe(p)]));
  const nomeOrg = new Map((orgs ?? []).map((o) => [o.id, o.trade_name]));
  const apelidos = (perfis ?? []).filter((p) => p.active).map((p) => apelidoDe(p));

  const comentariosPor = new Map<string, Comentario[]>();
  for (const c of comentarios ?? []) {
    const lista = comentariosPor.get(c.event_id) ?? [];
    lista.push({
      id: c.id,
      autorId: c.author_id,
      autor: nomePerfil.get(c.author_id) ?? "Sócio",
      body: c.body,
      created_at: c.created_at,
      editado: Boolean(c.editado_em),
    });
    comentariosPor.set(c.event_id, lista);
  }
  const reacoesPor = new Map<string, Reacao[]>();
  for (const r of reacoes ?? []) {
    const lista = reacoesPor.get(r.event_id) ?? [];
    const item = lista.find((x) => x.emoji === r.emoji);
    if (item) {
      item.total += 1;
      item.minha ||= r.profile_id === socio.id;
    } else {
      lista.push({ emoji: r.emoji, total: 1, minha: r.profile_id === socio.id });
    }
    reacoesPor.set(r.event_id, lista);
  }

  const filtrando = Boolean(filtros.pessoa || filtros.area || filtros.org || filtros.tipo || filtros.nao_lidos || filtros.mencoes);
  const ultimo = eventos.at(-1);
  const maisAntigos =
    eventos.length === POR_PAGINA && ultimo
      ? `/feed?${new URLSearchParams({ ...stripVazios(filtros), antes: ultimo.created_at }).toString()}`
      : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Atualizações dos sócios</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Feed</h1>
          <p className="text-base leading-6 font-medium">
            <span className="tabular text-cinza">
              {naoLidos ? `${naoLidos} ${naoLidos === 1 ? "atualização não lida." : "atualizações não lidas."}` : "Tudo lido."}
            </span>{" "}
            O que cada sócio fez na plataforma.
          </p>
        </div>
        {Boolean(naoLidos) && (
          <form action={marcarTudoLido}>
            <button type="submit" className={classeBotaoSecundario}>
              Marcar tudo como lido
            </button>
          </form>
        )}
      </div>

      <section aria-label="Postar atualização" className="rounded-cartao border border-linha bg-white p-5 shadow-cartao">
        <PostForm
          areaPadrao="geral"
          organizacoes={(orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name }))}
          apelidos={apelidos}
        />
      </section>

      <details className="rounded-cartao bg-superficie p-4" open={filtrando}>
        <summary className="cursor-pointer text-sm font-semibold text-tinta-2">Filtros{filtrando ? " ativos" : ""}</summary>
        <form method="get" className="grid gap-3 pt-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Pessoa
            <select name="pessoa" defaultValue={filtros.pessoa ?? ""} className={classeCampo}>
              <option value="">Todas</option>
              {(perfis ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {apelidoDe(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Área
            <select name="area" defaultValue={filtros.area ?? ""} className={classeCampo}>
              <option value="">Todas</option>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Organização
            <select name="org" defaultValue={filtros.org ?? ""} className={classeCampo}>
              <option value="">Todas</option>
              {(orgs ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.trade_name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Tipo
            <select name="tipo" defaultValue={filtros.tipo ?? ""} className={classeCampo}>
              <option value="">Todos</option>
              {GRUPOS_EVENTO.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.rotulo}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-tinta">
              <input type="checkbox" name="nao_lidos" value="1" defaultChecked={Boolean(filtros.nao_lidos)} className="size-4 accent-tinta" />
              Só não lidas
            </label>
            <label className="flex items-center gap-2 text-sm text-tinta">
              <input type="checkbox" name="mencoes" value="1" defaultChecked={Boolean(filtros.mencoes)} className="size-4 accent-tinta" />
              Só menções a mim
            </label>
            <div className="ml-auto flex gap-2">
              {filtrando && (
                <Link href="/feed" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-sincra-tinta">
                  Limpar
                </Link>
              )}
              <button type="submit" className={classeBotaoSecundario}>
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </details>

      {eventos.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-cartao border border-linha bg-white p-8">
          <p className="text-base leading-6 font-semibold">
            {filtrando ? "Nenhuma atualização com estes filtros." : "Nenhuma atualização ainda."}
          </p>
          <p className="text-sm leading-[22px] text-tinta-3">
            {filtrando
              ? "Mude os filtros ou limpe a busca."
              : "Cadastros de organizações e pessoas e os posts dos sócios aparecem aqui."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {eventos.map((e) => (
            <EventoItem
              key={e.id}
              evento={e}
              nomeAtor={e.actor_id ? nomePerfil.get(e.actor_id) ?? "Sócio" : "Sistema"}
              nomeOrganizacao={e.organization_id ? nomeOrg.get(e.organization_id) ?? null : null}
              comentarios={comentariosPor.get(e.id) ?? []}
              reacoes={reacoesPor.get(e.id) ?? []}
              apelidos={apelidos}
              socioId={socio.id}
            />
          ))}
          {maisAntigos && (
            <Link href={maisAntigos} className={`${classeBotaoSecundario} self-center`}>
              Ver mais antigas
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

function stripVazios(filtros: Filtros): Record<string, string> {
  return Object.fromEntries(Object.entries(filtros).filter(([k, v]) => k !== "antes" && typeof v === "string" && v));
}

export default function FeedPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <FeedConteudo searchParams={searchParams} />
    </Suspense>
  );
}
