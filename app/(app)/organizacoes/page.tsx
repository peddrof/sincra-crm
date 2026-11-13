import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import type { Metadata } from "next";
import Link from "next/link";
import { classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { nomeCurto, rotuloTipo, TIPOS_ORGANIZACAO, type TipoOrganizacao } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { formatarCnpj } from "@/lib/validacao";
import { PainelOrganizacao } from "./PainelOrganizacao";

export const metadata: Metadata = { title: "Organizações · Sincra" };

type Filtros = { tipo?: string; responsavel?: string; etapa?: string; ver?: string };

async function OrganizacoesPageConteudo({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  // Filtros atuais sem o painel aberto, para montar os links de abrir/fechar o painel.
  const semVer = Object.fromEntries(
    Object.entries({ tipo: filtros.tipo, responsavel: filtros.responsavel, etapa: filtros.etapa }).filter(([, v]) => v),
  ) as Record<string, string>;
  const supabase = await createClient();

  const [{ data: socios }, { data: etapas }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
    supabase.from("pipeline_stages").select("id, name, position, pipelines(name)").order("position"),
  ]);

  // Com filtro de etapa, só entram organizações com negócio aberto naquela etapa (inner join).
  const colunas =
    "id, trade_name, legal_name, type, city, state, cnpj, updated_at, owner:profiles!organizations_owner_id_fkey(full_name, nickname), people!people_organization_id_fkey(count)";
  let consulta = filtros.etapa
    ? supabase
        .from("organizations")
        .select(`${colunas}, deals!inner(stage_id, status)`)
        .eq("deals.stage_id", filtros.etapa)
        .eq("deals.status", "aberto")
    : supabase.from("organizations").select(colunas);

  if (filtros.tipo && TIPOS_ORGANIZACAO.some((t) => t.valor === filtros.tipo)) {
    consulta = consulta.eq("type", filtros.tipo as TipoOrganizacao);
  }
  if (filtros.responsavel) consulta = consulta.eq("owner_id", filtros.responsavel);

  const { data: organizacoes, error } = await consulta.order("trade_name");
  if (error) console.error("[organizacoes] falha na lista:", error.message);

  const filtrando = Boolean(filtros.tipo || filtros.responsavel || filtros.etapa);
  const total = organizacoes?.length ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">CRM</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Organizações</h1>
          <p className="text-base leading-6 font-medium">
            <span className="tabular text-cinza">
              {total} {total === 1 ? "organização" : "organizações"}
              {filtrando ? " com estes filtros." : " cadastradas."}
            </span>{" "}
            Hospitais, clínicas, operadoras e fundos.
          </p>
        </div>
        <Link href="/organizacoes/nova" className={classeBotaoPrimario}>
          Nova organização
        </Link>
      </div>

      <form method="get" className="grid gap-3 rounded-cartao bg-superficie p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Tipo
          <select name="tipo" defaultValue={filtros.tipo ?? ""} className={classeCampo}>
            <option value="">Todos</option>
            {TIPOS_ORGANIZACAO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Responsável
          <select name="responsavel" defaultValue={filtros.responsavel ?? ""} className={classeCampo}>
            <option value="">Todos</option>
            {socios?.map((s) => (
              <option key={s.id} value={s.id}>
                {nomeCurto(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Etapa do negócio ativo
          <select name="etapa" defaultValue={filtros.etapa ?? ""} className={classeCampo}>
            <option value="">Todas</option>
            {etapas?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.pipelines?.name} · {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className={classeBotaoSecundario}>
            Filtrar
          </button>
          {filtrando && (
            <Link href="/organizacoes" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-sincra-tinta">
              Limpar
            </Link>
          )}
        </div>
      </form>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-cartao border border-linha bg-white p-8">
          <p className="text-base leading-6 font-semibold">
            {filtrando ? "Nenhuma organização com estes filtros." : "Nenhuma organização cadastrada ainda."}
          </p>
          <p className="text-sm leading-[22px] text-tinta-3">
            {filtrando ? "Mude os filtros ou limpe a busca." : "Comece pelo primeiro hospital ou clínica da carteira."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-cartao border border-linha bg-white shadow-cartao">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-azul-100 bg-azul-25 text-xs font-semibold text-sincra-tinta">
                <th className="px-4 py-3 font-semibold">Organização</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Cidade</th>
                <th className="px-4 py-3 font-semibold">Responsável</th>
                <th className="px-4 py-3 text-right font-semibold">Pessoas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {organizacoes?.map((o) => (
                // A linha inteira abre o painel lateral (link "esticado" sobre a linha).
                <tr key={o.id} className={`relative cursor-pointer hover:bg-azul-25 ${filtros.ver === o.id ? "bg-azul-50" : ""}`}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/organizacoes?${new URLSearchParams({ ...semVer, ver: o.id })}`}
                      scroll={false}
                      className="font-semibold text-tinta after:absolute after:inset-0 hover:text-sincra-tinta"
                    >
                      {o.trade_name}
                    </Link>
                    <div className="text-xs leading-4 text-cinza">
                      {o.cnpj ? formatarCnpj(o.cnpj) : o.legal_name ?? "Sem CNPJ"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tinta-3">{rotuloTipo(o.type)}</td>
                  <td className="px-4 py-3 text-tinta-3">
                    {o.city ? `${o.city}${o.state ? `/${o.state}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-tinta-3">{nomeCurto(o.owner)}</td>
                  <td className="px-4 py-3 text-right text-tinta-3">{o.people?.[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtros.ver && (
        <Suspense fallback={null}>
          <PainelOrganizacao id={filtros.ver} fecharHref={`/organizacoes${Object.keys(semVer).length ? `?${new URLSearchParams(semVer)}` : ""}`} />
        </Suspense>
      )}
    </main>
  );
}

export default function OrganizacoesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <OrganizacoesPageConteudo searchParams={searchParams} />
    </Suspense>
  );
}
