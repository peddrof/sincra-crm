import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { getSocio } from "@/lib/auth";
import { hojeIso } from "@/lib/datas";
import { apelidoDe } from "@/lib/feed";
import type { Contexto } from "@/lib/reunioes";
import { opcoesReuniao } from "@/lib/reunioes-dados";
import { createClient } from "@/lib/supabase/server";
import { AgendarForm } from "../Formularios";

export const metadata: Metadata = { title: "Agendar reunião · Sincra" };

type Busca = { org?: string; negocio?: string; contexto?: string };

async function AgendarConteudo({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;
  const socio = await getSocio();
  const supabase = await createClient();
  const [opcoes, { data: socios }, { data: pessoas }] = await Promise.all([
    opcoesReuniao(supabase),
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
    supabase.from("people").select("full_name, email, organization_id").not("email", "is", null).order("full_name"),
  ]);
  const org = opcoes.orgs.find((o) => o.id === busca.org);
  const contexto: Contexto = busca.contexto === "interna" || busca.contexto === "fundo" ? busca.contexto : org?.tipo === "fundo" ? "fundo" : "organizacao";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/reunioes" className="text-xs font-semibold text-sincra-tinta">
          Reuniões
        </Link>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Agendar reunião</h1>
        <p className="text-base leading-6 font-medium">
          <span className="text-cinza">A reunião fica registrada e avisa os sócios no feed.</span> Depois de salvar, você adiciona ao
          Google Agenda com um clique.
        </p>
      </div>
      <div className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <AgendarForm
          orgs={opcoes.orgs}
          negocios={opcoes.negocios}
          pessoas={(pessoas ?? []).map((p) => ({ email: p.email!, nome: p.full_name, orgId: p.organization_id }))}
          socios={(socios ?? []).map((s) => ({ id: s.id, nome: apelidoDe(s) }))}
          socioAtual={socio.id}
          inicial={{ contexto, org: org?.id, negocio: busca.negocio, data: hojeIso() }}
        />
      </div>
    </main>
  );
}

export default function AgendarPage({ searchParams }: { searchParams: Promise<Busca> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <AgendarConteudo searchParams={searchParams} />
    </Suspense>
  );
}
