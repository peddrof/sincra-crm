import Link from "next/link";
import { classeBotaoPrimario, classeBotaoSecundario } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { formatarDataHora, nomeCurto, rotuloTipo } from "@/lib/crm";
import { listarFaltantes, resumoLista } from "@/lib/documentos";
import { pessoasDaOrganizacao } from "@/lib/pessoas-org";
import { createClient } from "@/lib/supabase/server";
import { formatarCnpj } from "@/lib/validacao";
import { FecharComEsc } from "./FecharComEsc";

// Painel lateral com tudo da organização, aberto ao clicar na linha da lista (?ver=<id>).
export async function PainelOrganizacao({ id, fecharHref }: { id: string; fecharHref: string }) {
  const supabase = await createClient();
  const [{ data: o }, { data: pessoas }, { data: negocios }, { data: listas }, { data: reunioes }, { data: eventos }] =
    await Promise.all([
      supabase.from("organizations").select("*, owner:profiles!organizations_owner_id_fkey(full_name, nickname)").eq("id", id).maybeSingle(),
      pessoasDaOrganizacao(supabase, id),
      supabase.from("deals").select("id, title, status, stage:pipeline_stages(name)").eq("organization_id", id).order("updated_at", { ascending: false }),
      supabase.from("document_requests").select("id, name, document_request_items(title, status, required)").eq("organization_id", id),
      supabase.from("interactions").select("id, title, status, occurred_at").eq("organization_id", id).eq("type", "reuniao").order("occurred_at", { ascending: false }).limit(5),
      supabase.from("activity_events").select("id, summary, created_at").eq("organization_id", id).order("created_at", { ascending: false }).limit(6),
    ]);
  if (!o) return null;

  const bloco = "flex flex-col gap-2 border-t border-linha pt-4";
  const titulo = "text-xs font-semibold tracking-wide text-sincra-tinta uppercase";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <FecharComEsc href={fecharHref} />
      <Link href={fecharHref} scroll={false} aria-label="Fechar painel" className="absolute inset-0 bg-tinta/30" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={o.trade_name}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-destaque"
      >
        <header className="sticky top-0 z-10 flex flex-col gap-3 bg-gradient-to-b from-azul-50 to-white px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="w-fit rounded-full bg-sincra px-2.5 py-0.5 text-xs font-semibold text-white">{rotuloTipo(o.type)}</span>
              <h2 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-tinta">{o.trade_name}</h2>
              <p className="text-sm text-cinza">
                {[o.city && `${o.city}${o.state ? `/${o.state}` : ""}`, o.cnpj && formatarCnpj(o.cnpj)].filter(Boolean).join(" · ") || "Sem cidade e CNPJ"}
              </p>
            </div>
            <Link href={fecharHref} scroll={false} className="rounded-full px-3 py-1 text-sm font-semibold text-tinta-3 hover:bg-white">
              Fechar
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/organizacoes/${o.id}`} className={classeBotaoPrimario}>
              Abrir página completa
            </Link>
            <Link href={`/organizacoes/${o.id}/editar`} className={classeBotaoSecundario}>
              Editar
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-4 px-6 pb-8">
          <section className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div className="rounded-campo bg-azul-25 p-3">
              <div className="text-xs text-cinza">Responsável</div>
              <div className="font-semibold text-sincra-tinta">{nomeCurto(o.owner)}</div>
            </div>
            <div className="rounded-campo bg-azul-25 p-3">
              <div className="text-xs text-cinza">Negócios abertos</div>
              <div className="tabular font-semibold text-sincra-tinta">{negocios?.filter((n) => n.status === "aberto").length ?? 0}</div>
            </div>
            {o.legal_name && (
              <div className="col-span-2 text-sm text-tinta-3">
                <span className="text-cinza">Razão social: </span>
                {o.legal_name}
              </div>
            )}
            {o.notes && <p className="col-span-2 text-sm whitespace-pre-line text-tinta-3">{o.notes}</p>}
          </section>

          <section className={bloco}>
            <div className="flex items-center justify-between">
              <h3 className={titulo}>Negócios</h3>
              <Link href={`/negocios/novo?org=${o.id}`} className="text-xs font-semibold text-sincra-tinta">
                Novo negócio
              </Link>
            </div>
            {negocios?.length ? (
              negocios.map((n) => (
                <Link key={n.id} href={`/negocios/${n.id}`} className="flex items-center justify-between gap-2 rounded-campo px-2 py-1.5 hover:bg-azul-25">
                  <span className="text-sm font-semibold text-tinta">{n.title}</span>
                  <StatusPill tipo={n.status === "ganho" ? "concluido" : n.status === "perdido" ? "neutro" : "andamento"}>
                    {n.stage?.name ?? n.status}
                  </StatusPill>
                </Link>
              ))
            ) : (
              <p className="text-sm text-cinza">Nenhum negócio.</p>
            )}
          </section>

          <section className={bloco}>
            <h3 className={titulo}>Pessoas</h3>
            {pessoas?.length ? (
              pessoas.map((p) => (
                <div key={p.id} className="flex flex-col px-2">
                  <span className="text-sm font-semibold text-tinta">
                    {p.full_name}
                    {p.can_sign && <span className="ml-2 text-xs font-semibold text-ok">pode assinar</span>}
                    {p.adicional && <span className="ml-2 text-xs font-semibold text-sincra-tinta">vínculo adicional</span>}
                  </span>
                  <span className="text-xs text-cinza">{[p.role_title, p.email, p.phone].filter(Boolean).join(" · ") || "Sem contato"}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-cinza">Nenhuma pessoa cadastrada.</p>
            )}
          </section>

          <section className={bloco}>
            <h3 className={titulo}>Documentos</h3>
            {listas?.length ? (
              listas.map((l) => {
                const r = resumoLista(l.document_request_items ?? []);
                return (
                  <Link key={l.id} href={`/organizacoes/${o.id}/documentos/${l.id}`} className="rounded-campo px-2 py-1.5 hover:bg-azul-25">
                    <span className="text-sm font-semibold text-tinta">{l.name ?? "Lista de documentos"}</span>
                    <span className="block text-xs text-cinza">
                      {r.recebidos} de {r.total} recebidos{r.faltam.length > 0 && `; faltam ${listarFaltantes(r.faltam, 2)}`}
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-cinza">Nenhuma lista aberta.</p>
            )}
          </section>

          <section className={bloco}>
            <div className="flex items-center justify-between">
              <h3 className={titulo}>Reuniões</h3>
              <Link href={`/reunioes/agendar?org=${o.id}`} className="text-xs font-semibold text-sincra-tinta">
                Agendar reunião
              </Link>
            </div>
            {reunioes?.length ? (
              reunioes.map((r) => (
                <Link key={r.id} href={`/reunioes/${r.id}`} className="flex justify-between gap-2 rounded-campo px-2 py-1.5 hover:bg-azul-25">
                  <span className="text-sm text-tinta">{r.title ?? "Reunião"}</span>
                  <span className="tabular text-xs text-cinza">{formatarDataHora(r.occurred_at)}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-cinza">Nenhuma reunião registrada.</p>
            )}
          </section>

          <section className={bloco}>
            <h3 className={titulo}>Últimas atividades</h3>
            {eventos?.length ? (
              eventos.map((e) => (
                <div key={e.id} className="border-l-2 border-azul-200 pl-3">
                  <p className="text-sm text-tinta">{e.summary}</p>
                  <p className="tabular text-xs text-cinza">{formatarDataHora(e.created_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-cinza">Nada registrado.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
