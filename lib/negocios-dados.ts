import "server-only";
import { nomeCurto } from "@/lib/crm";
import { chaveTaxaPadrao, valorDaConfiguracao } from "@/lib/negocios";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Opções do formulário de negócio: organizações, funis, etapas, sócios e taxa padrão de cada funil.
export async function carregarOpcoesNegocio(supabase: Cliente) {
  const [{ data: orgs }, { data: funis }, { data: etapas }, { data: socios }, { data: config }] = await Promise.all([
    supabase.from("organizations").select("id, trade_name, type").order("trade_name"),
    supabase.from("pipelines").select("id, key, name").order("position"),
    supabase.from("pipeline_stages").select("id, name, pipeline_id, position").order("position"),
    supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
    supabase.from("settings").select("key, value").in("key", ["default_rate_hospital", "default_rate_medico"]),
  ]);

  const taxasPadrao: Record<string, string> = {};
  for (const f of funis ?? []) {
    const v = valorDaConfiguracao(config?.find((c) => c.key === chaveTaxaPadrao(f.key))?.value);
    if (v !== null) taxasPadrao[f.id] = v.toLocaleString("pt-BR");
  }

  return {
    organizacoes: (orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name, tipo: o.type })),
    funis: (funis ?? []).map((f) => ({ id: f.id, nome: f.name, chave: f.key })),
    etapas: (etapas ?? []).map((e) => ({ id: e.id, nome: e.name, funilId: e.pipeline_id })),
    socios: (socios ?? []).map((s) => ({ id: s.id, nome: nomeCurto(s) })),
    taxasPadrao,
  };
}
