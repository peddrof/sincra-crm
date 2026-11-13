import Link from "next/link";
import { Suspense } from "react";
import { Alertas } from "@/components/Alertas";
import { MapaBrasil } from "@/components/rede/MapaBrasil";
import { classeBotaoSecundario } from "@/components/campos";
import { StatusPill, type StatusTipo } from "@/components/StatusPill";
import { ListaTarefas } from "@/components/tarefas/ListaTarefas";
import { getSocio } from "@/lib/auth";
import { formatarDataHora, nomeCurto } from "@/lib/crm";
import { hojeIso, isoHorasAtras } from "@/lib/datas";
import { listarFaltantes, resumoLista } from "@/lib/documentos";
import { formatarReaisCompacto } from "@/lib/negocios";
import { carregarRede } from "@/lib/rede-dados";
import { rotuloContexto } from "@/lib/reunioes";
import { createClient } from "@/lib/supabase/server";

// Página inicial (docs/04): indicadores, alertas, minhas tarefas, próximas reuniões, últimas atualizações,
// documentos em aberto e o mapa da rede no Brasil. Visual mais azul a pedido do Felipe (11/11/2026), com um único céu (brandbook).

const etapas: { nome: string; tipo: StatusTipo; status: string }[] = [
  { nome: "Autenticação", tipo: "concluido", status: "Pronto" },
  { nome: "Organizações e pessoas", tipo: "andamento", status: "Em teste" },
  { nome: "Feed de atualizações", tipo: "andamento", status: "Em teste" },
  { nome: "Negócios e funil", tipo: "andamento", status: "Em teste" },
  { nome: "Tarefas", tipo: "andamento", status: "Em teste" },
  { nome: "Documentos", tipo: "andamento", status: "Em teste" },
  { nome: "Contratos", tipo: "atencao", status: "Aguarda modelo" },
  { nome: "Alertas de follow-up", tipo: "andamento", status: "Em teste" },
  { nome: "Reuniões com IA local", tipo: "andamento", status: "Em teste" },
  { nome: "Drive (pasta sincronizada)", tipo: "andamento", status: "Em teste" },
  { nome: "Mapas", tipo: "andamento", status: "Em teste" },
];

const cartao = "flex flex-col gap-4 rounded-cartao border border-linha bg-white p-6 shadow-cartao";
const carregando = <p className="text-sm text-cinza">Carregando…</p>;

function Cabecalho({ titulo, href, rotulo }: { titulo: string; href: string; rotulo: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg leading-6 font-semibold tracking-[-0.015em]">
        <span aria-hidden className="h-4 w-1 rounded-full bg-sincra" />
        {titulo}
      </h2>
      <Link href={href} className="text-sm font-semibold text-sincra-tinta">
        {rotulo}
      </Link>
    </div>
  );
}

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section
        className="relative overflow-hidden rounded-cartao-lg px-6 pt-16 pb-6 shadow-destaque sm:px-8"
        style={{ background: "var(--sincra-ceu)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 10% 0%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 45%)" }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-sincra-tinta">Plataforma interna da Sincra</p>
            <Suspense fallback={<h1 className="text-[32px] leading-10 font-semibold tracking-[-0.02em] text-white">Olá</h1>}>
              <Saudacao />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/negocios" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-sincra-tinta shadow-cartao hover:bg-azul-25">
              Ver funil
            </Link>
            <Link href="/reunioes/agendar" className="rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-2">
              Agendar reunião
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-24" />}>
        <Indicadores />
      </Suspense>

      <section className={cartao}>
        <Cabecalho titulo="Presença no Brasil" href="/conexoes" rotulo="Ver conexões" />
        <Suspense fallback={<div className="h-[420px] rounded-cartao bg-azul-25" />}>
          <MapaDaRede />
        </Suspense>
      </section>

      <section className={cartao}>
        <Cabecalho titulo="Atenção" href="/feed?tipo=alertas" rotulo="Ver no feed" />
        <Suspense fallback={carregando}>
          <AlertasDoSocio />
        </Suspense>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={cartao}>
          <Cabecalho titulo="Minhas tarefas" href="/tarefas" rotulo="Abrir tarefas" />
          <Suspense fallback={carregando}>
            <MinhasTarefas />
          </Suspense>
        </section>

        <section className={cartao}>
          <Cabecalho titulo="Próximas reuniões" href="/reunioes" rotulo="Abrir reuniões" />
          <Suspense fallback={carregando}>
            <ProximasReunioes />
          </Suspense>
        </section>

        <section className={cartao}>
          <Cabecalho titulo="Últimas atualizações" href="/feed" rotulo="Abrir feed" />
          <Suspense fallback={carregando}>
            <UltimasAtualizacoes />
          </Suspense>
        </section>

        <section className={cartao}>
          <Cabecalho titulo="Documentos em aberto" href="/documentos" rotulo="Abrir documentos" />
          <Suspense fallback={carregando}>
            <DocumentosEmAberto />
          </Suspense>
        </section>
      </div>

      <details className="rounded-cartao bg-azul-25 p-6">
        <summary className="cursor-pointer text-lg leading-6 font-semibold tracking-[-0.015em] text-sincra-tinta">Andamento da plataforma</summary>
        <ol className="grid gap-3 pt-4 sm:grid-cols-2">
          {etapas.map((etapa, i) => (
            <li key={etapa.nome} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-sm leading-[22px] text-tinta-3">
                <span className="tabular w-5 text-right font-semibold text-sincra-tinta">{i + 1}</span>
                {etapa.nome}
              </span>
              <StatusPill tipo={etapa.tipo}>{etapa.status}</StatusPill>
            </li>
          ))}
        </ol>
      </details>
    </main>
  );
}

