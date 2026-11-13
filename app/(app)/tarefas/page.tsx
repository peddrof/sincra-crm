import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { ListaTarefas, type TarefaLinha } from "@/components/tarefas/ListaTarefas";
import { NovaTarefaForm } from "@/components/tarefas/NovaTarefaForm";
import { getSocio } from "@/lib/auth";
import { nomeCurto } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tarefas · Sincra" };

const VISOES = [
  { valor: "minhas", rotulo: "Minhas" },
  { valor: "abertas", rotulo: "Todas abertas" },
  { valor: "concluidas", rotulo: "Concluídas" },
] as const;

async function TarefasConteudo({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const visao = VISOES.find((v) => v.valor === ver)?.valor ?? "minhas";
  const socio = await getSocio();
  const supabase = await createClient();

  let consulta = supabase
    .from("tasks")
    .select(
      "id, title, status, due_date, assignee:profiles!tasks_assignee_id_fkey(full_name, nickname), organization:organizations(id, trade_name), deal:deals(id, title)",
    );
  if (visao === "minhas") consulta = consulta.eq("assignee_id", socio.id).eq("status", "aberta");
  if (visao === "abertas") consulta = consulta.eq("status", "aberta");
  if (visao === "concluidas") consulta = consulta.eq("status", "concluida");
  consulta =
    visao === "concluidas"
      ? consulta.order("completed_at", { ascending: false }).limit(100)
      : consulta.order("due_date", { ascending: true, nullsFirst: false }).order("created_at");

  const [{ data: tarefas, error }, { data: socios }, { data: orgs }] = await Promise.all([
    consulta,
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
  ]);
  if (error) console.error("[tarefas] falha na lista:", error.message);

  const linhas: TarefaLinha[] = (tarefas ?? []).map((t) => ({
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
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Rotina</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Tarefas</h1>
      </div>

      <section aria-label="Nova tarefa" className="rounded-cartao border border-linha bg-white p-5 shadow-cartao">
        <NovaTarefaForm
          socios={(socios ?? []).map((s) => ({ id: s.id, nome: nomeCurto(s) }))}
          responsavelPadrao={socio.id}
          organizacoes={(orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name }))}
        />
      </section>

      <nav aria-label="Visões" className="flex w-fit gap-1 rounded-full bg-superficie p-1">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={`/tarefas?ver=${v.valor}`}
            aria-current={v.valor === visao ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              v.valor === visao ? "bg-white text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta"
            }`}
          >
            {v.rotulo}
          </Link>
        ))}
      </nav>

      <section className="rounded-cartao border border-linha bg-white p-5 shadow-cartao">
        <ListaTarefas
          tarefas={linhas}
          vazio={
            visao === "minhas"
              ? "Nenhuma tarefa aberta com você."
              : visao === "abertas"
                ? "Nenhuma tarefa aberta."
                : "Nenhuma tarefa concluída ainda."
          }
        />
      </section>
    </main>
  );
}

export default function TarefasPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <TarefasConteudo searchParams={searchParams} />
    </Suspense>
  );
}
