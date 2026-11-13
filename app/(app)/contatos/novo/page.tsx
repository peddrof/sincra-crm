import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { createClient } from "@/lib/supabase/server";
import { PessoaForm } from "../../organizacoes/[id]/pessoas/PessoaForm";

export const metadata: Metadata = { title: "Nova pessoa · Sincra" };

// Pessoa com organização opcional (mentor, contador, advogado, investidor, contato avulso).
async function NovoContatoConteudo() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("organizations").select("id, trade_name").order("trade_name");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Contatos</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Nova pessoa</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <PessoaForm
          inicial={{}}
          documentos={[]}
          voltarPara="/contatos"
          organizacoes={(orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name }))}
        />
      </div>
    </main>
  );
}

export default function NovoContatoPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <NovoContatoConteudo />
    </Suspense>
  );
}
