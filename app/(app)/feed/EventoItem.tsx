import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { comentar, marcarLido, reagir } from "@/lib/actions/feed";
import { formatarDataHora } from "@/lib/crm";
import { anexoDe, formatarTamanho, linkDoEvento, partesComMencoes, REACOES, rotuloArea, type Area } from "@/lib/feed";
import type { Json } from "@/lib/supabase/database.types";
import { ApagarPost, Comentario as ComentarioItem } from "./Comentario";

export type EventoFeed = {
  id: string;
  actor_id: string | null;
  event_type: string;
  area: Area | null;
  entity_type: string | null;
  entity_id: string | null;
  organization_id: string | null;
  summary: string;
  body: string | null;
  payload: Json | null;
  created_at: string;
  lido: boolean;
  me_menciona: boolean;
};

export type Comentario = { id: string; autorId: string; autor: string; body: string; created_at: string; editado: boolean };
export type Reacao = { emoji: string; total: number; minha: boolean };

export function EventoItem({
  evento,
  nomeAtor,
  nomeOrganizacao,
  comentarios,
  reacoes,
  apelidos,
  socioId,
}: {
  evento: EventoFeed;
  nomeAtor: string;
  nomeOrganizacao: string | null;
  comentarios: Comentario[];
  reacoes: Reacao[];
  apelidos: string[];
  socioId: string;
}) {
  const link = linkDoEvento(evento);
  const anexo = anexoDe(evento.payload);
  const iniciais = nomeAtor.slice(0, 2).toUpperCase();
  const meuPost = evento.event_type === "post.created" && evento.actor_id === socioId;

  return (
    <article
      className={`flex gap-3 rounded-cartao border border-l-4 bg-white p-4 shadow-cartao sm:p-5 ${
        evento.lido ? "border-linha border-l-azul-100" : "border-azul-200 border-l-sincra bg-azul-25"
      }`}
    >
      <div
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-azul-50 text-xs font-semibold text-sincra-tinta"
      >
        {iniciais}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm leading-[22px] font-semibold text-tinta">{evento.summary}</p>
          <span className="tabular text-xs leading-4 text-cinza">{formatarDataHora(evento.created_at)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-cinza">
          <span>{rotuloArea(evento.area)}</span>
          {nomeOrganizacao && evento.organization_id && (
            <>
              <span aria-hidden>·</span>
              <Link href={`/organizacoes/${evento.organization_id}`} className="font-semibold text-sincra-tinta">
                {nomeOrganizacao}
              </Link>
            </>
          )}
          {!evento.lido && <StatusPill tipo="andamento">Não lido</StatusPill>}
          {evento.me_menciona && <StatusPill tipo="atencao">Menciona você</StatusPill>}
        </div>

        {evento.body && (
          <p className="text-sm leading-[22px] break-words whitespace-pre-line text-tinta-3">
            {partesComMencoes(evento.body, apelidos).map((p, i) =>
              p.mencao ? (
                <span key={i} className="font-semibold text-sincra-tinta">
                  {p.texto}
                </span>
              ) : (
                <span key={i}>{p.texto}</span>
              ),
            )}
          </p>
        )}

        {anexo && (
          <a
            href={`/feed/anexo/${evento.id}`}
            className="inline-flex w-fit max-w-full items-center gap-2 rounded-campo border border-linha bg-superficie px-3 py-2 text-sm"
          >
            <span className="truncate font-semibold text-tinta">{anexo.nome}</span>
            <span className="tabular shrink-0 text-xs text-cinza">{formatarTamanho(anexo.tamanho)}</span>
          </a>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {REACOES.map((emoji) => {
            const r = reacoes.find((x) => x.emoji === emoji);
            return (
              <form key={emoji} action={reagir}>
                <input type="hidden" name="event_id" value={evento.id} />
                <input type="hidden" name="emoji" value={emoji} />
                <button
                  type="submit"
                  aria-pressed={r?.minha ?? false}
                  aria-label={`Reagir com ${emoji}${r ? `, ${r.total} ${r.total === 1 ? "reação" : "reações"}` : ""}`}
                  className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm ${
                    r?.minha ? "border-azul-200 bg-azul-50" : "border-linha bg-white hover:bg-superficie"
                  }`}
                >
                  <span>{emoji}</span>
                  {r && <span className="tabular text-xs font-semibold text-tinta-2">{r.total}</span>}
                </button>
              </form>
            );
          })}
          {link && (
            <Link href={link.href} className="ml-auto text-sm font-semibold text-sincra-tinta">
              {link.rotulo}
            </Link>
          )}
          {meuPost && (
            <div className={link ? "" : "ml-auto"}>
              <ApagarPost eventoId={evento.id} />
            </div>
          )}
          {!evento.lido && (
            <form action={marcarLido} className={link || meuPost ? "" : "ml-auto"}>
              <input type="hidden" name="event_id" value={evento.id} />
              <button type="submit" className="text-sm font-semibold text-tinta-3 hover:text-tinta">
                Marcar como lido
              </button>
            </form>
          )}
        </div>

        <details className="group border-t border-linha pt-2">
          <summary className="cursor-pointer text-sm font-semibold text-tinta-3 marker:text-cinza-3 hover:text-tinta">
            {comentarios.length === 0
              ? "Comentar"
              : `${comentarios.length} ${comentarios.length === 1 ? "comentário" : "comentários"}`}
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            {comentarios.map((c) => (
              <ComentarioItem
                key={c.id}
                c={{
                  id: c.id,
                  autor: c.autor,
                  body: c.body,
                  quando: formatarDataHora(c.created_at),
                  editado: c.editado,
                  meu: c.autorId === socioId,
                }}
              />
            ))}
            <form action={comentar} className="flex gap-2">
              <input type="hidden" name="event_id" value={evento.id} />
              <label htmlFor={`comentario-${evento.id}`} className="sr-only">
                Comentário
              </label>
              <input
                id={`comentario-${evento.id}`}
                name="body"
                required
                maxLength={4000}
                placeholder="Escreva um comentário"
                className="h-10 min-w-0 flex-1 rounded-campo border border-linha bg-white px-3 text-sm outline-none placeholder:text-cinza focus:border-sincra focus:ring-3 focus:ring-azul-100"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-full bg-sincra px-4 text-sm font-semibold text-white hover:bg-sincra-tinta"
              >
                Enviar
              </button>
            </form>
          </div>
        </details>
      </div>
    </article>
  );
}
