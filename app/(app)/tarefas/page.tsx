import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { Lixeira } from "@/components/tarefas/Lixeira";
import { NovaTarefaForm } from "@/components/tarefas/NovaTarefaForm";
import { QuadroSemana, type CartaoTarefa } from "@/components/tarefas/QuadroSemana";
import { getSocio } from "@/lib/auth";
import { nomeCurto } from "@/lib/crm";
import { hojeIso, isoHorasAtras } from "@/lib/datas";
import { createClient } from "@/lib/supabase/server";
import { andamentoDe, ddmm, inicioDaSemana, isoValido, rotuloSemana, somarDias, type PrioridadeTarefa } from "@/lib/tarefas";

export const metadata: Metadata = { title: "Tarefas · Sincra" };

type Filtros = { ver?: string; semana?: string; de?: string; tarefa?: string };

const CAMPOS =
  "id, title, description, status, progresso, prioridade, start_date, due_date, requested_date, assignee_id, created_by, created_at, organization:organizations(id, trade_name), deal:deals(id, title), task_steps(id, title, done, position)";

const VISOES = [
  { valor: "semana", rotulo: "Semana" },
  { valor: "status", rotulo: "Andamento" },
  { valor: "lixeira", rotulo: "Lixeira" },
] as const;

const diaSP = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(ts));

