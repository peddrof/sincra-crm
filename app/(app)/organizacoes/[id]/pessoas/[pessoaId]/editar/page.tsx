import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { valoresDaPessoa } from "@/lib/relacionamento";
import { PessoaForm } from "../../PessoaForm";

export const metadata: Metadata = { title: "Editar pessoa · Sincra" };

async function EditarPessoaPageConteudo({ params }: { params: Promise<{ id: string; pessoaId: string }> }) {
  const { id, pessoaId } = await params;
  const supabase = await createClient();
  const [{ data: pessoa }, { data: documentos }] = await Promise.all([
    supabase
      .from("people")
      .select("*, organization:organizations!people_organization_id_fkey(id, trade_name)")
      .eq("id", pessoaId)
      .eq("organization_id", id)
      .maybeSingle(),
    supabase.from("documents").select("id, title").eq("organization_id", id).order("title"),
  ]);
  if (!pessoa || !pessoa.organization) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">{pessoa.organization.trade_name}</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Editar {pessoa.full_name}</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <PessoaForm
          inicial={valoresDaPessoa(pessoa)}
          documentos={(documentos ?? []).map((d) => ({ id: d.id, titulo: d.title }))}
          voltarPara={`/organizacoes/${id}`}
        />
      </div>
    </main>
  );
}

export default function EditarPessoaPage({ params }: { params: Promise<{ id: string; pessoaId: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <EditarPessoaPageConteudo params={params} />
    </Suspense>
  );
}
