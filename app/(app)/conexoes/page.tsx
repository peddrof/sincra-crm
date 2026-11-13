import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { COR_SITUACAO, COR_TIPO } from "@/lib/cores-rede";
import { formatarData } from "@/lib/crm";
import { formatarReais, formatarReaisCompacto } from "@/lib/negocios";
import { carregarRede, ROTULO_SITUACAO } from "@/lib/rede-dados";
import { rotuloPrioridade, rotuloProfundidade, rotuloSituacao, rotuloTipoRelacao } from "@/lib/relacionamento";
import { createClient } from "@/lib/supabase/server";
import { Grafo, type Ligacao, type No } from "./Grafo";

export const metadata: Metadata = { title: "Conexões · Sincra" };

const STATUS_NEGOCIO: Record<string, string> = { aberto: "Em aberto", ganho: "Ganho", perdido: "Perdido" };

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

async function ConexoesConteudo() {
  const supabase = await createClient();
  const rede = await carregarRede(supabase);
  const nomeOrg = new Map(rede.organizacoes.map((o) => [o.id, o.nome]));

  const abertos = rede.negocios.filter((n) => n.status === "aberto");
  const valorAberto = abertos.reduce((s, n) => s + (n.amount_estimate_cents ?? 0), 0);
  const estados = new Set(rede.organizacoes.map((o) => o.uf).filter(Boolean));
  const operando = rede.organizacoes.filter((o) => o.situacao === "operando").length;

  // Organizações por número de ligações (pessoas + negócios).
  const ligacoesOrg = new Map(rede.organizacoes.map((o) => [o.id, 0]));
  for (const p of rede.pessoas) if (p.organization_id) ligacoesOrg.set(p.organization_id, (ligacoesOrg.get(p.organization_id) ?? 0) + 1);
  for (const n of rede.negocios) ligacoesOrg.set(n.organization_id, (ligacoesOrg.get(n.organization_id) ?? 0) + 1);

  const nos: No[] = [
    {
      id: "sincra",
      nome: "Sincra",
      grupo: "sincra",
      href: "/",
      subtitulo: "Centro da rede",
      info: [
        ["Organizações", String(rede.organizacoes.length)],
        ["Pessoas", String(rede.pessoas.length)],
        ["Negócios em aberto", String(abertos.length)],
        ["Em operação", String(operando)],
        ["Estados", String(estados.size)],
      ],
    },
    ...rede.organizacoes.map(
      (o): No => ({
        id: `o:${o.id}`,
        nome: o.nome,
        grupo: "organizacao",
        tipo: o.tipo,
        href: `/organizacoes/${o.id}`,
        subtitulo: o.tipoRotulo,
        info: [
          ["Local", o.cidade ? `${o.cidade}/${o.uf}` : (o.uf ?? "Sem cidade")],
          ["Situação", ROTULO_SITUACAO[o.situacao]],
          ["Pessoas", String(o.pessoas)],
          ["Negócios", String(rede.negocios.filter((n) => n.organization_id === o.id).length)],
          ["Última atividade", formatarData(o.ultimaAtividade)],
          ...(o.negocioAberto ? [["Negócio aberto", o.negocioAberto] as [string, string]] : []),
        ],
      }),
    ),
    ...rede.pessoas.map(
      (p): No => ({
        id: `p:${p.id}`,
        nome: p.full_name,
        grupo: "pessoa",
        href: `/contatos/${p.id}`,
        subtitulo: [p.role_title, rotuloTipoRelacao(p.relacao_tipo)].filter(Boolean).join(" · ") || "Pessoa",
        profundidade: p.profundidade,
        visao: p.visao,
        info: [
          ["Organização", p.organizacao ?? "Sem organização"],
          ["Profundidade", rotuloProfundidade(p.profundidade) ?? "Sem classificação"],
          ["Situação", rotuloSituacao(p.situacao)?.rotulo ?? "—"],
          ["Prioridade", rotuloPrioridade(p.prioridade) ?? "—"],
          ...(p.ultima_interacao ? [["Última interação", formatarData(p.ultima_interacao)] as [string, string]] : []),
          ...(p.confirmacao_pendente ? [["Atenção", "Confirmação pendente"] as [string, string]] : []),
          ...(p.proximo_passo ? [["Próximo passo", p.proximo_passo] as [string, string]] : []),
        ],
      }),
    ),
    ...rede.negocios.map(
      (n): No => ({
        id: `n:${n.id}`,
        nome: n.title,
        grupo: "negocio",
        href: `/negocios/${n.id}`,
        subtitulo: "Negócio",
        info: [
          ["Situação", STATUS_NEGOCIO[n.status] ?? n.status],
          ["Etapa", n.stage?.name ?? "—"],
          ["Valor", n.amount_estimate_cents ? `R$ ${formatarReais(n.amount_estimate_cents)}` : "—"],
          ["Organização", nomeOrg.get(n.organization_id) ?? "—"],
        ],
      }),
    ),
  ];
  const ids = new Set(nos.map((n) => n.id));
  // Tudo se liga à Sincra (nunca a um sócio): organizações direto; pessoas e negócios pela organização deles.
  const ligacoes: Ligacao[] = [
    ...rede.organizacoes.map((o) => ({ source: "sincra", target: `o:${o.id}` })),
    // Pessoa ligada a cada organização dela (principal + vínculos adicionais); sem organização, à Sincra.
    ...rede.pessoas.flatMap((p) =>
      p.organizacoesIds.length ? p.organizacoesIds.map((o) => ({ source: `p:${p.id}`, target: `o:${o}` })) : [{ source: `p:${p.id}`, target: "sincra" }],
    ),
    ...rede.negocios.map((n) => ({ source: `n:${n.id}`, target: `o:${n.organization_id}` })),
    // Pessoas ligadas a negócios (médicas ou não).
    ...rede.ligacoesNegocio.map((l) => ({ source: `p:${l.person_id}`, target: `n:${l.deal_id}` })),
  ].filter((l) => ids.has(l.source) && ids.has(l.target));

  const indicadores = [
    { rotulo: "Organizações", valor: String(rede.organizacoes.length), destaque: true },
    { rotulo: "Pessoas na visão principal", valor: String(rede.pessoas.filter((p) => p.visao === "principal").length) },
    { rotulo: "Negócios em aberto", valor: String(abertos.length) },
    { rotulo: "Valor em negociação", valor: valorAberto ? formatarReaisCompacto(valorAberto) : "0", prefixo: "R$" },
    { rotulo: "Em operação", valor: String(operando) },
    { rotulo: "Estados", valor: String(estados.size) },
  ];

  const porTipo = Object.entries(COR_TIPO)
    .map(([k, v]) => ({ ...v, chave: k, qtd: rede.organizacoes.filter((o) => o.tipo === k).length }))
    .filter((t) => t.qtd > 0);
  const porSituacao = Object.entries(COR_SITUACAO).map(([k, v]) => ({
    ...v,
    chave: k,
    qtd: rede.organizacoes.filter((o) => o.situacao === k).length,
  }));
  const maisLigadas = [...rede.organizacoes]
    .map((o) => ({ ...o, ligacoes: ligacoesOrg.get(o.id) ?? 0 }))
    .filter((o) => o.ligacoes > 0)
    .sort((a, b) => b.ligacoes - a.ligacoes)
    .slice(0, 5);
  const semContato = rede.organizacoes.filter((o) => o.pessoas === 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Rede</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Conexões</h1>
        <p className="text-base leading-6 font-medium text-tinta-3">Como a rede da Sincra se liga: organizações, pessoas e negócios.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {indicadores.map((c) => (
          <div
            key={c.rotulo}
            className={`flex flex-col gap-1 rounded-cartao p-4 shadow-cartao ${c.destaque ? "bg-sincra text-white" : "border border-azul-100 bg-azul-50"}`}
          >
            <span className={`text-xs font-semibold ${c.destaque ? "text-white/85" : "text-sincra-tinta"}`}>{c.rotulo}</span>
            <span className={`tabular text-2xl leading-8 font-semibold tracking-[-0.02em] ${c.destaque ? "text-white" : "text-tinta"}`}>
              {c.prefixo && <span className="mr-1 text-sm font-medium text-cinza">{c.prefixo}</span>}
              {c.valor}
            </span>
          </div>
        ))}
      </div>

      <Grafo nos={nos} ligacoes={ligacoes}>
        <section className="flex flex-col gap-3 rounded-cartao border border-linha bg-white p-4 shadow-cartao">
          <h2 className="text-sm font-semibold text-tinta">Por tipo</h2>
          {porTipo.length === 0 && <p className="text-sm text-cinza">Nenhuma organização ainda.</p>}
          <Barras itens={porTipo} total={rede.organizacoes.length} />
        </section>

        <section className="flex flex-col gap-3 rounded-cartao border border-linha bg-white p-4 shadow-cartao">
          <h2 className="text-sm font-semibold text-tinta">Por situação</h2>
          <Barras itens={porSituacao} total={rede.organizacoes.length} />
        </section>

        <section className="flex flex-col gap-2 rounded-cartao border border-azul-100 bg-azul-25 p-4">
          <h2 className="text-sm font-semibold text-tinta">Mais conectadas</h2>
          {maisLigadas.length === 0 ? (
            <p className="text-sm text-cinza">Nenhuma organização com pessoas ou negócios ainda.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {maisLigadas.map((o, i) => (
                <li key={o.id}>
                  <Link href={`/organizacoes/${o.id}`} className="flex items-center gap-2 rounded-campo px-1.5 py-1 text-sm hover:bg-white">
                    <span className="tabular w-4 text-xs font-semibold text-sincra-tinta">{i + 1}</span>
                    <span className="truncate text-tinta">{o.nome}</span>
                    <span className="tabular ml-auto shrink-0 text-xs text-cinza">{plural(o.ligacoes, "ligação", "ligações")}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-cartao border border-linha bg-white p-4 shadow-cartao">
          <h2 className="text-sm font-semibold text-tinta">Sem pessoa de contato</h2>
          {semContato.length === 0 ? (
            <p className="text-sm text-cinza">Todas as organizações têm alguém cadastrado.</p>
          ) : (
            <>
              <p className="text-sm text-tinta-3">
                {plural(semContato.length, "organização ainda não tem", "organizações ainda não têm")} pessoa cadastrada.
              </p>
              <ul className="flex flex-col gap-0.5">
                {semContato.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <Link href={`/organizacoes/${o.id}`} className="text-sm font-semibold text-sincra-tinta hover:underline">
                      {o.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </Grafo>
    </main>
  );
}

// Barras horizontais com nome e quantidade sempre visíveis (a cor nunca fala sozinha).
function Barras({ itens, total }: { itens: { chave: string; rotulo: string; cor: string; qtd: number }[]; total: number }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {itens.map((t) => (
        <li key={t.chave} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-tinta">
              <span className="size-2.5 rounded-full" style={{ background: t.cor }} />
              {t.rotulo}
            </span>
            <span className="tabular text-xs font-semibold text-tinta-3">{t.qtd}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-azul-50">
            <div className="h-full rounded-full" style={{ width: `${total ? (t.qtd / total) * 100 : 0}%`, background: t.cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ConexoesPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <ConexoesConteudo />
    </Suspense>
  );
}
