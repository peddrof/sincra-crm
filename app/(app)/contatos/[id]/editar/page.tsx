import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { valoresDaPessoa } from "@/lib/relacionamento";
import { createClient } from "@/lib/supabase/server";
import { PessoaForm } from "../../../organizacoes/[id]/pessoas/PessoaForm";

export const metadata: Metadata = { title: "Editar contato · Sincra" };

async function EditarContatoConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: pessoa }, { data: orgs }] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).maybeSingle(),
    supabase.from("organizations").select("id, trade_name").order("trade_name"),
  ]);
  if (!pessoa) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Contatos</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Editar {pessoa.full_name}</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <PessoaForm
          inicial={valoresDaPessoa(pessoa)}
          documentos={[]}
          voltarPara={`/contatos/${id}`}
          organizacoes={(orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name }))}
        />
      </div>
    </main>
  );
}

export default function EditarContatoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <EditarContatoConteudo params={params} />
    </Suspense>
  );
}
