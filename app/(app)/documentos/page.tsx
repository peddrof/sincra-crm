import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoSecundario } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { formatarData } from "@/lib/crm";
import { listarFaltantes, resumoLista } from "@/lib/documentos";
import { createClient } from "@/lib/supabase/server";
import { AbrirListaGeral } from "./AbrirListaGeral";

export const metadata: Metadata = { title: "Documentos · Sincra" };

async function DocumentosConteudo() {
  const supabase = await createClient();
  const [{ data: listas }, { data: modelos }, { data: orgs }] = await Promise.all([
    supabase
      .from("document_requests")
      .select("id, name, created_at, organization:organizations(id, trade_name), document_request_items(title, status, required)")
      .order("created_at", { ascending: false }),
    supabase.from("document_checklists").select("id, name, document_checklist_items(count)").eq("active", true).order("name"),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
  ]);

  const comResumo = (listas ?? []).map((l) => ({ ...l, resumo: resumoLista(l.document_request_items ?? []) }));
  const abertas = comResumo.filter((l) => l.resumo.faltam.length > 0 || l.document_request_items?.some((i) => i.status === "recebido"));
  const completas = comResumo.filter((l) => !abertas.includes(l));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Clientes</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Documentos</h1>
          <p className="text-base leading-6 font-medium">
            <span className="tabular text-cinza">
              {abertas.length} {abertas.length === 1 ? "lista em andamento." : "listas em andamento."}
            </span>{" "}
            Cada lista copia um modelo e recebe os arquivos de uma organização.
          </p>
        </div>
        <Link href="/documentos/modelos" className={classeBotaoSecundario}>
          Modelos de lista ({modelos?.length ?? 0})
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-cartao border border-azul-100 bg-azul-25 p-5">
        <h2 className="text-base leading-6 font-semibold text-sincra-tinta">Abrir lista de documentos</h2>
        {!modelos?.length ? (
          <p className="text-sm leading-[22px] text-tinta-3">
            Primeiro crie um modelo em{" "}
            <Link href="/documentos/modelos" className="font-semibold text-sincra-tinta">
              Modelos de lista
            </Link>
            .
          </p>
        ) : !orgs?.length ? (
          <p className="text-sm leading-[22px] text-tinta-3">Cadastre a organização antes de abrir a lista.</p>
        ) : (
          <AbrirListaGeral
            organizacoes={orgs.map((o) => ({ id: o.id, nome: o.trade_name }))}
            modelos={modelos.map((m) => ({ id: m.id, nome: m.name, itens: m.document_checklist_items?.[0]?.count ?? 0 }))}
          />
        )}
        <p className="text-xs leading-4 text-cinza">Depois de aberta, cada item da lista tem o botão para anexar o arquivo.</p>
      </section>

      {comResumo.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-cartao border border-linha bg-white p-8">
          <p className="text-base leading-6 font-semibold">Nenhuma lista de documentos aberta ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...abertas, ...completas].map((l) => {
            // Completa = nenhum obrigatório faltando e nada esperando revisão.
            const completa = completas.includes(l);
            return (
              <li key={l.id} className="flex flex-wrap items-start justify-between gap-3 rounded-cartao border border-linha bg-white p-5 shadow-cartao">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/organizacoes/${l.organization?.id}/documentos/${l.id}`}
                    className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta"
                  >
                    {l.organization?.trade_name} · {l.name ?? "Lista de documentos"}
                  </Link>
                  <p className="text-sm leading-[22px] text-tinta-3">
                    <span className="tabular font-semibold text-tinta">
                      {l.resumo.recebidos} de {l.resumo.total}
                    </span>{" "}
                    documentos recebidos.
                    {l.resumo.faltam.length > 0 && <> Faltam {listarFaltantes(l.resumo.faltam)}.</>}
                  </p>
                  <span className="tabular text-xs text-cinza">Aberta em {formatarData(l.created_at)}</span>
                </div>
                {completa ? (
                  <StatusPill tipo="concluido">Completa</StatusPill>
                ) : l.resumo.faltam.length > 0 ? (
                  <StatusPill tipo="atencao">Pendente</StatusPill>
                ) : (
                  <StatusPill tipo="andamento">Em análise</StatusPill>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function DocumentosPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <DocumentosConteudo />
    </Suspense>
  );
}
