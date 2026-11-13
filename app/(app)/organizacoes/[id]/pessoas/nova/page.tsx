import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PessoaForm } from "../PessoaForm";

export const metadata: Metadata = { title: "Nova pessoa · Sincra" };

async function NovaPessoaPageConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: org }, { data: documentos }] = await Promise.all([
    supabase.from("organizations").select("id, trade_name").eq("id", id).maybeSingle(),
    supabase.from("documents").select("id, title").eq("organization_id", id).order("title"),
  ]);
  if (!org) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">{org.trade_name}</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Nova pessoa</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <PessoaForm
          inicial={{ organization_id: org.id }}
          documentos={(documentos ?? []).map((d) => ({ id: d.id, titulo: d.title }))}
          voltarPara={`/organizacoes/${org.id}`}
        />
      </div>
    </main>
  );
}

export default function NovaPessoaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <NovaPessoaPageConteudo params={params} />
    </Suspense>
  );
}
