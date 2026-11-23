import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoPrimario, classeBotaoSecundario, classeCampo, Secao } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { ListaTarefas } from "@/components/tarefas/ListaTarefas";
import { NovaTarefaForm } from "@/components/tarefas/NovaTarefaForm";
import { desvincularPessoa, mudarEtapa, vincularPessoa } from "@/lib/actions/negocios";
import { SelosRelacao } from "@/components/rede/SelosRelacao";
import { getSocio } from "@/lib/auth";
import { formatarDataHora, nomeCurto } from "@/lib/crm";
import { chaveTaxaPadrao, formatarDataCurta, formatarReais, formatarTaxa, valorDaConfiguracao } from "@/lib/negocios";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Negócio · Sincra" };

const statusNegocio = {
  aberto: { tipo: "andamento", rotulo: "Aberto" },
  ganho: { tipo: "concluido", rotulo: "Operando" },
  perdido: { tipo: "neutro", rotulo: "Perdido" },
} as const;

async function NegocioConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const socio = await getSocio();
  const supabase = await createClient();

  const { data: n } = await supabase
    .from("deals")
    .select(
      "*, owner:profiles!deals_owner_id_fkey(full_name, nickname), organization:organizations(id, trade_name), pipeline:pipelines(key, name), stage:pipeline_stages(key, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!n || !n.organization || !n.pipeline || !n.stage) notFound();

  const [{ data: etapas }, { data: tarefas }, { data: eventos }, { data: listas }, { data: socios }, { data: config }, { data: ligadas }, { data: pessoas }] =
    await Promise.all([
      supabase.from("pipeline_stages").select("id, name").eq("pipeline_id", n.pipeline_id).order("position"),
      supabase
        .from("tasks")
        .select("id, title, status, due_date, assignee:profiles!tasks_assignee_id_fkey(full_name, nickname)")
        .eq("deal_id", id)
        .is("deleted_at", null)
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("activity_events")
        .select("id, summary, created_at")
        .eq("entity_type", "deals")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("document_requests").select("id, name, created_at").eq("deal_id", id).order("created_at"),
      supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
      supabase.from("settings").select("value").eq("key", chaveTaxaPadrao(n.pipeline.key)).maybeSingle(),
      supabase
        .from("deal_people")
        .select("papel, person:people(id, full_name, role_title, crm_number, profundidade, prioridade, situacao, confirmacao_pendente, organization:organizations!people_organization_id_fkey(trade_name))")
        .eq("deal_id", id)
        .order("created_at"),
      supabase
        .from("people")
        .select("id, full_name, organization_id, organization:organizations!people_organization_id_fkey(trade_name), pessoa_organizacoes(organization_id)")
        .order("full_name"),
    ]);

  // Pessoas para ligar: primeiro as da organização do negócio, depois as demais (médicas ou não, com ou sem organização).
  const jaLigadas = new Set((ligadas ?? []).map((l) => l.person?.id));
  const disponiveis = (pessoas ?? []).filter((p) => !jaLigadas.has(p.id));
  const daOrg = (p: (typeof disponiveis)[number]) =>
    p.organization_id === n.organization_id || p.pessoa_organizacoes.some((v) => v.organization_id === n.organization_id);
  const daOrganizacao = disponiveis.filter(daOrg);
  const outras = disponiveis.filter((p) => !daOrg(p));

  const taxaPadrao = valorDaConfiguracao(config?.value);
  const status = statusNegocio[n.status];
  const emDocumentos = n.stage.key === "documentos";

  const dados: { rotulo: string; valor: React.ReactNode }[] = [
    {
      rotulo: "Organização",
      valor: (
        <Link href={`/organizacoes/${n.organization.id}`} className="font-semibold text-sincra-tinta">
          {n.organization.trade_name}
        </Link>
      ),
    },
    { rotulo: "Funil", valor: n.pipeline.name },
    { rotulo: "Responsável", valor: nomeCurto(n.owner) },
    {
      rotulo: "Taxa",
      valor:
        n.rate_percent !== null ? (
          <span className="tabular">{formatarTaxa(n.rate_percent)}</span>
        ) : taxaPadrao !== null ? (
          <span className="tabular">
            {formatarTaxa(taxaPadrao)} <span className="text-cinza">(padrão do funil)</span>
          </span>
        ) : null,
    },
    {
      rotulo: "Valor estimado",
      valor:
        n.amount_estimate_cents !== null ? (
          <span className="tabular text-base font-semibold tracking-[-0.025em] text-tinta">
            <span className="font-medium text-cinza">R$</span> {formatarReais(n.amount_estimate_cents)}
          </span>
        ) : null,
    },
    { rotulo: "Previsão de fechamento", valor: n.expected_close_date ? <span className="tabular">{formatarDataCurta(n.expected_close_date)}</span> : null },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link href={`/negocios?funil=${n.pipeline.key}`} className="text-xs font-semibold text-sincra-tinta">
          Negócios · {n.pipeline.name}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{n.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tipo={status.tipo}>{status.rotulo}</StatusPill>
              <span className="text-sm text-cinza">Etapa: {n.stage.name}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/reunioes/agendar?org=${n.organization.id}&negocio=${n.id}`} className={classeBotaoPrimario}>
              Agendar reunião
            </Link>
            <Link href={`/negocios/${n.id}/editar`} className={classeBotaoSecundario}>
              Editar dados
            </Link>
          </div>
        </div>
      </div>

      {emDocumentos && (listas?.length ?? 0) === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-cartao bg-andamento-bg p-4">
          <p className="text-sm leading-[22px] text-tinta">
            Este negócio está na etapa Documentos e ainda não tem lista de documentos.
          </p>
          <Link
            href={`/organizacoes/${n.organization.id}/documentos/nova?negocio=${n.id}`}
            className="text-sm font-semibold text-sincra-tinta"
          >
            Abrir lista de documentos
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Secao titulo="Dados">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {dados.map((d) => (
                <div key={d.rotulo} className="flex flex-col gap-0.5">
                  <dt className="text-xs leading-4 font-semibold text-cinza">{d.rotulo}</dt>
                  <dd className="text-sm leading-[22px] text-tinta">{d.valor ?? <span className="text-cinza">—</span>}</dd>
                </div>
              ))}
            </dl>
            {n.notes && <p className="border-t border-linha pt-4 text-sm leading-[22px] whitespace-pre-line text-tinta-3">{n.notes}</p>}
            <form action={mudarEtapa} className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
              <input type="hidden" name="deal_id" value={n.id} />
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Mover para a etapa
                <select name="stage_id" defaultValue={n.stage_id} className={`${classeCampo} w-56`}>
                  {etapas?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={classeBotaoSecundario}>
                Mover
              </button>
            </form>
          </Secao>

          <Secao titulo="Pessoas no negócio">
            {(ligadas?.length ?? 0) > 0 ? (
              <ul className="flex flex-col divide-y divide-linha">
                {ligadas!.map(
                  (l) =>
                    l.person && (
                      <li key={l.person.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
                        <div className="flex min-w-0 flex-col">
                          <Link href={`/contatos/${l.person.id}`} className="text-sm font-semibold text-tinta hover:text-sincra-tinta">
                            {l.person.full_name}
                          </Link>
                          <span className="text-xs text-cinza">
                            {[l.papel, l.person.role_title, l.person.organization?.trade_name ?? "Sem organização", l.person.crm_number && `CRM ${l.person.crm_number}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SelosRelacao
                            profundidade={l.person.profundidade}
                            prioridade={l.person.prioridade}
                            situacao={l.person.situacao}
                            pendente={l.person.confirmacao_pendente}
                          />
                          <form action={desvincularPessoa}>
                            <input type="hidden" name="deal_id" value={n.id} />
                            <input type="hidden" name="person_id" value={l.person.id} />
                            <button type="submit" className="text-xs font-semibold text-tinta-3 hover:text-critico">
                              Tirar
                            </button>
                          </form>
                        </div>
                      </li>
                    ),
                )}
              </ul>
            ) : (
              <p className="text-sm leading-[22px] text-tinta-3">Ninguém ligado ainda. Pode ser médico, gestor, parceiro ou contato avulso.</p>
            )}
            <form action={vincularPessoa} className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
              <input type="hidden" name="deal_id" value={n.id} />
              <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Pessoa
                <select name="person_id" required defaultValue="" className={classeCampo}>
                  <option value="" disabled>
                    Escolha uma pessoa
                  </option>
                  {daOrganizacao.length > 0 && (
                    <optgroup label={n.organization.trade_name}>
                      {daOrganizacao.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Outras pessoas">
                    {outras.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                        {p.organization ? ` · ${p.organization.trade_name}` : " · sem organização"}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="flex w-48 flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Papel no negócio
                <input name="papel" placeholder="Ex.: decisor, advogado do fundo" className={classeCampo} />
              </label>
              <button type="submit" className={classeBotaoSecundario}>
                Adicionar
              </button>
            </form>
            <Link href="/contatos/novo" className="text-xs font-semibold text-sincra-tinta">
              Cadastrar pessoa nova
            </Link>
          </Secao>

          <Secao titulo="Tarefas">
            <NovaTarefaForm
              socios={(socios ?? []).map((s) => ({ id: s.id, nome: nomeCurto(s) }))}
              responsavelPadrao={n.owner_id ?? socio.id}
              eu={socio.id}
              organizacaoId={n.organization.id}
              negocioId={n.id}
            />
            <div className="border-t border-linha pt-4">
              <ListaTarefas
                tarefas={(tarefas ?? []).map((t) => ({
                  id: t.id,
                  titulo: t.title,
                  status: t.status,
                  prazo: t.due_date,
                  responsavel: nomeCurto(t.assignee),
                }))}
                vazio="Nenhuma tarefa neste negócio."
              />
            </div>
          </Secao>

          {(listas?.length ?? 0) > 0 && (
            <Secao titulo="Documentos">
              <ul className="flex flex-col gap-2">
                {listas?.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/organizacoes/${n.organization!.id}/documentos/${l.id}`}
                      className="text-sm font-semibold text-sincra-tinta"
                    >
                      {l.name ?? "Lista de documentos"}
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </div>

        <Secao titulo="Histórico">
          {eventos && eventos.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {eventos.map((e) => (
                <li key={e.id} className="flex flex-col gap-0.5 border-l-2 border-linha pl-3">
                  <span className="text-sm leading-[22px] text-tinta">{e.summary}</span>
                  <span className="tabular text-xs leading-4 text-cinza">{formatarDataHora(e.created_at)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm leading-[22px] text-tinta-3">Nada registrado ainda.</p>
          )}
        </Secao>
      </div>
    </main>
  );
}

export default function NegocioPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <NegocioConteudo params={params} />
    </Suspense>
  );
}
