import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { createClient } from "@/lib/supabase/server";
import { AbrirListaForm } from "./AbrirListaForm";

export const metadata: Metadata = { title: "Nova lista de documentos · Sincra" };

async function NovaListaConteudo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ negocio?: string }>;
}) {
  const [{ id }, { negocio }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: org }, { data: modelos }, { data: negocios }] = await Promise.all([
    supabase.from("organizations").select("id, trade_name, type").eq("id", id).maybeSingle(),
    supabase
      .from("document_checklists")
      .select("id, name, organization_type, document_checklist_items(count)")
      .eq("active", true)
      .order("name"),
    supabase.from("deals").select("id, title").eq("organization_id", id).eq("status", "aberto").order("title"),
  ]);
  if (!org) notFound();

  // Modelos do mesmo tipo da organização primeiro.
  const ordenados = [...(modelos ?? [])].sort(
    (a, b) => Number(b.organization_type === org.type) - Number(a.organization_type === org.type),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href={`/organizacoes/${org.id}`} className="text-xs font-semibold text-sincra-tinta">
          {org.trade_name}
        </Link>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Nova lista de documentos</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        {ordenados.length === 0 ? (
          <p className="text-sm leading-[22px] text-tinta-3">
            Nenhum modelo de lista ainda.{" "}
            <Link href="/documentos/modelos" className="font-semibold text-sincra-tinta">
              Criar o primeiro modelo
            </Link>
          </p>
        ) : (
          <AbrirListaForm
            organizacaoId={org.id}
            modelos={ordenados.map((m) => ({ id: m.id, nome: m.name, itens: m.document_checklist_items?.[0]?.count ?? 0 }))}
            negocios={(negocios ?? []).map((n) => ({ id: n.id, nome: n.title }))}
            negocioPadrao={negocio}
          />
        )}
      </div>
    </main>
  );
}

export default function NovaListaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ negocio?: string }>;
}) {
  return (
    <Suspense fallback={<Carregando />}>
      <NovaListaConteudo params={params} searchParams={searchParams} />
    </Suspense>
  );
}