async function Saudacao() {
  const socio = await getSocio();
  const primeiroNome = (socio.apelido ?? socio.nome).split(" ")[0];
  return <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.02em] text-white">Olá, {primeiroNome}</h1>;
}

async function Indicadores() {
  const supabase = await createClient();
  const hoje = hojeIso();
  const [{ data: negocios }, { data: itens }, { count: atrasadas }] = await Promise.all([
    supabase.from("deals").select("amount_estimate_cents").eq("status", "aberto"),
    supabase.from("document_request_items").select("id").eq("required", true).in("status", ["pendente", "rejeitado"]),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "aberta").lt("due_date", hoje),
  ]);
  const valor = (negocios ?? []).reduce((s, n) => s + (n.amount_estimate_cents ?? 0), 0);
  const cards = [
    { rotulo: "Negócios abertos", valor: String(negocios?.length ?? 0), href: "/negocios", destaque: true },
    { rotulo: "Valor em negociação", valor: valor ? formatarReaisCompacto(valor) : "0", prefixo: "R$", href: "/negocios", destaque: false },
    { rotulo: "Documentos pendentes", valor: String(itens?.length ?? 0), href: "/documentos", destaque: false },
    { rotulo: "Tarefas atrasadas", valor: String(atrasadas ?? 0), href: "/tarefas?ver=abertas", destaque: false, alerta: (atrasadas ?? 0) > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.rotulo}
          href={c.href}
          className={`flex flex-col gap-1 rounded-cartao p-5 shadow-cartao transition-transform hover:-translate-y-0.5 ${
            c.destaque ? "bg-sincra text-white" : "border border-azul-100 bg-azul-50"
          }`}
        >
          <span className={`text-xs font-semibold ${c.destaque ? "text-white/85" : "text-sincra-tinta"}`}>{c.rotulo}</span>
          <span
            className={`tabular text-[28px] leading-9 font-semibold tracking-[-0.025em] ${
              c.destaque ? "text-white" : c.alerta ? "text-critico" : "text-tinta"
            }`}
          >
            {c.prefixo && <span className="mr-1 text-base font-medium text-cinza">{c.prefixo}</span>}
            {c.valor}
          </span>
        </Link>
      ))}
    </div>
  );
}

// Organizações no mapa, coloridas por tipo ou situação; clique mostra os detalhes.
async function MapaDaRede() {
  const supabase = await createClient();
  const { organizacoes, pessoas } = await carregarRede(supabase);
  const estados = new Set(organizacoes.map((o) => o.uf).filter(Boolean)).size;
  return (
    <div className="flex flex-col gap-3">
      <p className="tabular text-sm text-tinta-3">
        {organizacoes.length} {organizacoes.length === 1 ? "organização" : "organizações"} em {estados} {estados === 1 ? "estado" : "estados"}.
      </p>
      <MapaBrasil
        pontos={organizacoes.map((o) => ({
          id: o.id,
          nome: o.nome,
          tipo: o.tipo,
          tipoRotulo: o.tipoRotulo,
          cidade: o.cidade,
          uf: o.uf,
          lat: o.lat,
          lng: o.lng,
          responsavel: o.responsavel,
          situacao: o.situacao,
          negocioAberto: o.negocioAberto,
          pessoas: o.pessoas,
          notas: o.notas,
        }))}
        pessoas={pessoas.map((p) => ({
          id: p.id,
          nome: p.full_name,
          organizacao: p.organizacao,
          cargo: p.role_title,
          profundidade: p.profundidade,
          situacao: p.situacao,
          prioridade: p.prioridade,
          visao: p.visao,
          cidade: p.cidade,
          uf: p.uf,
          natureza: p.natureza_local,
          lat: p.lat,
          lng: p.lng,
          proximoPasso: p.proximo_passo,
        }))}
      />
    </div>
  );
}

