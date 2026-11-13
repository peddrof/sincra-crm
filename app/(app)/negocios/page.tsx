import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { nomeCurto } from "@/lib/crm";
import { formatarReaisCompacto, formatarTaxa, valorDaConfiguracao, chaveTaxaPadrao } from "@/lib/negocios";
import { createClient } from "@/lib/supabase/server";
import { Kanban, type CartaoNegocio } from "./Kanban";

export const metadata: Metadata = { title: "Negócios · Sincra" };

type Filtros = { funil?: string; responsavel?: string };

async function NegociosConteudo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const supabase = await createClient();

  const { data: funis } = await supabase.from("pipelines").select("id, key, name").order("position");
  const funil = funis?.find((f) => f.key === filtros.funil) ?? funis?.[0];
  if (!funil) return <p className="p-10 text-sm text-cinza">Nenhum funil configurado.</p>;

  let consulta = supabase
    .from("deals")
    .select(
      "id, title, stage_id, amount_estimate_cents, rate_percent, organization_id, owner:profiles!deals_owner_id_fkey(full_name, nickname), organization:organizations(trade_name), document_requests(id)",
    )
    .eq("pipeline_id", funil.id)
    .order("updated_at", { ascending: false });
  if (filtros.responsavel) consulta = consulta.eq("owner_id", filtros.responsavel);

  const [{ data: etapas }, { data: negocios, error }, { data: socios }, { data: taxa }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, key, name, is_closed").eq("pipeline_id", funil.id).order("position"),
    consulta,
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
    supabase.from("settings").select("value").eq("key", chaveTaxaPadrao(funil.key)).maybeSingle(),
  ]);
  if (error) console.error("[negocios] falha na lista:", error.message);

  const taxaPadrao = valorDaConfiguracao(taxa?.value);
  const etapaDocumentos = etapas?.find((e) => e.key === "documentos")?.id;

  const cartoes: CartaoNegocio[] = (negocios ?? []).map((n) => ({
    id: n.id,
    titulo: n.title,
    organizacao: n.organization?.trade_name ?? "",
    organizacaoId: n.organization_id,
    responsavel: nomeCurto(n.owner),
    etapaId: n.stage_id,
    valor: formatarReaisCompacto(n.amount_estimate_cents),
    taxa: formatarTaxa(n.rate_percent ?? taxaPadrao),
    pedirDocumentos: n.stage_id === etapaDocumentos && (n.document_requests?.length ?? 0) === 0,
  }));

  const abertos = cartoes.filter((c) => !etapas?.find((e) => e.id === c.etapaId)?.is_closed).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Funil</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Negócios</h1>
          <p className="text-base leading-6 font-medium">
            <span className="tabular text-cinza">
              {abertos} {abertos === 1 ? "negócio aberto" : "negócios abertos"} em {funil.name}.
            </span>{" "}
            Arraste para mudar a etapa.
          </p>
        </div>
        <Link href={`/negocios/novo?funil=${funil.key}`} className={classeBotaoPrimario}>
          Novo negócio
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Funis" className="flex flex-wrap gap-1 rounded-cartao bg-superficie p-1">
          {funis?.map((f) => (
            <Link
              key={f.id}
              href={`/negocios?funil=${f.key}${filtros.responsavel ? `&responsavel=${filtros.responsavel}` : ""}`}
              aria-current={f.id === funil.id ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                f.id === funil.id ? "bg-white text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta"
              }`}
            >
              {f.name}
            </Link>
          ))}
          {/* Relacionamentos sem negócio (mentores, parceiros, contatos avulsos) ficam em Contatos, sem virar oportunidade. */}
          <Link href="/contatos?ver=principal" className="rounded-full px-4 py-2 text-sm font-semibold text-sincra-tinta hover:bg-azul-50">
            Contatos para retomar
          </Link>
        </nav>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="funil" value={funil.key} />
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Responsável
            <select name="responsavel" defaultValue={filtros.responsavel ?? ""} className={`${classeCampo} w-44`}>
              <option value="">Todos</option>
              {socios?.map((s) => (
                <option key={s.id} value={s.id}>
                  {nomeCurto(s)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={classeBotaoSecundario}>
            Filtrar
          </button>
        </form>
      </div>

      <Kanban
        etapas={(etapas ?? []).map((e) => ({ id: e.id, nome: e.name, fechada: e.is_closed, chave: e.key }))}
        negocios={cartoes}
      />
    </main>
  );
}

export default function NegociosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <NegociosConteudo searchParams={searchParams} />
    </Suspense>
  );
}
