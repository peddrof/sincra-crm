import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { getSocio } from "@/lib/auth";
import { funilPorTipo } from "@/lib/negocios";
import { carregarOpcoesNegocio } from "@/lib/negocios-dados";
import { createClient } from "@/lib/supabase/server";
import { NegocioForm } from "../NegocioForm";

export const metadata: Metadata = { title: "Novo negócio · Sincra" };

type Busca = { org?: string; funil?: string };

async function NovoNegocioConteudo({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  const socio = await getSocio();
  const supabase = await createClient();
  const opcoes = await carregarOpcoesNegocio(supabase);

  const org = opcoes.organizacoes.find((o) => o.id === busca.org);
  const chaveFunil = busca.funil ?? (org ? funilPorTipo(org.tipo) : undefined);
  const funil = opcoes.funis.find((f) => f.chave === chaveFunil) ?? opcoes.funis[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Negócios</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Novo negócio</h1>
      </div>
      {opcoes.organizacoes.length === 0 ? (
        <p className="rounded-cartao border border-linha bg-white p-6 text-sm text-tinta-3">
          Cadastre a organização antes de abrir um negócio.
        </p>
      ) : (
        <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
          <NegocioForm
            inicial={{ organization_id: org?.id, pipeline_id: funil?.id, owner_id: socio.id }}
            organizacoes={opcoes.organizacoes}
            funis={opcoes.funis}
            etapas={opcoes.etapas}
            socios={opcoes.socios}
            taxasPadrao={opcoes.taxasPadrao}
            voltarPara={org ? `/organizacoes/${org.id}` : "/negocios"}
            retorno={org ? `/organizacoes/${org.id}` : undefined}
          />
        </div>
      )}
    </main>
  );
}

export default function NovoNegocioPage({ searchParams }: { searchParams: Promise<Busca> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <NovoNegocioConteudo searchParams={searchParams} />
    </Suspense>
  );
}
