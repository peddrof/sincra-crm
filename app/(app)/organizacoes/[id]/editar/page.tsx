import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nomeCurto } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { formatarCnpj } from "@/lib/validacao";
import { OrganizacaoForm } from "../../OrganizacaoForm";

export const metadata: Metadata = { title: "Editar organização · Sincra" };

async function EditarOrganizacaoPageConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: org }, { data: socios }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
  ]);
  if (!org) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Organizações</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Editar {org.trade_name}</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <OrganizacaoForm
          inicial={{
            id: org.id,
            type: org.type,
            trade_name: org.trade_name,
            legal_name: org.legal_name ?? "",
            cnpj: formatarCnpj(org.cnpj),
            city: org.city ?? "",
            state: org.state ?? "",
            website: org.website ?? "",
            owner_id: org.owner_id ?? "",
            notes: org.notes ?? "",
          }}
          socios={(socios ?? []).map((s) => ({ id: s.id, nome: nomeCurto(s) }))}
          voltarPara={`/organizacoes/${org.id}`}
        />
      </div>
    </main>
  );
}

export default function EditarOrganizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <EditarOrganizacaoPageConteudo params={params} />
    </Suspense>
  );
}
