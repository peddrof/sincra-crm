import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { SelosRelacao } from "@/components/rede/SelosRelacao";
import { formatarDataCurta } from "@/lib/negocios";
import { PRIORIDADES, PROFUNDIDADES, rotuloTipoRelacao, SITUACOES, visaoDaPessoa, VISOES, type Visao } from "@/lib/relacionamento";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contatos · Sincra" };

type Filtros = { ver?: string; profundidade?: string; situacao?: string; prioridade?: string; org?: string; q?: string };

// Todas as pessoas (com ou sem organização), organizadas pela régua de relacionamento.
// "Fora da visão principal" é só filtro: nada é apagado.
async function ContatosConteudo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const ver = (VISOES.some((v) => v.valor === f.ver) ? f.ver : "principal") as Visao | "todas";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select(
      "id, full_name, role_title, phone, email, relacao_tipo, profundidade, situacao, prioridade, ultima_interacao, confirmacao_pendente, proximo_passo, canal_contato, organization:organizations!people_organization_id_fkey(id, trade_name), deal_people(count), pessoa_organizacoes(organization:organizations(trade_name))",
    )
    .order("full_name");
  if (error) console.error("[contatos] falha na lista:", error.message);

  const todas = (data ?? []).map((p) => ({ ...p, visao: visaoDaPessoa(p) }));
  const contagem = { principal: 0, revisao: 0, fora: 0, todas: todas.length } as Record<string, number>;
  for (const p of todas) contagem[p.visao]++;

  const termo = f.q?.trim().toLowerCase();
  const lista = todas.filter(
    (p) =>
      (ver === "todas" || p.visao === ver) &&
      (!f.profundidade || String(p.profundidade) === f.profundidade) &&
      (!f.situacao || p.situacao === f.situacao) &&
      (!f.prioridade || String(p.prioridade) === f.prioridade) &&
      (!f.org || (f.org === "sem" ? !p.organization : Boolean(p.organization))) &&
      (!termo || `${p.full_name} ${p.organization?.trade_name ?? ""} ${p.pessoa_organizacoes.map((v) => v.organization?.trade_name).join(" ")} ${p.role_title ?? ""}`.toLowerCase().includes(termo)),
  );

  // Na visão principal, agrupa por prioridade (P1 primeiro); nas demais, lista única.
  const grupos =
    ver === "principal"
      ? [
          ...PRIORIDADES.map((p) => ({ titulo: p.rotulo, itens: lista.filter((x) => x.prioridade === p.valor) })),
          { titulo: "Sem prioridade", itens: lista.filter((x) => x.prioridade === null) },
        ].filter((g) => g.itens.length > 0)
      : [{ titulo: "", itens: lista }];

  const manter = (extra: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v) as [string, string][]);
    return `/contatos?${q.toString()}`;
  };
  const filtrando = Boolean(f.profundidade || f.situacao || f.prioridade || f.org || f.q);
  const ajudaVisao = VISOES.find((v) => v.valor === ver)?.ajuda;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Rede</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Contatos</h1>
          <p className="text-base leading-6 font-medium text-tinta-3">
            Pessoas com e sem organização: médicos, gestores, parceiros, mentores e prestadores.
          </p>
        </div>
        <Link href="/contatos/novo" className={classeBotaoPrimario}>
          Nova pessoa
        </Link>
      </div>

      <nav aria-label="Visões" className="flex flex-wrap gap-2">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={manter({ ver: v.valor })}
            aria-current={ver === v.valor ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              ver === v.valor ? "bg-sincra text-white shadow-cartao" : "bg-azul-50 text-sincra-tinta hover:bg-azul-100"
            }`}
          >
            {v.rotulo}
            <span className={`tabular rounded-full px-1.5 text-xs ${ver === v.valor ? "bg-white text-sincra-tinta" : "bg-white/70"}`}>
              {contagem[v.valor]}
            </span>
          </Link>
        ))}
      </nav>
      {ajudaVisao && <p className="-mt-3 text-sm text-cinza">{ajudaVisao}</p>}

      <form className="grid gap-3 rounded-cartao border border-azul-100 bg-azul-25 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input type="hidden" name="ver" value={ver} />
        <input name="q" defaultValue={f.q} placeholder="Buscar nome, cargo ou organização" aria-label="Buscar" className={`${classeCampo} sm:col-span-3 lg:col-span-2`} />
        <select name="profundidade" defaultValue={f.profundidade ?? ""} aria-label="Profundidade" className={classeCampo}>
          <option value="">Profundidade</option>
          {PROFUNDIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <select name="situacao" defaultValue={f.situacao ?? ""} aria-label="Situação" className={classeCampo}>
          <option value="">Situação</option>
          {SITUACOES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
        <select name="prioridade" defaultValue={f.prioridade ?? ""} aria-label="Prioridade" className={classeCampo}>
          <option value="">Prioridade</option>
          {PRIORIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <select name="org" defaultValue={f.org ?? ""} aria-label="Organização" className={classeCampo}>
          <option value="">Com e sem organização</option>
          <option value="com">Com organização</option>
          <option value="sem">Sem organização</option>
        </select>
        <div className="flex gap-2 sm:col-span-3 lg:col-span-6">
          <button type="submit" className={classeBotaoSecundario}>
            Filtrar
          </button>
          {filtrando && (
            <Link href={`/contatos?ver=${ver}`} className="self-center text-sm font-semibold text-sincra-tinta">
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-cartao border border-dashed border-azul-200 p-8 text-center text-sm text-cinza">Ninguém nesta visão com estes filtros.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.titulo || "lista"} className="flex flex-col gap-2">
            {g.titulo && (
              <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta">
                <span aria-hidden className="h-4 w-1 rounded-full bg-sincra" />
                {g.titulo}
                <span className="tabular text-cinza">({g.itens.length})</span>
              </h2>
            )}
            <ul className="flex flex-col divide-y divide-linha overflow-hidden rounded-cartao border border-linha bg-white shadow-cartao">
              {g.itens.map((p) => (
                <li key={p.id} className="relative flex flex-col gap-1.5 px-4 py-3 hover:bg-azul-25 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/contatos/${p.id}`} className="font-semibold text-tinta after:absolute after:inset-0 hover:text-sincra-tinta">
                      {p.full_name}
                    </Link>
                    <span className="truncate text-xs text-cinza">
                      {[
                        p.role_title,
                        [p.organization?.trade_name, ...p.pessoa_organizacoes.map((v) => v.organization?.trade_name)].filter(Boolean).join(", ") ||
                          "Sem organização",
                        rotuloTipoRelacao(p.relacao_tipo),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {p.proximo_passo && <span className="line-clamp-1 text-xs text-tinta-3">Próximo passo: {p.proximo_passo}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <SelosRelacao profundidade={p.profundidade} prioridade={p.prioridade} situacao={p.situacao} pendente={p.confirmacao_pendente} />
                    {p.ultima_interacao && <span className="tabular text-xs text-cinza">{formatarDataCurta(p.ultima_interacao)}</span>}
                    {(p.deal_people[0]?.count ?? 0) > 0 && (
                      <span className="rounded-full bg-azul-50 px-2 py-0.5 text-xs font-semibold text-sincra-tinta">
                        {p.deal_people[0].count} {p.deal_people[0].count === 1 ? "negócio" : "negócios"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

export default function ContatosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <ContatosConteudo searchParams={searchParams} />
    </Suspense>
  );
}
