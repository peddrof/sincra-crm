import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import { getSocio } from "@/lib/auth";
import { nomeCurto } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { OrganizacaoForm } from "../OrganizacaoForm";

export const metadata: Metadata = { title: "Nova organização · Sincra" };

async function NovaOrganizacaoPageConteudo() {
  const socio = await getSocio();
  const supabase = await createClient();
  const { data: socios } = await supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Organizações</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Nova organização</h1>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <OrganizacaoForm
          inicial={{ owner_id: socio.id }}
          socios={(socios ?? []).map((s) => ({ id: s.id, nome: nomeCurto(s) }))}
          voltarPara="/organizacoes"
        />
      </div>
    </main>
  );
}

export default function NovaOrganizacaoPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <NovaOrganizacaoPageConteudo />
    </Suspense>
  );
}
