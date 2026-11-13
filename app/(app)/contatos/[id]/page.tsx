import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoSecundario, classeCampo, Secao } from "@/components/campos";
import { desvincularOrganizacao, vincularOrganizacao } from "@/lib/actions/crm";
import { SelosRelacao } from "@/components/rede/SelosRelacao";
import { formatarDataCurta } from "@/lib/negocios";
import { NATUREZAS_LOCAL, rotuloTipoRelacao, VISOES, visaoDaPessoa } from "@/lib/relacionamento";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contato · Sincra" };

async function ContatoConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: p }, { data: orgs }] = await Promise.all([
    supabase
      .from("people")
      .select(
        "*, organization:organizations!people_organization_id_fkey(id, trade_name), deal_people(papel, deal:deals(id, title, status, stage:pipeline_stages(name))), pessoa_organizacoes(papel, organization:organizations(id, trade_name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
  ]);
  if (!p) notFound();
  const jaLigadas = new Set([p.organization_id, ...p.pessoa_organizacoes.map((v) => v.organization?.id)]);
  const paraLigar = (orgs ?? []).filter((o) => !jaLigadas.has(o.id));

  const visao = VISOES.find((v) => v.valor === visaoDaPessoa(p));
  const natureza = NATUREZAS_LOCAL.find((n) => n.valor === p.natureza_local)?.rotulo;
  const local = p.cidade || p.uf ? `${[p.cidade, p.uf].filter(Boolean).join("/")}${natureza ? ` · ${natureza}` : ""}` : null;

  const dados: [string, React.ReactNode][] = [
    [
      "Organização",
      p.organization ? (
        <Link href={`/organizacoes/${p.organization.id}`} className="font-semibold text-sincra-tinta">
          {p.organization.trade_name}
        </Link>
      ) : (
        "Sem organização"
      ),
    ],
    ["Cargo", p.role_title],
    ["Tipo de relação", rotuloTipoRelacao(p.relacao_tipo)],
    ["E-mail", p.email],
    ["Telefone", p.phone && <span className="tabular">{p.phone}</span>],
    ["Canal de contato", p.canal_contato],
    ["CRM", p.crm_number],
    ["Última interação", p.ultima_interacao && <span className="tabular">{formatarDataCurta(p.ultima_interacao)}</span>],
    ["Local", local ?? "Sem localização"],
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link href="/contatos" className="text-xs font-semibold text-sincra-tinta">
          Contatos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{p.full_name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <SelosRelacao profundidade={p.profundidade} prioridade={p.prioridade} situacao={p.situacao} pendente={p.confirmacao_pendente} />
              {visao && <span className="text-sm text-cinza">{visao.rotulo}</span>}
            </div>
          </div>
          <Link href={`/contatos/${p.id}/editar`} className={classeBotaoSecundario}>
            Editar
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Secao titulo="Dados">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {dados.map(([rotulo, valor]) => (
                <div key={rotulo} className="flex flex-col gap-0.5">
                  <dt className="text-xs leading-4 font-semibold text-cinza">{rotulo}</dt>
                  <dd className="text-sm leading-[22px] break-words text-tinta">{valor || <span className="text-cinza">—</span>}</dd>
                </div>
              ))}
            </dl>
          </Secao>

          <Secao titulo="Relacionamento">
            <dl className="flex flex-col gap-4 text-sm leading-[22px]">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold text-cinza">Próximo passo sugerido</dt>
                <dd className="text-tinta">{p.proximo_passo || <span className="text-cinza">—</span>}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold text-cinza">Motivo da classificação</dt>
                <dd className="whitespace-pre-line text-tinta-3">{p.motivo_classificacao || <span className="text-cinza">—</span>}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-semibold text-cinza">Fontes e evidências</dt>
                <dd className="break-words whitespace-pre-line text-tinta-3">{p.fontes || <span className="text-cinza">—</span>}</dd>
              </div>
              {p.notes && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-semibold text-cinza">Observações</dt>
                  <dd className="break-words whitespace-pre-line text-tinta-3">{p.notes}</dd>
                </div>
              )}
            </dl>
          </Secao>
        </div>

        <div className="flex flex-col gap-6">
        <Secao titulo="Outras organizações">
          {p.pessoa_organizacoes.length === 0 ? (
            <p className="text-sm leading-[22px] text-tinta-3">
              {p.organization ? "Só a organização principal." : "Nenhuma organização ligada."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {p.pessoa_organizacoes.map(
                (v) =>
                  v.organization && (
                    <li key={v.organization.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <Link href={`/organizacoes/${v.organization.id}`} className="text-sm font-semibold text-sincra-tinta">
                          {v.organization.trade_name}
                        </Link>
                        {v.papel && <span className="text-xs text-cinza">{v.papel}</span>}
                      </div>
                      <form action={desvincularOrganizacao}>
                        <input type="hidden" name="person_id" value={p.id} />
                        <input type="hidden" name="organization_id" value={v.organization.id} />
                        <button type="submit" className="text-xs font-semibold text-tinta-3 hover:text-critico">
                          Tirar
                        </button>
                      </form>
                    </li>
                  ),
              )}
            </ul>
          )}
          <form action={vincularOrganizacao} className="flex flex-col gap-2 border-t border-linha pt-4">
            <input type="hidden" name="person_id" value={p.id} />
            <select name="organization_id" required defaultValue="" aria-label="Organização" className={classeCampo}>
              <option value="" disabled>
                Ligar a outra organização
              </option>
              {paraLigar.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.trade_name}
                </option>
              ))}
            </select>
            <input name="papel" placeholder="Papel (opcional), ex.: sócio" aria-label="Papel" className={classeCampo} />
            <button type="submit" className={classeBotaoSecundario}>
              Ligar
            </button>
          </form>
        </Secao>

        <Secao titulo="Negócios">
          {p.deal_people.length === 0 ? (
            <p className="text-sm leading-[22px] text-tinta-3">
              Nenhum negócio ligado. Para ligar, abra o negócio e adicione esta pessoa em &quot;Pessoas no negócio&quot;.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {p.deal_people.map(
                (d) =>
                  d.deal && (
                    <li key={d.deal.id}>
                      <Link href={`/negocios/${d.deal.id}`} className="flex flex-col rounded-campo border border-azul-100 bg-azul-25 p-3 hover:bg-azul-50">
                        <span className="text-sm font-semibold text-tinta">{d.deal.title}</span>
                        <span className="text-xs text-cinza">
                          {[d.papel, d.deal.stage?.name].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                    </li>
                  ),
              )}
            </ul>
          )}
        </Secao>
        </div>
      </div>
    </main>
  );
}

export default function ContatoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <ContatoConteudo params={params} />
    </Suspense>
  );
}
