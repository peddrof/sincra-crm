import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classeBotaoPrimario, classeBotaoSecundario, Secao } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { formatarData, formatarDataHora, nomeCurto, rotuloTipo } from "@/lib/crm";
import { listarFaltantes, resumoLista } from "@/lib/documentos";
import { pessoasDaOrganizacao } from "@/lib/pessoas-org";
import { createClient } from "@/lib/supabase/server";
import { formatarCnpj } from "@/lib/validacao";

export const metadata: Metadata = { title: "Organização · Sincra" };

async function OrganizacaoPageConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: pessoas }, { data: eventos }, { data: negocios }, { data: listas }] = await Promise.all([
    supabase
      .from("organizations")
      .select("*, owner:profiles!organizations_owner_id_fkey(full_name, nickname)")
      .eq("id", id)
      .maybeSingle(),
    pessoasDaOrganizacao(supabase, id),
    supabase
      .from("activity_events")
      .select("id, summary, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("deals")
      .select("id, title, status, stage:pipeline_stages(name), pipeline:pipelines(name)")
      .eq("organization_id", id)
      .order("status")
      .order("updated_at", { ascending: false }),
    supabase
      .from("document_requests")
      .select("id, name, document_request_items(title, status, required)")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!org) notFound();

  const dados: { rotulo: string; valor: React.ReactNode }[] = [
    { rotulo: "Razão social", valor: org.legal_name },
    { rotulo: "CNPJ", valor: org.cnpj ? <span className="tabular">{formatarCnpj(org.cnpj)}</span> : null },
    { rotulo: "Cidade", valor: org.city ? `${org.city}${org.state ? `/${org.state}` : ""}` : null },
    {
      rotulo: "Site",
      valor: org.website ? (
        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sincra-tinta underline">
          {org.website.replace(/^https?:\/\//, "")}
        </a>
      ) : null,
    },
    { rotulo: "Responsável", valor: nomeCurto(org.owner) },
    { rotulo: "Cadastrada em", valor: <span className="tabular">{formatarData(org.created_at)}</span> },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link href="/organizacoes" className="text-xs font-semibold text-sincra-tinta">
          Organizações
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{org.trade_name}</h1>
            <p className="text-base leading-6 font-medium text-cinza">{rotuloTipo(org.type)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/reunioes/agendar?org=${org.id}`} className={classeBotaoPrimario}>
              Agendar reunião
            </Link>
            <Link href={`/organizacoes/${org.id}/editar`} className={classeBotaoSecundario}>
              Editar dados
            </Link>
          </div>
        </div>
      </div>

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
            {org.notes && (
              <p className="border-t border-linha pt-4 text-sm leading-[22px] whitespace-pre-line text-tinta-3">{org.notes}</p>
            )}
          </Secao>

          <Secao
            titulo="Pessoas"
            acao={
              <Link href={`/organizacoes/${org.id}/pessoas/nova`} className="text-sm font-semibold text-sincra-tinta">
                Adicionar pessoa
              </Link>
            }
          >
            {pessoas && pessoas.length > 0 ? (
              <ul className="flex flex-col divide-y divide-linha">
                {pessoas.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={p.adicional ? `/contatos/${p.id}` : `/organizacoes/${org.id}/pessoas/${p.id}/editar`}
                        className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta"
                      >
                        {p.full_name}
                      </Link>
                      <span className="text-sm leading-[22px] text-cinza">
                        {[p.role_title, p.crm_number && `CRM ${p.crm_number}`].filter(Boolean).join(" · ") || "Sem cargo"}
                      </span>
                      {p.adicional && (
                        <span className="text-xs leading-4 font-semibold text-sincra-tinta">
                          Vínculo adicional{p.papelVinculo ? ` · ${p.papelVinculo}` : ""}
                        </span>
                      )}
                      <span className="tabular text-sm leading-[22px] break-all text-tinta-3">
                        {[p.email, p.phone].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    {p.can_sign &&
                      (p.signing_evidence_document_id ? (
                        <StatusPill tipo="concluido">Pode assinar</StatusPill>
                      ) : (
                        <StatusPill tipo="atencao">Assina sem comprovação</StatusPill>
                      ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-[22px] text-tinta-3">Nenhuma pessoa cadastrada nesta organização.</p>
            )}
          </Secao>

          <Secao
            titulo="Negócios"
            acao={
              <Link href={`/negocios/novo?org=${org.id}`} className="text-sm font-semibold text-sincra-tinta">
                Novo negócio
              </Link>
            }
          >
            {negocios && negocios.length > 0 ? (
              <ul className="flex flex-col divide-y divide-linha">
                {negocios.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/negocios/${n.id}`} className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta">
                        {n.title}
                      </Link>
                      <span className="text-xs leading-4 text-cinza">
                        {n.pipeline?.name} · {n.stage?.name}
                      </span>
                    </div>
                    {n.status === "ganho" ? (
                      <StatusPill tipo="concluido">Operando</StatusPill>
                    ) : n.status === "perdido" ? (
                      <StatusPill tipo="neutro">Perdido</StatusPill>
                    ) : (
                      <StatusPill tipo="andamento">Aberto</StatusPill>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-[22px] text-tinta-3">Nenhum negócio com esta organização.</p>
            )}
          </Secao>

          <Secao
            titulo="Documentos"
            acao={
              <Link href={`/organizacoes/${org.id}/documentos/nova`} className="text-sm font-semibold text-sincra-tinta">
                Abrir lista
              </Link>
            }
          >
            {listas && listas.length > 0 ? (
              <ul className="flex flex-col divide-y divide-linha">
                {listas.map((l) => {
                  const r = resumoLista(l.document_request_items ?? []);
                  return (
                    <li key={l.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/organizacoes/${org.id}/documentos/${l.id}`}
                        className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta"
                      >
                        {l.name ?? "Lista de documentos"}
                      </Link>
                      <span className="text-sm leading-[22px] text-tinta-3">
                        <span className="tabular">
                          {r.recebidos} de {r.total}
                        </span>{" "}
                        recebidos.{r.faltam.length > 0 && <> Faltam {listarFaltantes(r.faltam)}.</>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm leading-[22px] text-tinta-3">Nenhuma lista de documentos aberta.</p>
            )}
          </Secao>

          <div className="flex flex-col gap-1 rounded-cartao bg-superficie p-4">
            <h3 className="text-sm leading-[22px] font-semibold">Contratos</h3>
            <p className="text-xs leading-4 text-cinza">Entram quando o contrato base chegar.</p>
          </div>
        </div>

        <Secao titulo="Linha do tempo">
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

export default function OrganizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <OrganizacaoPageConteudo params={params} />
    </Suspense>
  );
}