async function AlertasDoSocio() {
  const socio = await getSocio();
  return <Alertas somenteDe={socio.id} />;
}

async function MinhasTarefas() {
  const socio = await getSocio();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, assignee:profiles!tasks_assignee_id_fkey(full_name, nickname), deal:deals(id, title), organization:organizations(id, trade_name)")
    .eq("assignee_id", socio.id)
    .eq("status", "aberta")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(6);

  return (
    <ListaTarefas
      tarefas={(data ?? []).map((t) => ({
        id: t.id,
        titulo: t.title,
        status: t.status,
        prazo: t.due_date,
        responsavel: nomeCurto(t.assignee),
        contexto: t.deal
          ? { rotulo: t.deal.title, href: `/negocios/${t.deal.id}` }
          : t.organization
            ? { rotulo: t.organization.trade_name, href: `/organizacoes/${t.organization.id}` }
            : null,
      }))}
      vazio="Nenhuma tarefa aberta com você."
    />
  );
}

// Reuniões agendadas na plataforma (a agenda do Google está desligada).
async function ProximasReunioes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interactions")
    .select("id, title, contexto, occurred_at, local, organization:organizations(trade_name)")
    .eq("type", "reuniao")
    .eq("status", "agendada")
    .gte("occurred_at", isoHorasAtras(2))
    .order("occurred_at")
    .limit(5);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm leading-[22px] text-tinta-3">Nenhuma reunião agendada.</p>
        <Link href="/reunioes/agendar" className={classeBotaoSecundario}>
          Agendar reunião
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {data.map((r) => (
        <li key={r.id}>
          <Link href={`/reunioes/${r.id}`} className="flex items-center gap-3 rounded-campo border border-azul-100 bg-azul-25 p-3 hover:bg-azul-50">
            <span className="tabular shrink-0 rounded-campo bg-sincra px-2.5 py-1.5 text-center text-xs leading-4 font-semibold text-white">
              {formatarDataHora(r.occurred_at)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-tinta">{r.title ?? "Reunião"}</span>
              <span className="truncate text-xs text-cinza">
                {rotuloContexto(r.contexto, r.organization?.trade_name)}
                {r.local && ` · ${r.local}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Não lidas primeiro, depois as mais recentes.
async function UltimasAtualizacoes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_eventos")
    .select("id, summary, created_at, lido")
    .order("lido", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(6);

  if (!data || data.length === 0) {
    return <p className="text-sm leading-[22px] text-tinta-3">Nenhuma atualização ainda.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-linha">
      {data.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex gap-2">
            <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${e.lido ? "bg-azul-100" : "bg-sincra"}`} />
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm leading-[22px] ${e.lido ? "text-tinta-3" : "font-semibold text-tinta"}`}>{e.summary}</span>
              {e.created_at && <span className="tabular text-xs leading-4 text-cinza">{formatarDataHora(e.created_at)}</span>}
            </div>
          </div>
          {!e.lido && <StatusPill tipo="andamento">Não lido</StatusPill>}
        </li>
      ))}
    </ul>
  );
}

async function DocumentosEmAberto() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_requests")
    .select("id, name, organization:organizations(id, trade_name), document_request_items(title, status, required)")
    .order("created_at", { ascending: false })
    .limit(30);

  const abertas = (data ?? [])
    .map((l) => ({ ...l, resumo: resumoLista(l.document_request_items ?? []) }))
    .filter((l) => l.resumo.faltam.length > 0 || l.document_request_items?.some((i) => i.status === "recebido"))
    .slice(0, 5);

  if (abertas.length === 0) {
    return <p className="text-sm leading-[22px] text-tinta-3">Nenhuma lista com documento faltando.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {abertas.map((l) => {
        const pct = l.resumo.total ? Math.round((l.resumo.recebidos / l.resumo.total) * 100) : 0;
        return (
          <li key={l.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/organizacoes/${l.organization?.id}/documentos/${l.id}`}
                className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta"
              >
                {l.organization?.trade_name}
              </Link>
              <span className="tabular text-xs font-semibold text-sincra-tinta">
                {l.resumo.recebidos} de {l.resumo.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-azul-50" role="img" aria-label={`${pct}% recebidos`}>
              <div className="h-full rounded-full bg-sincra" style={{ width: `${pct}%` }} />
            </div>
            {l.resumo.faltam.length > 0 && <span className="text-xs text-cinza">Faltam {listarFaltantes(l.resumo.faltam, 2)}.</span>}
          </li>
        );
      })}
    </ul>
  );
}
