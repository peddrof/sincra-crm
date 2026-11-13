import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { formatarReais } from "@/lib/negocios";
import { carregarOpcoesNegocio } from "@/lib/negocios-dados";
import { createClient } from "@/lib/supabase/server";
import { NegocioForm } from "../../NegocioForm";

export const metadata: Metadata = { title: "Editar negócio · Sincra" };

async function EditarNegocioConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: n }, opcoes] = await Promise.all([
    supabase.from("deals").select("*").eq("id", id).maybeSingle(),
    carregarOpcoesNegocio(supabase),
  ]);
  if (!n) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Negócios</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Editar {n.title}</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <NegocioForm
          inicial={{
            id: n.id,
            organization_id: n.organization_id,
            pipeline_id: n.pipeline_id,
            stage_id: n.stage_id,
            title: n.title,
            owner_id: n.owner_id ?? "",
            rate_percent: n.rate_percent !== null ? n.rate_percent.toLocaleString("pt-BR") : "",
            amount: formatarReais(n.amount_estimate_cents),
            expected_close_date: n.expected_close_date ?? "",
            notes: n.notes ?? "",
          }}
          organizacoes={opcoes.organizacoes}
          funis={opcoes.funis}
          etapas={opcoes.etapas}
          socios={opcoes.socios}
          taxasPadrao={opcoes.taxasPadrao}
          voltarPara={`/negocios/${n.id}`}
        />
      </div>
    </main>
  );
}

export default function EditarNegocioPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <EditarNegocioConteudo params={params} />
    </Suspense>
  );
}