// Quadro compartilhado: os três sócios veem as tarefas de todos.
// Pedido para outro sócio nasce em "A agendar"; quem recebeu arrasta para o dia em que entrega.
async function TarefasConteudo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const visao = VISOES.find((v) => v.valor === f.ver)?.valor ?? "semana";
  const socio = await getSocio();
  const supabase = await createClient();
  const hoje = hojeIso();

  // Link do feed (?tarefa=…): abre a semana em que a tarefa está e o painel dela.
  let referencia = isoValido(f.semana) ? f.semana : hoje;
  if (f.tarefa && !isoValido(f.semana)) {
    const { data: alvo } = await supabase.from("tasks").select("due_date").eq("id", f.tarefa).maybeSingle();
    if (alvo?.due_date) referencia = alvo.due_date;
  }
  const segunda = inicioDaSemana(referencia);
  const domingo = somarDias(segunda, 6);
  const fimProxima = somarDias(segunda, 13);
  const semanaAtual = inicioDaSemana(hoje);

  const { data: perfis } = await supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name");
  const socios = (perfis ?? []).map((p, i) => ({ id: p.id, nome: nomeCurto(p), cor: i }));
  const porId = new Map(socios.map((s) => [s.id, s]));
  const filtro = socios.some((s) => s.id === f.de) ? f.de! : "todos";

  const base = () => {
    const q = supabase.from("tasks").select(CAMPOS).is("deleted_at", null);
    return filtro === "todos" ? q : q.eq("assignee_id", filtro);
  };

  const consultas =
    visao === "semana"
      ? [
          base().in("status", ["aberta", "concluida"]).gte("due_date", segunda).lte("due_date", fimProxima),
          base().eq("status", "aberta").is("due_date", null),
          // Atrasadas de semanas anteriores só aparecem a partir da semana atual.
          segunda >= semanaAtual ? base().eq("status", "aberta").lt("due_date", segunda) : null,
          // Tarefa de vários dias que começa nesta semana e termina depois da próxima.
          base().eq("status", "aberta").lte("start_date", domingo).gt("due_date", fimProxima),
        ]
      : visao === "status"
        ? [base().eq("status", "aberta"), base().eq("status", "concluida").gte("completed_at", isoHorasAtras(24 * 30))]
        : [];

  const [resultados, { data: orgs }, lixo] = await Promise.all([
    Promise.all(consultas.map((q) => q ?? Promise.resolve({ data: [], error: null }))),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
    visao === "lixeira"
      ? supabase
          .from("tasks")
          .select("id, title, assignee_id, deleted_by, deleted_at")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [...resultados, lixo]) if (r.error) console.error("[tarefas] falha no quadro:", r.error.message);

  const vistos = new Set<string>();
  const cartoes: CartaoTarefa[] = resultados
    .flatMap((r) => r.data ?? [])
    .filter((t) => !vistos.has(t.id) && Boolean(vistos.add(t.id)))
    .map((t) => {
      const resp = t.assignee_id ? porId.get(t.assignee_id) : undefined;
      const pedido = t.created_by && t.assignee_id && t.created_by !== t.assignee_id;
      return {
        id: t.id,
        titulo: t.title,
        descricao: t.description,
        andamento: andamentoDe(t.status, t.progresso),
        prioridade: t.prioridade as PrioridadeTarefa,
        dia: t.due_date,
        inicio: t.start_date,
        dataPedida: t.requested_date,
        criadaEm: diaSP(t.created_at),
        responsavelId: t.assignee_id,
        responsavel: resp?.nome ?? "Sem responsável",
        pedidoPor: pedido ? (porId.get(t.created_by!)?.nome ?? "outro sócio") : null,
        criadorId: t.created_by,
        cor: resp?.cor ?? 3,
        contexto: t.deal
          ? { rotulo: t.deal.title, href: `/negocios/${t.deal.id}` }
          : t.organization
            ? { rotulo: t.organization.trade_name, href: `/organizacoes/${t.organization.id}` }
            : null,
        etapas: [...t.task_steps].sort((a, b) => a.position - b.position).map((e) => ({ id: e.id, titulo: e.title, feita: e.done })),
      };
    });

  const paraMimSemDia = cartoes.filter((c) => !c.dia && c.andamento !== "concluida" && c.responsavelId === socio.id && c.pedidoPor).length;
  const link = (extra: Filtros) => {
    const q = new URLSearchParams(
      Object.entries({ ver: visao, semana: segunda, de: filtro, ...extra }).filter(([k, v]) => v && v !== "todos" && !(k === "ver" && v === "semana")) as [
        string,
        string,
      ][],
    );
    return `/tarefas?${q.toString()}`;
  };
  const vistoNome = socios.find((s) => s.id === filtro)?.nome;

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Rotina</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Tarefas</h1>
          {visao === "semana" && <p className="text-base leading-6 font-medium text-tinta-3">Semana de {rotuloSemana(segunda)}</p>}
        </div>
        {visao === "semana" && (
          <nav aria-label="Semana" className="flex items-center gap-1 rounded-full bg-superficie p-1">
            <Link href={link({ semana: somarDias(segunda, -7) })} className="rounded-full px-3 py-2 text-sm font-semibold text-tinta-3 hover:text-tinta">
              ← Anterior
            </Link>
            <Link
              href={link({ semana: semanaAtual })}
              aria-current={segunda === semanaAtual ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${segunda === semanaAtual ? "bg-white text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta"}`}
            >
              Esta semana
            </Link>
            <Link href={link({ semana: somarDias(segunda, 7) })} className="rounded-full px-3 py-2 text-sm font-semibold text-tinta-3 hover:text-tinta">
              Próxima →
            </Link>
          </nav>
        )}
      </div>

      {paraMimSemDia > 0 && visao !== "lixeira" && (
        <p className="rounded-campo bg-atencao-bg px-4 py-3 text-sm leading-[22px] font-medium text-tinta">
          {paraMimSemDia === 1 ? "1 pedido espera" : `${paraMimSemDia} pedidos esperam`} você escolher o dia. Arraste de &quot;A agendar&quot; para o dia em
          que consegue entregar.
        </p>
      )}

      {visao !== "lixeira" && (
        <details className="group rounded-xl border border-linha bg-white shadow-cartao">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-semibold text-tinta">
            Nova tarefa
            <span className="text-tinta-3 transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-linha px-5 py-4">
            <NovaTarefaForm
              key={filtro}
              socios={socios.map((s) => ({ id: s.id, nome: s.id === socio.id ? `${s.nome} (eu)` : s.nome }))}
              responsavelPadrao={filtro === "todos" ? socio.id : filtro}
              eu={socio.id}
              organizacoes={(orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name }))}
            />
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Visões" className="flex w-fit items-center gap-1 rounded-xl border border-linha bg-superficie p-1">
          {VISOES.map((v) => (
            <Link
              key={v.valor}
              href={link({ ver: v.valor })}
              aria-current={v.valor === visao ? "page" : undefined}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
                v.valor === visao ? "bg-white text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta"
              }`}
            >
              {v.rotulo}
            </Link>
          ))}
        </nav>
        {visao !== "lixeira" && (
          <nav aria-label="De quem" className="flex flex-wrap items-center gap-2">
            {[{ id: "todos", nome: "Todos" }, ...socios].map((s) => (
              <Link
                key={s.id}
                href={link({ de: s.id })}
                aria-current={filtro === s.id ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  filtro === s.id ? "bg-sincra text-white shadow-cartao" : "bg-azul-50 text-sincra-tinta hover:bg-azul-100"
                }`}
              >
                {s.id === socio.id ? `${s.nome} (eu)` : s.nome}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {vistoNome && filtro !== socio.id && visao === "semana" && (
        <p className="-mt-2 text-sm text-cinza">O &quot;+&quot; de cada dia vira pedido para {vistoNome}.</p>
      )}

      {visao === "lixeira" ? (
        <Lixeira
          itens={(lixo.data ?? []).map((t) => ({
            id: t.id,
            titulo: t.title,
            responsavel: (t.assignee_id && porId.get(t.assignee_id)?.nome) || "Sem responsável",
            apagadaPor: (t.deleted_by && porId.get(t.deleted_by)?.nome) || "um sócio",
            apagadaEm: t.deleted_at ? ddmm(diaSP(t.deleted_at)) : "",
          }))}
        />
      ) : (
        <QuadroSemana
          key={`${visao}-${segunda}-${filtro}`}
          visao={visao}
          segunda={segunda}
          hoje={hoje}
          cartoes={cartoes}
          eu={socio.id}
          paraQuem={filtro === "todos" ? socio.id : filtro}
          destaque={f.tarefa ?? null}
        />
      )}
    </main>
  );
}

export default function TarefasPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <TarefasConteudo searchParams={searchParams} />
    </Suspense>
  );
}
