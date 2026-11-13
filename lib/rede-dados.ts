import "server-only";
import municipios from "@/lib/geo/municipios.json";
import { nomeCurto, rotuloTipo } from "@/lib/crm";
import { visaoDaPessoa } from "@/lib/relacionamento";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Dados da rede da Sincra para o mapa de conexões e o mapa do Brasil da página inicial (pedido de 11/11/2026).
// A rede é da Sincra como um todo: nada aqui fica ligado a um sócio só.

export type Situacao = "em_aberto" | "operando" | "antigo" | "sem_negocio";

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  em_aberto: "Contato em aberto",
  operando: "Operando",
  antigo: "Contato antigo",
  sem_negocio: "Sem negócio",
};

const DIAS_ANTIGO = 90;

// "UF|cidade sem acento" → [lat, lng] dos 5.571 municípios (lib/geo, dados abertos, licença MIT).
const COORDENADAS = municipios as unknown as Record<string, [number, number]>;

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export async function carregarRede(supabase: Cliente) {
  const [{ data: orgs }, { data: pessoas }, { data: negocios }, { data: eventos }, { data: ligacoesNegocio }, { data: vinculos }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, trade_name, type, city, state, notes, owner_id, created_at, owner:profiles!organizations_owner_id_fkey(full_name, nickname)"),
    supabase
      .from("people")
      .select(
        "id, full_name, role_title, organization_id, relacao_tipo, profundidade, situacao, prioridade, ultima_interacao, confirmacao_pendente, proximo_passo, cidade, uf, natureza_local",
      ),
    supabase.from("deals").select("id, title, status, organization_id, amount_estimate_cents, stage:pipeline_stages(name)"),
    supabase.from("activity_events").select("organization_id, created_at").not("organization_id", "is", null).eq("actor_type", "user"),
    supabase.from("deal_people").select("deal_id, person_id, papel"),
    supabase.from("pessoa_organizacoes").select("person_id, organization_id, papel"),
  ]);
  // Organizações de cada pessoa: a principal + vínculos adicionais.
  const orgsDaPessoa = new Map<string, string[]>();
  for (const p of pessoas ?? []) if (p.organization_id) orgsDaPessoa.set(p.id, [p.organization_id]);
  for (const v of vinculos ?? []) orgsDaPessoa.set(v.person_id, [...(orgsDaPessoa.get(v.person_id) ?? []), v.organization_id]);

  const ultimaAtividade = new Map<string, string>();
  for (const e of eventos ?? []) {
    const atual = ultimaAtividade.get(e.organization_id!);
    if (!atual || e.created_at > atual) ultimaAtividade.set(e.organization_id!, e.created_at);
  }
  const limiteAntigo = Date.now() - DIAS_ANTIGO * 86_400_000;

  const organizacoes = (orgs ?? []).map((o) => {
    const dela = (negocios ?? []).filter((n) => n.organization_id === o.id);
    const aberto = dela.find((n) => n.status === "aberto");
    const ultima = ultimaAtividade.get(o.id) ?? o.created_at;
    const situacao: Situacao = aberto
      ? "em_aberto"
      : dela.some((n) => n.status === "ganho")
        ? "operando"
        : dela.length > 0 || new Date(ultima).getTime() < limiteAntigo
          ? "antigo"
          : "sem_negocio";
    const coord = o.city && o.state ? COORDENADAS[`${o.state}|${normalizar(o.city)}`] : undefined;
    return {
      id: o.id,
      nome: o.trade_name,
      tipo: o.type as string,
      tipoRotulo: rotuloTipo(o.type),
      cidade: o.city,
      uf: o.state,
      lat: coord?.[0] ?? null,
      lng: coord?.[1] ?? null,
      responsavel: nomeCurto(o.owner),
      ownerId: o.owner_id,
      situacao,
      negocioAberto: aberto ? `${aberto.title} · ${aberto.stage?.name ?? ""}` : null,
      pessoas: (pessoas ?? []).filter((p) => orgsDaPessoa.get(p.id)?.includes(o.id)).length,
      notas: o.notes,
      ultimaAtividade: ultima,
    };
  });

  // Pessoas: posição só quando a cidade foi verificada (nunca pelo DDD nem pelo endereço da organização).
  const nomeOrg = new Map(organizacoes.map((o) => [o.id, o.nome]));
  const listaPessoas = (pessoas ?? []).map((p) => {
    const coord = p.cidade && p.uf ? COORDENADAS[`${p.uf}|${normalizar(p.cidade)}`] : undefined;
    return {
      ...p,
      organizacao: (orgsDaPessoa.get(p.id) ?? []).map((id) => nomeOrg.get(id)).filter(Boolean).join(", ") || null,
      organizacoesIds: orgsDaPessoa.get(p.id) ?? [],
      visao: visaoDaPessoa(p),
      lat: coord?.[0] ?? null,
      lng: coord?.[1] ?? null,
    };
  });

  return { organizacoes, pessoas: listaPessoas, negocios: negocios ?? [], ligacoesNegocio: ligacoesNegocio ?? [] };
}

export type OrganizacaoRede = Awaited<ReturnType<typeof carregarRede>>["organizacoes"][number];
